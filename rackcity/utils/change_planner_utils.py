from django.db.models.signals import post_save
from django.dispatch import receiver
from django.http import JsonResponse
from http import HTTPStatus
import math
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
)
from rackcity.models import Asset, AssetCP
from rackcity.models.asset import get_assets_for_cp
from rackcity.utils.errors_utils import Status, GenericFailure
from rackcity.utils.query_utils import (
    get_filtered_query,
    get_invalid_paginated_request_response,
    should_paginate_query,
)
from rackcity.views.rackcity_utils import validate_asset_location, LocationException
from django.db.models import Q

@receiver(post_save, sender=Asset)
def detect_conflicts_cp(sender, **kwargs):
    #fields: sender, instance, created, raw, using, update_fields
    ## asset is a related asset of assetCP
    asset = kwargs.get("instance")
    related_assets_cp = AssetCP.objects.filter(related_asset=asset.id)
    for related_asset_cp in related_assets_cp:
        related_asset_cp.is_conflict = True
        related_asset_cp.save()
    # hostname conflicts with hostnames on assetcps
    asset.hostname_conflict.clear()
    AssetCP.objects.filter(
        Q(hostname=asset.hostname) & ~Q(related_asset=asset.id)
        ).update(asset_conflict_hostname=asset)

    # asset rack location conflicts with an assetCP

    asset.location_conflict.clear()
    for assetcp in AssetCP.objects.filter(rack=asset.rack_id):
        try: 
            validate_asset_location(
                asset.rack_id,
                assetcp.rack_position,
                assetcp.model.height,
                asset_id=assetcp.id
            )
        except LocationException:
            assetcp.asset_conflict_location = asset
            AssetCP.objects.filter(id=assetcp.id).update(asset_conflict_location=asset)
           

    # asset number conflict
    asset.asset_number_conflict.clear()
    AssetCP.objects.filter(
        Q(asset_number=asset.asset_number) & ~Q(related_asset_id=asset.id)
        ).update(asset_conflict_asset_number=asset)



def get_filtered_assets_for_cp(change_plan, data):
    assets, assetsCP = get_assets_for_cp(change_plan=change_plan)
    filtered_assets, filter_failure_response = get_filtered_query(
        assets,
        data,
    )
    if filter_failure_response:
        return (None, None, filter_failure_response)
    filtered_assetsCP, filter_failure_response = get_filtered_query(
        assetsCP,
        data,
    )
    if filter_failure_response:
        return (None, None, filter_failure_response)
    return (filtered_assets, filtered_assetsCP, None)


def sort_serialized_assets(all_assets, data):
    sorted_assets = all_assets
    if 'sort_by' in data:
        for sort in data['sort_by']:
            if (
                'field' in sort
                and 'ascending' in sort
                and isinstance(sort['field'], str)
                and isinstance(sort['ascending'], bool)
            ):
                sorted_assets.sort(
                    key=lambda i: i[sort['field']],
                    reverse=not sort['ascending'],
                )
    return sorted_assets


def get_page_of_serialized_assets(all_assets, query_params):
    page = int(query_params.get('page'))
    page_size = int(query_params.get('page_size'))
    start = (page - 1) * page_size
    end = page * page_size
    if start > len(all_assets):
        raise Exception("Page " + str(start) + " does not exist")
    elif end > len(all_assets):
        return all_assets[start:]
    else:
        return all_assets[start:end]


def get_many_assets_response_for_cp(request, change_plan):
    should_paginate = should_paginate_query(request.query_params)
    if should_paginate:
        page_failure_response = get_invalid_paginated_request_response(
            request.query_params
        )
        if page_failure_response:
            return page_failure_response

    assets, assetsCP, filter_failure_response = get_filtered_assets_for_cp(
        change_plan,
        request.data,
    )
    if filter_failure_response:
        return filter_failure_response
    asset_serializer = RecursiveAssetSerializer(
        assets,
        many=True,
    )
    assetCP_serializer = RecursiveAssetCPSerializer(
        assetsCP,
        many=True,
    )
    all_assets = asset_serializer.data + assetCP_serializer.data

    sorted_assets = sort_serialized_assets(all_assets, request.data)

    if should_paginate:
        try:
            assets_data = get_page_of_serialized_assets(
                sorted_assets,
                request.query_params,
            )
        except Exception as error:
            return JsonResponse(
                {
                    "failure_message":
                        Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                        "errors": str(error)
                },
                status=HTTPStatus.BAD_REQUEST,
            )
    else:
        assets_data = sorted_assets

    return JsonResponse(
        {"assets": assets_data},
        status=HTTPStatus.OK,
    )


def get_page_count_response_for_cp(request, change_plan):
    if (
        not request.query_params.get('page_size')
        or int(request.query_params.get('page_size')) <= 0
    ):
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                "errors": "Must specify positive integer page_size."
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(request.query_params.get('page_size'))
    assets, assetsCP, filter_failure_response = get_filtered_assets_for_cp(
        change_plan,
        request.data,
    )
    if filter_failure_response:
        return filter_failure_response
    count = assets.count() + assetsCP.count()
    page_count = math.ceil(count / page_size)
    return JsonResponse({"page_count": page_count})
