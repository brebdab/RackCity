from django.db.models import Q
from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
)
from rackcity.models import Asset, AssetCP


def get_assets_for_cp(change_plan=None):
    """
    If a change plan is specified, returns Asset query and AssetCP query,
    where any assets modified in the change plan are in the AssetCP query but
    removed from the Asset query. If no change plan is specified, returns
    Asset query of all assets on master.
    """
    assets = Asset.objects.all()
    if change_plan is None:
        return (assets, None)
    assetsCP = AssetCP.objects.filter(change_plan=change_plan)
    for assetCP in assetsCP:
        if (assetCP.related_asset) and (assetCP.related_asset) in assets:
            assets = assets.filter(~Q(id=assetCP.related_asset.id))
    # TODO remove any Asset or AssetCP that has been decommissioned in this CP
    return (assets, assetsCP)


def get_many_assets_response_for_cp(request, change_plan):
    assets, assetsCP = get_assets_for_cp(change_plan=change_plan)
    asset_serializer = RecursiveAssetSerializer(
        assets,
        many=True,
    )
    asset_data = asset_serializer.data
    assetCP_serializer = RecursiveAssetCPSerializer(
        assetsCP,
        many=True,
    )
    assetCP_data = assetCP_serializer.data
    data = asset_data + assetCP_data
    return JsonResponse(
        {"assets": data},
        status=HTTPStatus.OK,
    )
