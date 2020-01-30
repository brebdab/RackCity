# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITInstance, ITModel, Rack
from django.core.exceptions import ObjectDoesNotExist
from rackcity.api.serializers import (
    ITInstanceSerializer,
    RecursiveITInstanceSerializer,
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
        setattr(existing_instance, field, data[field])

    try:
        existing_instance.save()
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Invalid updates: " + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        return HTTPStatus(status=HTTPStatus.OK)


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


def is_location_full(rack_id, instance_id, instance_elevation, instance_height):
    new_instance_location_range = [
        instance_elevation + i for i in range(instance_height)
    ]
    instances_in_rack = ITInstance.objects.filter(rack=rack_id)
    for instance_in_rack in instances_in_rack:
        # Ignore if instance being modified conflicts with its old location
        if (instance_in_rack.id != instance_id):
            for occupied_location in [
                instance_in_rack.elevation + i for i
                    in range(instance_in_rack.model.height)
            ]:
                if occupied_location in new_instance_location_range:
                    return True
    return False


def validate_location_modification(data, existing_instance):
    instance_id = existing_instance.id
    rack_id = existing_instance.rack.id
    instance_elevation = existing_instance.elevation
    instance_height = existing_instance.model.height

    if 'elevation' in data:
        try:
            instance_elevation = int(data['elevation'])
        except ValueError:
            raise Exception("Field 'elevation' must be of type int.")

    if 'model' in data:
        try:
            instance_height = ITModel.objects.get(id=data['model']).height
        except Exception:
            raise Exception("No existing model with id=" +
                            str(data['model']) + ".")

    if 'rack' in data:
        try:
            rack_id = Rack.objects.get(id=data['rack']).id
        except Exception:
            raise Exception("No existing rack with id=" +
                            str(data['rack']) + ".")

    if is_location_full(
        rack_id,
        instance_id,
        instance_elevation,
        instance_height
    ):
        raise Exception("Instance does not fit in modified location.")
