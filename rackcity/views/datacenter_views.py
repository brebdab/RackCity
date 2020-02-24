from django.http import HttpResponse, JsonResponse
from rackcity.models import Datacenter
from rackcity.api.serializers import DatacenterSerializer
from rackcity.utils.log_utils import (
    log_action,
    log_delete,
    ElementType,
    Action
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure
)
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
    if 'id' in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value + GenericFailure.UNKNOWN.value,
                "errors": "Don't include 'id' when creating a datacenter"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    serializer = DatacenterSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value +
                    GenericFailure.INVALID_DATA.value,
                "errors": str(serializer.errors)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        new_datacenter = serializer.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value + GenericFailure.UNKNOWN.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    log_action(request.user, new_datacenter, Action.CREATE)
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                new_datacenter.abbreivation + " created"
        },
        status=HTTPStatus.CREATED
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def datacenter_delete(request):
    """
    Delete a single datacenter
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value + GenericFailure.UNKNOWN.value,
                "errors": "Must include 'id' when creating a datacenter"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        existing_dc = Datacenter.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Datacenter" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing datacenter with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    dc_abbreviation = existing_dc.abbreviation
    try:
        existing_dc.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value + GenericFailure.UNKNOWN.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    log_delete(request.user, ElementType.DATACENTER, dc_abbreviation)
    return JsonResponse(
        {Status.SUCCESS.value + dc_abbreviation + " deleted"},
        status=HTTPStatus.OK
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
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.UNKNOWN.value,
                "errors": "Must specify positive integer page_size."
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(request.query_params.get('page_size'))
    dc_query = Datacenter.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.FILTER.value,
                "errors": str(error)
            },
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
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value + GenericFailure.UNKNOWN.value,
                "errors": "Must include 'id' when modifying a datacenter"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        existing_dc = Datacenter.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Datacenter" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing datacenter with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
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
                    {
                        "failure_message":
                            Status.MODIFY_ERROR.value +
                            "Datacenter with name '" +
                            data[field].lower() + "' already exists"
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
            setattr(existing_dc, field, data[field])
    try:
        existing_dc.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    GenericFailure.INVALID_DATA.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    log_action(request.user, existing_dc, Action.MODIFY)
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value + existing_dc.abbreviation + " modified"
        },
        status=HTTPStatus.OK
    )
