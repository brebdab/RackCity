from django.http import HttpResponse, JsonResponse
from rackcity.models import Datacenter
from rackcity.api.serializers import DatacenterSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from http import HTTPStatus
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.parsers import JSONParser
from rackcity.views.rackcity_utils import get_filter_arguments
import math


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def datacenter_all(request):
    """
        Return List of all datacenters.
    """
    datacenters = Datacenter.objects.all()
    serializer = DatacenterSerializer(datacenters, many=True)
    return JsonResponse(
        {"datacenters": serializer.data},
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def datacenter_create(request):
    """
    Add a datacenter.
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' in data:
        failure_message += "Don't include id when adding a datacenter"

    serializer = DatacenterSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        failure_message += str(serializer.errors)
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
def datacenter_delete(request):
    """
    Delete a single datacenter
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' not in data:
        failure_message += "Must include id when deleting a datacenter. "
    else:
        id = data['id']
        try:
            existing_dc = Datacenter.objects.get(id=id)
        except ObjectDoesNotExist:
            failure_message += "No existing datacenter with id = " + str(id) + ". "

    if failure_message == "":
        try:
            existing_dc.delete()
            return HttpResponse(status=HTTPStatus.OK)
        except Exception as error:
            failure_message = failure_message + str(error)

    failure_message = "Request was invalid: " + failure_message

    return JsonResponse(
        {"failure_message": failure_message},
        status=HTTPStatus.BAD_REQUEST,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def datacenter_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    if (
        not request.query_params.get('page_size')
        or int(request.query_params.get('page_size')) <= 0
    ):
        return JsonResponse(
            {"failure_message": "Must specify positive integer page_size."},
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(request.query_params.get('page_size'))
    dc_query = Datacenter.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        dc_query = dc_query.filter(**filter_arg)
    dc_count = dc_query.count()
    page_count = math.ceil(dc_count / page_size)
    return JsonResponse({"page_count": page_count})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def datacenter_modify(request):
    """
    Modify an existing model
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' not in data:
        failure_message += "Must include id when modifying a datacenter. "
    else:
        id = data['id']
        try:
            existing_dc = Datacenter.objects.get(id=id)
        except ObjectDoesNotExist:
            failure_message += "No existing datacenter with id="+str(id)+". "
        else:
            for field in data.keys():
                if field != "id":
                    if field == "name":
                        dc_with_name = Datacenter.objects.filter(
                            name__iexact=data[field]
                        )
                    else:
                        dc_with_name = Datacenter.objects.filter(
                            abbreviation__iexact=data[field]
                        )
                    if (
                        len(dc_with_name) > 0
                        and dc_with_name[0].id != id
                    ):
                        return JsonResponse(
                            {"failure_message": "Datacenter with name '" +
                                data[field].lower() + "' already exists."},
                            status=HTTPStatus.BAD_REQUEST,
                        )
                    setattr(existing_dc, field, data[field])
            try:
                existing_dc.save()
                return HttpResponse(status=HTTPStatus.OK)
            except Exception as error:
                failure_message = failure_message + str(error)
    failure_message = "Request was invalid. " + failure_message
    return JsonResponse({
        "failure_message": failure_message
    },
        status=HTTPStatus.NOT_ACCEPTABLE
    )
