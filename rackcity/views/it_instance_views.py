# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITInstance, ITModel, Rack
from django.core.exceptions import ObjectDoesNotExist
from rackcity.api.objects import RackRangeSerializer
from rackcity.api.serializers import (
    ITInstanceSerializer,
    RecursiveITInstanceSerializer,
    ITModelSerializer,
    RackSerializer
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import JSONParser
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus
import math
from rackcity.views.rackcity_utils import (
    is_location_full,
    validate_location_modification,
    no_infile_location_conflicts,
    records_are_identical,
    LocationException
)


@api_view(['GET'])  # DEPRECATED !
@permission_classes([IsAuthenticated])
def instance_list(request):
    """
    List all instances.
    """
    if request.method == 'GET':
        instances = ITInstance.objects.all()
        serializer = RecursiveITInstanceSerializer(instances, many=True)
        return JsonResponse({"instances": serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def instance_page(request):
    """
    List a page of instances. Page and page size must be specified as query
    parameters.
    """

    failure_message = ""

    if not request.query_params.get('page'):
        failure_message += "Must specify page. "
    if not request.query_params.get('page_size'):
        failure_message += "Must specify page_size. "
    elif int(request.query_params.get('page_size')) <= 0:
        failure_message += "The page_size must be an integer greater than 0. "

    if failure_message != "":
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )

    instances_query = ITInstance.objects

    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    instances_query = instances_query.filter(**filter_args)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Sort error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    instances = instances_query.order_by(*sort_args)

    paginator = PageNumberPagination()
    paginator.page_size = request.query_params.get('page_size')

    try:
        page_of_instances = paginator.paginate_queryset(instances, request)
    except Exception as error:
        failure_message += "Invalid page requested: " + str(error)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )

    serializer = RecursiveITInstanceSerializer(page_of_instances, many=True)
    return JsonResponse(
        {"instances": serializer.data},
        status=HTTPStatus.OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def instance_detail(request, id):
    """
    Retrieve a single instance.
    """

    try:
        instance = ITInstance.objects.get(id=id)
    except ITInstance.DoesNotExist:
        failure_message = "No model exists with id=" + str(id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )

    serializer = RecursiveITInstanceSerializer(instance)
    return JsonResponse(serializer.data, status=HTTPStatus.OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def instance_add(request):
    """
    Add a new instance.
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' in data:
        failure_message += "Don't include id when adding an instance. "

    serializer = ITInstanceSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        failure_message += str(serializer.errors)

    rack_id = data['rack']
    elevation = data['elevation']
    height = ITModel.objects.get(id=data['model']).height

    if is_location_full(rack_id, elevation, height):
        failure_message += "Instance does not fit in this location. "

    if failure_message == "":
        try:
            serializer.save()
            return HttpResponse(status=HTTPStatus.CREATED)
        except Exception as error:
            failure_message += str(error)

    failure_message = "Request was invalid. " + failure_message
    return JsonResponse(
        {"failure_message": failure_message},
        status=HTTPStatus.BAD_REQUEST,
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def instance_modify(request):
    """
    Modify a single existing instance
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {"failure_message": "Must include 'id' when modifying an " +
             "instance. "},
            status=HTTPStatus.BAD_REQUEST,
        )

    id = data['id']
    try:
        existing_instance = ITInstance.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {"failure_message": "No existing instance with id=" +
                str(id) + ". "},
            status=HTTPStatus.BAD_REQUEST,
        )

    try:
        validate_location_modification(data, existing_instance)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Invalid location change: " + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )

    for field in data.keys():
        if field == 'model':
            value = ITModel.objects.get(id=data[field])
        elif field == 'rack':
            value = Rack.objects.get(id=data[field])
        else:
            value = data[field]
        setattr(existing_instance, field, value)

    try:
        existing_instance.save()
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Invalid updates: " + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        return HttpResponse(status=HTTPStatus.OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def instance_delete(request):
    """
    Delete a single existing instance
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' not in data:
        failure_message += "Must include id when deleting an instance. "
    else:
        id = data['id']
        try:
            existing_instance = ITInstance.objects.get(id=id)
        except ObjectDoesNotExist:
            failure_message += "No existing instance with id="+str(id)+". "

    if failure_message == "":
        try:
            existing_instance.delete()
            return HttpResponse(status=HTTPStatus.OK)
        except Exception as error:
            failure_message = failure_message + str(error)

    failure_message = "Request was invalid. " + failure_message

    return JsonResponse(
        {"failure_message": failure_message},
        status=HTTPStatus.BAD_REQUEST,
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def instance_bulk_upload(request):
    """
    Bulk upload many instances to add or modify
    """
    data = JSONParser().parse(request)
    if 'instances' not in data:
        return JsonResponse(
            {"failure_message": "Bulk upload request should have a parameter 'instances'"},
            status=HTTPStatus.BAD_REQUEST
        )
    instance_datas = data['instances']
    instances_to_add = []
    potential_modifications = []
    hostnames_in_import = set()
    for instance_data in instance_datas:
        if (
            'vendor' not in instance_data
            or 'model_number' not in instance_data
        ):
            return JsonResponse(
                {"failure_message": "Instance records must include 'vendor' and 'model_number'. "},
                status=HTTPStatus.BAD_REQUEST
            )
        try:
            model = ITModel.objects.get(
                vendor=instance_data['vendor'],
                model_number=instance_data['model_number']
            )
        except ObjectDoesNotExist:
            failure_message = "Model does not exist: " + \
                "vendor="+instance_data['vendor'] + \
                ", model_number="+instance_data['model_number']
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        instance_data['model'] = model.id
        del instance_data['vendor']
        del instance_data['model_number']
        if 'rack' not in instance_data:
            return JsonResponse(
                {"failure_message": "Instance records must include 'rack'"},
                status=HTTPStatus.BAD_REQUEST
            )
        try:
            row_letter = instance_data['rack'][:1]
            rack_num = instance_data['rack'][1:]
            rack = Rack.objects.get(row_letter=row_letter, rack_num=rack_num)
        except ObjectDoesNotExist:
            failure_message = "Provided rack doesn't exist: " + \
                instance_data['rack']
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        instance_data['rack'] = rack.id
        instance_serializer = ITInstanceSerializer(
            data=instance_data)  # non-recursive to validate
        # ADD VALIDAITON FOR RACK LOCATION HERE
        if not instance_serializer.is_valid():
            errors = instance_serializer.errors
            if not (  # if the only error is the hostname uniqueness, that's fine - it's a modify
                len(errors.keys()) == 1
                and 'hostname' in errors
                and len(errors['hostname']) == 1
                and errors['hostname'][0].code == 'unique'
            ):
                failure_message = str(instance_serializer.errors)
                failure_message = "At least one provided instance was not valid. "+failure_message
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST
                )
        # should this be whitespace/caps insenstive? Maybe later
        if instance_data['hostname'] in hostnames_in_import:
            failure_message = "Hostname must be unique, but '" + \
                instance_data['hostname'] + \
                "' appears more than once in import. "
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        else:
            hostnames_in_import.add(instance_data['hostname'])
        try:
            existing_instance = ITInstance.objects.get(
                hostname=instance_data['hostname'])
        except ObjectDoesNotExist:
            instances_to_add.append(instance_serializer)
        else:
            potential_modifications.append(
                {
                    "existing_instance": existing_instance,
                    "new_data": instance_data
                }
            )
    try:
        no_infile_location_conflicts(instance_datas)
    except LocationException as error:
        failure_message = "Location conflicts among instances in import file. " + \
            str(error)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST
        )
    records_added = 0
    for instance_to_add in instances_to_add:
        records_added += 1
        # GOING TO HAVE TO RECHECK LOCATION WITH EACH ADDITION
        instance_to_add.save()
    records_ignored = 0
    modifications_to_approve = []
    for potential_modification in potential_modifications:
        new_data = potential_modification['new_data']
        new_data['model'] = ITModelSerializer(
            ITModel.objects.get(id=new_data['model'])
        ).data
        new_data['rack'] = RackSerializer(
            Rack.objects.get(id=new_data['rack'])
        ).data
        existing_data = RecursiveITInstanceSerializer(
            potential_modification['existing_instance']
        ).data
        if records_are_identical(existing_data, new_data):
            records_ignored += 1
        else:
            new_data['id'] = existing_data['id']
            for field in existing_data.keys():
                if field not in new_data:
                    new_data[field] = None
            modifications_to_approve.append(
                {
                    "existing": existing_data,
                    "modified": new_data
                }
            )
    return JsonResponse(
        {
            "added": records_added,
            "ignored": records_ignored,
            "modifications": modifications_to_approve
        },
        status=HTTPStatus.OK
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def instance_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    if not request.query_params.get('page_size') or int(request.query_params.get('page_size')) <= 0:
        return JsonResponse(
            {"failure_message": "Must specify positive integer page_size."},
            status=HTTPStatus.BAD_REQUEST,
        )

    page_size = int(request.query_params.get('page_size'))
    instance_count = ITInstance.objects.all().count()
    page_count = math.ceil(instance_count / page_size)
    return JsonResponse({"page_count": page_count})


def get_sort_arguments(data):
    sort_args = []
    if 'sort_by' in data:
        sort_by = data['sort_by']
        for sort in sort_by:
            if ('field' not in sort) or ('ascending' not in sort):
                raise Exception("Must specify 'field' and 'ascending' fields.")
            if not isinstance(sort['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(sort['ascending'], bool):
                raise Exception("Field 'ascending' must be of type bool.")
            field_name = sort['field']
            order = "-" if not sort['ascending'] else ""
            sort_args.append(order + field_name)
    return sort_args


def get_filter_arguments(data):
    filter_args = {}
    if 'filters' in data:
        filters = data['filters']
        for filter in filters:

            if (
                ('field' not in filter)
                or ('filter_type' not in filter)
                or ('filter' not in filter)
            ):
                raise Exception(
                    "Must specify 'field', 'filter_type', and 'filter' fields."
                )
            if not isinstance(filter['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(filter['filter_type'], str):
                raise Exception("Field 'filter_type' must be of type string.")
            if not isinstance(filter['filter'], dict):
                raise Exception("Field 'filter' must be of type dict.")

            filter_field = filter['field']
            filter_type = filter['filter_type']
            filter_dict = filter['filter']

            if filter_type == 'text':
                if filter_dict['match_type'] == 'exact':
                    filter_args['{0}'.format(filter_field)] = \
                        filter_dict['value']
                elif filter_dict['match_type'] == 'contains':
                    filter_args['{0}__icontains'.format(filter_field)] = \
                        filter_dict['value']

            elif filter_type == 'numeric':
                range_value = (
                    int(filter_dict['min']),
                    int(filter_dict['max'])
                )
                filter_args['{0}__range'.format(filter_field)] = range_value  # noqa inclusive on both min, max

            elif filter_type == 'rack_range':
                range_serializer = RackRangeSerializer(data=filter_dict)
                if not range_serializer.is_valid():
                    raise Exception(
                        "Invalid rack_range filter: " +
                        str(range_serializer.errors)
                    )
                filter_args['rack__rack_num__range'] = \
                    range_serializer.get_number_range()
                filter_args['rack__row_letter__range'] = \
                    range_serializer.get_row_range()  # noqa inclusive on both letter, number

            else:
                raise Exception(
                    "String field 'filter_type' must be either 'text', " +
                    "'numeric', or 'rack_range'."
                )

    return filter_args
