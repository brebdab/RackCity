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

    instances = ITInstance.objects.all()
    paginator = PageNumberPagination()
    paginator.page_size = request.query_params.get('page_size')

    try:
        page_of_instances = paginator.paginate_queryset(instances, request)
    except Exception:
        failure_message += "Invalid page requested. "
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
    failure_message = ""
    if 'id' not in data:
        failure_message += "Must include id when modifying an instance. "
    else:
        id = data['id']
        try:
            existing_instance = ITInstance.objects.get(id=id)
        except ObjectDoesNotExist:
            failure_message += "No existing instance with id="+str(id)+". "
        else:
            for field in data.keys():
                if is_valid_location_update(existing_instance, field, data[field]):
                    setattr(existing_instance, field, data[field])
                else:
                    failure_message += "Invalid location for instance. "
            try:
                existing_instance.save()
            except Exception as error:
                failure_message = failure_message + \
                    " Error on save: " + str(error)
            else:
                return JsonResponse(
                    {"hello": "hello"},
                    status=HTTPStatus.OK,
                )
    failure_message = "Request was invalid. " + failure_message
    return JsonResponse(
        {"failure_message": failure_message},
        status=HTTPStatus.BAD_REQUEST
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


def is_location_full(rack_id, elevation, height):
    rack_u = [elevation + i for i in range(height)]
    instances_in_rack = ITInstance.objects.filter(rack=rack_id)
    for instance in instances_in_rack:
        for u in [
            instance.elevation + i for i in range(instance.model.height)
        ]:
            if u in rack_u:
                return True
    return False


def is_valid_location_update(existing_instance, field, value):
    if field in ['elevation', 'model', 'rack'] and isinstance(value, int):
        rack_id = existing_instance.rack.id
        elevation = existing_instance.elevation
        height = existing_instance.model.height
        if (field == 'elevation'):
            elevation = value
        elif (field == 'model'):
            height = ITModel.objects.get(id=value).height
        elif (field == 'rack'):
            rack_id = value
        return not is_location_full(rack_id, elevation, height)
    return False
