# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITInstance, ITModel, Rack
from rackcity.views.it_model_views import records_are_identical
from django.core.exceptions import ObjectDoesNotExist
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

    if 'sort_by' in request.data:
        sort_by = request.data['sort_by']
        sort_args = []
        for sort in sort_by:
            if ('field' not in sort) or ('ascending' not in sort):
                failure_message += "Must specify 'field' and 'ascending' fields. "
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST,
                )
            field_name = sort['field']
            order = "-" if not sort['ascending'] else ""
            sort_args.append(order + field_name)
        instances = ITInstance.objects.order_by(*sort_args)
    else:
        instances = ITInstance.objects.all()

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
    for instance_data in instance_datas:
        if (
            'vendor' not in instance_data
            or 'model_number' not in instance_data
        ):
            return JsonResponse(
                {"failure_message": "Instance records must include 'vendor' and 'model_number'. "},
                status=HTTPStatus.BAD_REQUEST
            )
        model = ITModel.objects.get(
            vendor=instance_data['vendor'],
            model_number=instance_data['model_number']
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
        except:
            return JsonResponse(
                {"failure_message": "Provided rack doesn't exist. "},
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
    records_added = 0
    for instance_to_add in instances_to_add:
        records_added += 1
        # GOING TO HAVE TO RECHECK LOCATION AND UNIQUENESS WITH EACH ADDITION
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


def is_location_full(rack_id, instance_elevation, instance_height):
    new_instance_location_range = [
        instance_elevation + i for i in range(instance_height)
    ]
    instances_in_rack = ITInstance.objects.filter(rack=rack_id)
    for instance_in_rack in instances_in_rack:
        for occupied_location in [
            instance_in_rack.elevation + i for i
                in range(instance_in_rack.model.height)
        ]:
            if occupied_location in new_instance_location_range:
                return True
    return False
