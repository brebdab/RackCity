from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    AddDecommissionedAssetSerializer,
    GetDecommissionedAssetSerializer,
)
from rackcity.models import Asset, DecommissionedAsset, AssetCP
from rackcity.models.asset import get_assets_for_cp
from rackcity.permissions.permissions import validate_user_permission_on_existing_asset
from rackcity.utils.asset_utils import add_chassis_to_cp
from rackcity.utils.change_planner_utils import (
    get_change_plan,
    get_cp_already_executed_response,
    get_many_assets_response_for_cp,
    get_page_count_response_for_cp,
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error,
)
from rackcity.utils.exceptions import UserAssetPermissionException
from rackcity.utils.log_utils import (
    Action,
    log_action,
)
from rackcity.utils.query_utils import (
    get_many_response,
    get_page_count_response,
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def decommission_asset(request):
    """
    Decommission a live asset
    """
    data = JSONParser().parse(request)
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if "id" not in data:
        return JsonResponse(
            {
                "failure_message": Status.DECOMMISSION_ERROR.value
                + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when decommissioning an asset",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    asset_id = data["id"]
    success_response, failure_response = decommission_asset_parameterized(
        asset_id, request.query_params, request.user, change_plan
    )
    if failure_response:
        return failure_response
    if not change_plan:
        blades = Asset.objects.filter(chassis=asset_id)
        for blade in blades:
            blade.delete()
        Asset.objects.get(id=asset_id).delete()
    return success_response


def decommission_asset_parameterized(asset_id, query_params, user, change_plan):
    """
    Decommission a live asset
    """
    decommissioned_asset_cp = None
    if change_plan:
        response = get_cp_already_executed_response(change_plan)
        if response:
            return None, response
        assets, assets_cp = get_assets_for_cp(change_plan.id, show_decommissioned=True)
        if assets_cp.filter(related_asset=asset_id).exists():

            decommissioned_asset_cp = assets_cp.get(related_asset=asset_id)
            decommissioned_asset_cp.is_decommissioned = True
            asset_id = decommissioned_asset_cp.id
        elif assets_cp.filter(id=asset_id).exists():

            decommissioned_asset_cp = assets_cp.get(id=asset_id)
            decommissioned_asset_cp.is_decommissioned = True
            asset_id = decommissioned_asset_cp.id
        elif assets.filter(id=asset_id).exists():

            existing_asset = assets.get(id=asset_id)
            decommissioned_asset_cp = AssetCP(
                change_plan=change_plan,
                related_asset=existing_asset,
                is_decommissioned=True,
            )

            for field in existing_asset._meta.fields:
                if not (
                    field.name == "id"
                    or field.name == "assetid_ptr"
                    or field.name == "chassis"
                ):
                    setattr(
                        decommissioned_asset_cp,
                        field.name,
                        getattr(existing_asset, field.name),
                    )
            if (
                existing_asset.chassis
                and not assets_cp.filter(
                    related_asset=existing_asset.chassis.id
                ).exists()
            ):
                chassis_cp = add_chassis_to_cp(
                    existing_asset.chassis,
                    change_plan,
                    ignore_blade_id=existing_asset.id,
                )
                decommissioned_asset_cp.chassis = chassis_cp
            elif existing_asset.chassis:
                decommissioned_asset_cp.chassis = assets_cp.get(
                    related_asset=existing_asset.chassis.id
                )
            decommissioned_asset_cp.save()

        else:
            return (
                None,
                JsonResponse(
                    {
                        "failure_message": Status.ERROR.value
                        + "Asset"
                        + GenericFailure.DOES_NOT_EXIST.value,
                        "errors": "No existing asset in change plan with id="
                        + str(asset_id),
                    },
                    status=HTTPStatus.BAD_REQUEST,
                ),
            )
        try:
            validate_user_permission_on_existing_asset(user, decommissioned_asset_cp)
        except UserAssetPermissionException as auth_error:
            return (
                None,
                JsonResponse(
                    {"failure_message": Status.AUTH_ERROR.value + str(auth_error)},
                    status=HTTPStatus.UNAUTHORIZED,
                ),
            )
        if asset_id != decommissioned_asset_cp.id:
            ## a new asset cp was created for decommissioning, blades are not on assetxp
            blades = assets.filter(chassis=asset_id)
        else:
            blades = assets_cp.filter(chassis=asset_id)
        for blade in blades:
            try:
                decommission_asset_parameterized(
                    blade.id, query_params, user, change_plan
                )
                # Assume that if this call doesn't raise an exception, it was successful
                # None of the failed responses above are possible
            except Exception as error:

                return (
                    None,
                    JsonResponse(
                        {
                            "failure_message": Status.DECOMMISSION_ERROR.value
                            + "Unable to decommission blade: '"
                            + str(blade.asset_number)
                            + "'. ",
                            "errors": str(error),
                        },
                        status=HTTPStatus.BAD_REQUEST,
                    ),
                )
        try:
            decommissioned_asset_cp.save()

        except Exception as error:

            return (
                None,
                JsonResponse(
                    {
                        "failure_message": Status.DECOMMISSION_ERROR.value
                        + parse_save_validation_error(error, "Decommissioned Asset "),
                        "errors": str(error),
                    },
                    status=HTTPStatus.BAD_REQUEST,
                ),
            )

        return (
            JsonResponse(
                {
                    "success_message": "Asset successfully decommissioned on change plan: "
                    + change_plan.name
                },
                status=HTTPStatus.OK,
            ),
            None,
        )

    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return (
            None,
            JsonResponse(
                {
                    "failure_message": Status.ERROR.value
                    + "Asset"
                    + GenericFailure.DOES_NOT_EXIST.value,
                    "errors": "No existing asset with id=" + str(asset_id),
                },
                status=HTTPStatus.BAD_REQUEST,
            ),
        )
    try:
        validate_user_permission_on_existing_asset(user, asset)
    except UserAssetPermissionException as auth_error:
        return (
            None,
            JsonResponse(
                {"failure_message": Status.AUTH_ERROR.value + str(auth_error)},
                status=HTTPStatus.UNAUTHORIZED,
            ),
        )

    blades = Asset.objects.filter(chassis=asset.id)
    for blade in blades:
        try:
            decommission_asset_parameterized(blade.id, query_params, user, change_plan)
            # Assume that if this call doesn't raise an exception, it was successful
            # None of the failed responses above are possible
        except Exception as error:
            return (
                None,
                JsonResponse(
                    {
                        "failure_message": Status.DECOMMISSION_ERROR.value
                        + "Unable to decommission blade: '"
                        + str(blade.asset_number)
                        + "'. ",
                        "errors": str(error),
                    },
                    status=HTTPStatus.BAD_REQUEST,
                ),
            )
    asset_data = RecursiveAssetSerializer(asset).data
    asset_data["live_id"] = asset_data["id"]
    del asset_data["id"]
    asset_data["decommissioning_user"] = str(user)
    decommissioned_asset = AddDecommissionedAssetSerializer(data=asset_data)
    if not decommissioned_asset.is_valid(raise_exception=False):
        return (
            None,
            JsonResponse(
                {
                    "failure_message": Status.INVALID_INPUT.value
                    + parse_serializer_errors(decommissioned_asset.errors),
                    "errors": str(decommissioned_asset.errors),
                },
                status=HTTPStatus.BAD_REQUEST,
            ),
        )
    try:
        decommissioned_asset_object = decommissioned_asset.save()
    except Exception as error:
        return (
            None,
            JsonResponse(
                {
                    "failure_message": Status.DECOMMISSION_ERROR.value
                    + parse_save_validation_error(error, "Decommissioned Asset "),
                    "errors": str(error),
                },
                status=HTTPStatus.BAD_REQUEST,
            ),
        )
    else:
        for assetcp in AssetCP.objects.filter(related_asset=asset_id):
            assetcp.related_decommissioned_asset = decommissioned_asset_object
            assetcp.save()
        log_action(
            user, asset, Action.DECOMMISSION,
        )
        return (
            JsonResponse(
                {"success_message": "Asset successfully decommissioned. "},
                status=HTTPStatus.OK,
            ),
            None,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def decommissioned_asset_many(request):
    """
    List many decommissioned assets. If page is not specified as a query parameter, all
    assets are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        return get_many_assets_response_for_cp(
            request, change_plan, decommissioned=True,
        )
    else:
        return get_many_response(
            DecommissionedAsset, GetDecommissionedAssetSerializer, "assets", request,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def decommissioned_asset_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        return get_page_count_response_for_cp(request, change_plan, decommissioned=True)
    else:
        return get_page_count_response(
            DecommissionedAsset, request.query_params, data_for_filters=request.data,
        )
