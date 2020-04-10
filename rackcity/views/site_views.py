from django.http import JsonResponse
from django.contrib.auth.decorators import permission_required
from django.core.exceptions import ObjectDoesNotExist
from http import HTTPStatus
from rackcity.api.serializers import SiteSerializer
from rackcity.models import Asset, Rack, Site
from rackcity.permissions.permissions import PermissionPath
from rackcity.utils.errors_utils import Status, GenericFailure, parse_serializer_errors
from rackcity.utils.log_utils import log_action, log_delete, ElementType, Action
from rackcity.utils.query_utils import get_page_count_response
from rest_framework.decorators import permission_classes, api_view
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def datacenter_all(request):
    """
    Return list of all datacenters.
    """
    datacenters = Site.get_datacenters()
    serializer = SiteSerializer(datacenters, many=True)
    return JsonResponse({"datacenters": serializer.data}, status=HTTPStatus.OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def offline_storage_site_all(request):
    """
    Return list of all offline storage sites.
    """
    offline_storage_sites = Site.get_offline_storage_sites()
    serializer = SiteSerializer(offline_storage_sites, many=True)
    return JsonResponse(
        {"offline_storage_sites": serializer.data}, status=HTTPStatus.OK
    )


@api_view(["POST"])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
def site_create(request):
    """
    Add a site.
    """
    data = JSONParser().parse(request)
    if "id" in data:
        return JsonResponse(
            {
                "failure_message": Status.CREATE_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Don't include 'id' when creating a site",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    serializer = SiteSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message": Status.INVALID_INPUT.value
                + parse_serializer_errors(serializer.errors),
                "errors": str(serializer.errors),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        new_site = serializer.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.CREATE_ERROR.value
                + "Site"
                + GenericFailure.ON_SAVE.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    log_action(request.user, new_site, Action.CREATE)
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + new_site.abbreviation + " created"},
        status=HTTPStatus.CREATED,
    )


@api_view(["POST"])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
def site_modify(request):
    """
    Modify an existing site.
    """
    data = JSONParser().parse(request)
    if "id" not in data:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when modifying a site",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    id = data["id"]
    try:
        existing_site = Site.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + "Site"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing site with id=" + str(id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    for field in data.keys():
        if field != "id":
            if len(data[field]) == 0:
                return JsonResponse(
                    {
                        "failure_message": Status.MODIFY_ERROR.value
                        + "field "
                        + field
                        + " cannot be empty"
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
            if field == "name":
                site_with_name = Site.objects.filter(name__iexact=data[field])
            else:
                site_with_name = Site.objects.filter(abbreviation__iexact=data[field])
            if len(site_with_name) > 0 and site_with_name[0].id != id:
                return JsonResponse(
                    {
                        "failure_message": Status.MODIFY_ERROR.value
                        + "Site with name '"
                        + data[field].lower()
                        + "' already exists"
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
            setattr(existing_site, field, data[field])
    try:
        existing_site.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.MODIFY_ERROR.value
                + "Site"
                + GenericFailure.ON_SAVE.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    log_action(request.user, existing_site, Action.MODIFY)
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + existing_site.abbreviation
            + " modified"
        },
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
def site_delete(request):
    """
    Delete a single site.
    """
    data = JSONParser().parse(request)
    if "id" not in data:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when deleting a site",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    id = data["id"]
    racks = Rack.objects.filter(datacenter=id)
    if len(racks) > 0:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Cannot delete datacenter that still contains racks"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    assets_in_storage = Asset.objects.filter(offline_storage_site=id)
    if len(assets_in_storage) > 0:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Cannot delete offline storage site that still contains assets"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        existing_site = Site.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Site"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing site with id=" + str(id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        existing_site.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Site"
                + GenericFailure.ON_DELETE.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    log_delete(request.user, ElementType.SITE, existing_site.abbreviation)
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + existing_site.abbreviation
            + " deleted"
        },
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def datacenter_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    datacenters = Site.get_datacenters()
    return get_page_count_response(
        Site,
        request.query_params,
        data_for_filters=request.data,
        premade_object_query=datacenters,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def offline_storage_site_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    offline_storage_sites = Site.get_offline_storage_sites()
    return get_page_count_response(
        Site,
        request.query_params,
        data_for_filters=request.data,
        premade_object_query=offline_storage_sites,
    )
