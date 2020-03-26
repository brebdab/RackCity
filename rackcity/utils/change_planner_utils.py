from django.db.models import Q
from rackcity.models import Asset, AssetCP
from rackcity.utils.query_utils import get_many_response


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
    values_list = (
        'id',
        'hostname',
        'rack_position',
        'owner',
        'comment',
        'asset_number',
        'model',
        'rack',
    )
    all_assets = assets.values_list(*values_list).union(
        assetsCP.values_list(*values_list)
    )
    return get_many_response(
        None,
        "assets",
        request,
        fields_to_serialize=values_list,
        premade_object_query=all_assets,
    )
