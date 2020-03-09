from rackcity.models import (
    Asset,
    AssetCP,
)


def get_asset_query_for_branch(asset_query, change_plan=None):
    # asset_query = list(Asset.objects.all())
    if change_plan is None:
        return asset_query
    change_plan_query = AssetCP.objects.filter(change_plan=change_plan)
    for change_planner_asset in change_plan_query:
        if (change_planner_asset.related_asset) in asset_query:
            asset_to_replace = change_planner_asset.related_asset
            print('asset to replace: ', asset_to_replace.hostname)
            overwrite_asset(asset_to_replace, change_planner_asset)
        else:
            asset_to_add = create_temp_asset(change_planner_asset)
            print('asset to add: ', asset_to_add)
            asset_query.append(asset_to_add)
    return asset_query


def overwrite_asset(asset, change_planner_asset):
    asset.asset_number = change_planner_asset.asset_number
    asset.hostname = change_planner_asset.hostname
    asset.rack_position = change_planner_asset.rack_position
    asset.model = change_planner_asset.model
    asset.rack = change_planner_asset.rack
    asset.owner = change_planner_asset.owner
    asset.comment = change_planner_asset.comment


def create_temp_asset(change_planner_asset):
    return Asset(
        # asset number can be null on change planner assets, need to allow this on Asset model
        asset_number=change_planner_asset.asset_number,
        hostname=change_planner_asset.hostname,
        rack_position=change_planner_asset.rack_position,
        model=change_planner_asset.model,
        rack=change_planner_asset.rack,
        owner=change_planner_asset.owner,
        comment=change_planner_asset.comment,
    )
