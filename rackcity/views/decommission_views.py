from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    AddDecommissionedAssetSerializer,
    GetDecommissionedAssetSerializer,
)
from rackcity.models import Asset, DecommissionedAsset, AssetCP
from rackcity.permissions.permissions import user_has_asset_permission
from rackcity.utils.change_planner_utils import (
    get_cp_already_executed_response,
    get_many_assets_response_for_cp,
    get_page_count_response_for_decommissioned_cp,
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error,
    AuthFailure,
)
from rackcity.utils.log_utils import (
    Action,
    log_action,
)
from rackcity.utils.query_utils import (
    get_many_response,
    get_page_count_response,
)
from rackcity.utils.rackcity_utils import get_change_plan
from rest_framework.decorators import permission_classes, api_view
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decommission_asset(request):
    """
    Decommission a live asset
    """
    data = JSONParser().parse(request)
    change_plan = None

    if request.query_params.get("change_plan"):
        (change_plan, response) = get_change_plan(
            request.query_params.get("change_plan"))
        if response:
            return response
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DECOMMISSION_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when decommissioning an asset"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    decommissioned_asset_cp = None
    if change_plan:
        response = get_cp_already_executed_response(change_plan)
        if response:
            return response
        if not AssetCP.objects.filter(id=id).exists() and Asset.objects.filter(id=id).exists():
            existing_asset = Asset.objects.get(id=id)
            decommissioned_asset_cp = AssetCP(
                change_plan=change_plan,
                related_asset=existing_asset,
                is_decommissioned=True)
            for field in existing_asset._meta.fields:
                if not (field.name == "id" or field.name == "assetid_ptr"):
                    setattr(decommissioned_asset_cp, field.name, getattr(
                        existing_asset, field.name))
        else:
            try:
                decommissioned_asset_cp = AssetCP.objects.get(id=id)
                decommissioned_asset_cp.is_decommissioned = True

            except Asset.DoesNotExist:
                return JsonResponse(
                    {
                        "failure_message":
                            Status.ERROR.value +
                            "Asset" + GenericFailure.DOES_NOT_EXIST.value,
                        "errors": "No existing asset in change plan with id="+str(id)
                    },
                    status=HTTPStatus.BAD_REQUEST
                )
        if not user_has_asset_permission(
            request.user,
            decommissioned_asset_cp.rack.datacenter
        ):
            return JsonResponse(
                {
                    "failure_message":
                        Status.AUTH_ERROR.value + AuthFailure.ASSET.value,
                    "errors":
                        "User " + request.user.username +
                        " does not have asset permission in datacenter"
                },
                status=HTTPStatus.UNAUTHORIZED
            )

    else:
        try:
            asset = Asset.objects.get(id=id)
        except Asset.DoesNotExist:
            return JsonResponse(
                {
                    "failure_message":
                        Status.ERROR.value +
                        "Asset" + GenericFailure.DOES_NOT_EXIST.value,
                    "errors": "No existing asset with id="+str(id)
                },
                status=HTTPStatus.BAD_REQUEST
            )
        if not user_has_asset_permission(
            request.user,
            asset.rack.datacenter
        ):
            return JsonResponse(
                {
                    "failure_message":
                        Status.AUTH_ERROR.value + AuthFailure.ASSET.value,
                    "errors":
                        "User " + request.user.username +
                        " does not have asset permission in datacenter id="
                        + str(asset.rack.datacenter.id)
                },
                status=HTTPStatus.UNAUTHORIZED
            )

    if change_plan:
        try:
            decommissioned_asset_cp.save()
        except Exception as error:
            return JsonResponse(
                {
                    "failure_message":
                        Status.DECOMMISSION_ERROR.value +
                        parse_save_validation_error(
                            error,
                            "Decommissioned Asset "
                        ),
                    "errors": str(error)
                },
                status=HTTPStatus.BAD_REQUEST
            )

        return JsonResponse(
            {
                "success_message": "Asset successfully decommissioned on change plan: " + change_plan.name
            },
            status=HTTPStatus.OK
        )

    asset_data = RecursiveAssetSerializer(asset).data
    asset_data['live_id'] = asset_data['id']
    del asset_data['id']
    asset_data['decommissioning_user'] = str(request.user)
    decommissioned_asset = AddDecommissionedAssetSerializer(data=asset_data)
    if not decommissioned_asset.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message":
                    Status.INVALID_INPUT.value +
                    parse_serializer_errors(decommissioned_asset.errors),
                "errors": str(decommissioned_asset.errors)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        decommissioned_asset_object = decommissioned_asset.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DECOMMISSION_ERROR.value +
                    parse_save_validation_error(
                        error,
                        "Decommissioned Asset "
                    ),
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    else:
        for assetcp in AssetCP.objects.filter(related_asset=id):
            assetcp.related_decommissioned_asset = decommissioned_asset_object
            assetcp.save()
        log_action(
            request.user,
            asset,
            Action.DECOMMISSION,
        )
        asset.delete()
        return JsonResponse(
            {
                "success_message": "Asset successfully decommissioned. "
            },
            status=HTTPStatus.OK
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decommissioned_asset_many(request):
    """
    List many decommissioned assets. If page is not specified as a query parameter, all
    assets are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """
    if request.query_params.get('change_plan'):
        (change_plan, response) = get_change_plan(
            request.query_params.get('change_plan')
        )
        if response:
            return response
        else:
            return get_many_assets_response_for_cp(
                request,
                change_plan,
                decommissioned=True,
            )
    else:
        return get_many_response(
            DecommissionedAsset,
            GetDecommissionedAssetSerializer,
            "assets",
            request,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def decommissioned_asset_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    change_plan = None
    if request.query_params.get("change_plan"):
        (change_plan, response) = get_change_plan(
            request.query_params.get("change_plan")
        )
        if response:
            return response
    if change_plan:
        return get_page_count_response_for_decommissioned_cp(
            request,
            change_plan,
        )
    else:
        return get_page_count_response(
            DecommissionedAsset,
            request.query_params,
            data_for_filters=request.data,
        )
