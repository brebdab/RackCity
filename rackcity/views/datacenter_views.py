from django.http import JsonResponse
from django.contrib.auth.decorators import permission_required
from django.core.exceptions import ObjectDoesNotExist
from http import HTTPStatus
from rackcity.api.serializers import DatacenterSerializer
from rackcity.models import Datacenter, Rack
from rackcity.permissions.permissions import PermissionPath
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors
)
from rackcity.utils.log_utils import (
    log_action,
    log_delete,
    ElementType,
    Action
)
from rackcity.utils.query_utils import get_page_count_response
from rest_framework.decorators import permission_classes, api_view
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated


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
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
def datacenter_create(request):
    """
    Add a datacenter.
    """
    data = JSONParser().parse(request)
    if 'id' in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Don't include 'id' when creating a datacenter"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    serializer = DatacenterSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message":
                    Status.INVALID_INPUT.value +
                    parse_serializer_errors(serializer.errors),
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
                    Status.CREATE_ERROR.value +
                    "Datacenter" +
                    GenericFailure.ON_SAVE.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    log_action(request.user, new_datacenter, Action.CREATE)
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                new_datacenter.abbreviation + " created"
        },
        status=HTTPStatus.CREATED
    )


@api_view(['POST'])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
def datacenter_delete(request):
    """
    Delete a single datacenter
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when creating a datacenter"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    racks = Rack.objects.filter(datacenter=id)
    if len(racks) > 0:
        return JsonResponse(
            {"failure_message":
                Status.DELETE_ERROR.value +
                "Cannot delete datacenter that still contains racks"
             },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        existing_dc = Datacenter.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Datacenter" +
                    GenericFailure.DOES_NOT_EXIST.value,
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
                    Status.DELETE_ERROR.value +
                    "Datacenter" +
                    GenericFailure.ON_DELETE.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    log_delete(request.user, ElementType.DATACENTER, dc_abbreviation)
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + dc_abbreviation + " deleted"},
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def datacenter_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    return get_page_count_response(
        Datacenter,
        request.query_params,
        data_for_filters=request.data,
    )


@api_view(['POST'])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
def datacenter_modify(request):
    """
    Modify an existing model
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value + GenericFailure.INTERNAL.value,
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
                    "Datacenter" +
                    GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing datacenter with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    for field in data.keys():
        if field != "id":
            if len(data[field]) == 0:
                return JsonResponse(
                    {
                        "failure_message":
                            Status.MODIFY_ERROR.value +
                            "field " + field + " cannot be empty"
                    },
                    status=HTTPStatus.BAD_REQUEST
                )
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
                    "Datacenter" +
                    GenericFailure.ON_SAVE.value,
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
