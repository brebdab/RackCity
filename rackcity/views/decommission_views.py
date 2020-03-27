from django.http import JsonResponse
from rest_framework.parsers import JSONParser
from rackcity.models import Asset
from rackcity.permissions.permissions import user_has_asset_permission
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    AddDecommissionedAssetSerializer,
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAdminUser
from http import HTTPStatus
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error,
    AuthFailure,
)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def decommission_asset(request):
    """
    Decommission a live asset
    """
    data = JSONParser().parse(request)
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
        decommissioned_asset.save()
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
        asset.delete()
        return JsonResponse(
            {
                "success_message": "Asset successfully decommissioned. "
            },
            status=HTTPStatus.OK
        )
