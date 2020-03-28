from django.db.models import Q
from django.http import JsonResponse
from http import HTTPStatus
import json
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
)
from rackcity.models import Asset, AssetCP
from rackcity.utils.query_utils import get_filtered_query


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
    filtered_assets, filter_failure_response = get_filtered_query(
        assets,
        request.data,
    )
    if filter_failure_response:
        return filter_failure_response
    filtered_assetsCP, filter_failure_response = get_filtered_query(
        assetsCP,
        request.data,
    )
    if filter_failure_response:
        return filter_failure_response
    asset_serializer = RecursiveAssetSerializer(
        filtered_assets,
        many=True,
    )
    assetCP_serializer = RecursiveAssetCPSerializer(
        filtered_assetsCP,
        many=True,
    )
    all_assets = asset_serializer.data + assetCP_serializer.data
    return JsonResponse(
        {"assets": all_assets},
        status=HTTPStatus.OK,
    )


# def get_changes_on_asset(asset, assetCP):
#     fields = [field.name for field in Asset._meta.get_fields()]
#     changes = []
#     for field in fields:
#         if getattr(asset, field) != getattr(assetCP, field):
#             # TODO will need to serialize field if it's another model
#             changes.append({
#                 "field": field,
#                 # "master": getattr(asset, field),
#                 # "change_plan": getattr(assetCP, field),
#             })
#     return changes


def get_modifications_in_cp(change_plan):
    assetsCP = AssetCP.objects.filter(change_plan=change_plan)
    modifications = []
    for assetCP in assetsCP:
        assetCP_data = RecursiveAssetCPSerializer(assetCP).data
        related_asset = assetCP.related_asset
        if related_asset:
            title = "Modify asset " + str(assetCP.related_asset.asset_number)
            asset_data = RecursiveAssetSerializer(related_asset).data
        else:
            title = "Create asset"
            if assetCP.asset_number:
                title += " " + str(assetCP.asset_number)
            asset_data = None

        modification = {
            "title": title,
            "asset": asset_data,
            "assetCP": assetCP_data,
        }
        # check for conflicts
        if assetCP.is_conflict:
            modification["conflict_message"] = ""
            modification["conflicting_asset"] = ""

        modifications.append(modification)

    return modifications
    # TODO add logic for decommission modification
