from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.http import JsonResponse
from enum import Enum
from http import HTTPStatus
import math
from rackcity.api.serializers import (
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
)
from rackcity.models.asset import get_assets_for_cp
from rackcity.models import (
    Asset,
    AssetCP,
    DecommissionedAsset,
    NetworkPort,
    NetworkPortCP,
    PowerPort,
    PowerPortCP,
)
from rackcity.utils.errors_utils import Status, GenericFailure
from rackcity.utils.query_utils import (
    get_filtered_query,
    get_invalid_paginated_request_response,
    should_paginate_query,
)
from rackcity.utils.rackcity_utils import (
    validate_asset_location,
    LocationException,
)


class ModificationType(Enum):
    MODIFY = 'Modify'
    CREATE = 'Create'
    DECOMMISSION = 'Decommission'


@receiver(pre_delete, sender=Asset)
def mark_delete_conflicts_cp(sender, **kwargs):
    """
    Mark conflict for related assets on change plan when an asset is
    deleted live. This method is automatically called before Asset delete.
    """
    deleted_asset = kwargs.get("instance")
    AssetCP.objects.filter(
        related_asset=deleted_asset,
        change_plan__execution_time=None,
    ).update(is_conflict=True)


@receiver(post_save, sender=Asset)
def detect_conflicts_cp(sender, **kwargs):
    """
    Mark conflict for affected assets on change plan when an asset is
    modified live. This method is automatically called after Asset save.

    fields: sender, instance, created, raw, using, update_fields
    asset is a related asset of assetCP
    """
    asset = kwargs.get("instance")
    related_assets_cp = AssetCP.objects.filter(
        related_asset=asset.id,
        change_plan__execution_time=None,
    )
    for related_asset_cp in related_assets_cp:
        related_asset_cp.is_conflict = True
        related_asset_cp.save()

    # asset hostname conflicts with hostnames on an active assetCP
    asset.hostname_conflict.clear()
    AssetCP.objects.filter(
        Q(hostname=asset.hostname)
        & ~Q(related_asset=asset.id)
        & Q(change_plan__execution_time=None)
    ).update(asset_conflict_hostname=asset)

    # asset rack location conflicts with an active assetCP
    asset.location_conflict.clear()
    for assetcp in AssetCP.objects.filter(
        Q(rack=asset.rack_id)
        & ~Q(related_asset=asset.id)
        & Q(change_plan__execution_time=None)
    ):
        try:
            validate_asset_location(
                asset.rack_id,
                assetcp.rack_position,
                assetcp.model.height,
                asset_id=assetcp.id
            )
        except LocationException:
            assetcp.asset_conflict_location = asset
            AssetCP.objects.filter(id=assetcp.id).update(
                asset_conflict_location=asset)

    # asset number conflicts with an active assetCP
    asset.asset_number_conflict.clear()
    AssetCP.objects.filter(
        Q(asset_number=asset.asset_number)
        & ~Q(related_asset_id=asset.id)
        & Q(change_plan__execution_time=None)
    ).update(asset_conflict_asset_number=asset)


def get_filtered_decommissioned_assets_for_cp(change_plan, data):
    decommissioned_assets = DecommissionedAsset.objects.all()
    decomissioned_assets_cp = AssetCP.objects.filter(
        change_plan=change_plan,
        is_decommissioned=True,
    )
    decommissioned_assets, filter_failure_response = get_filtered_query(
        decommissioned_assets,
        data,
    )
    if filter_failure_response:
        return (None, None, filter_failure_response)
    decomissioned_assets_cp, filter_failure_response = get_filtered_query(
        decomissioned_assets_cp,
        data,
    )
    if filter_failure_response:
        return (None, None, filter_failure_response)
    return (decommissioned_assets, decomissioned_assets_cp, None)


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


def get_many_assets_response_for_cp(
    request,
    change_plan,
    decommissioned=False
):
    should_paginate = should_paginate_query(request.query_params)
    if should_paginate:
        page_failure_response = get_invalid_paginated_request_response(
            request.query_params
        )
        if page_failure_response:
            return page_failure_response

    if not decommissioned:
        assets, assetsCP, filter_failure_response = \
            get_filtered_assets_for_cp(
                change_plan,
                request.data,
            )
        if filter_failure_response:
            return filter_failure_response
    else:
        assets, assetsCP, filter_failure_response = \
            get_filtered_decommissioned_assets_for_cp(
                change_plan,
                request.data,
            )

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


def get_page_count_response_for_decommissioned_cp(request, change_plan):
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
    decommissioned_assets = DecommissionedAsset.objects.all()
    decommissioned_assets_cp = AssetCP.objects.filter(
        change_plan=change_plan,
        is_decommissioned=True,
    )
    decommissioned_assets, filter_failure_response = get_filtered_query(
        decommissioned_assets,
        request.data,
    )
    if filter_failure_response:
        return filter_failure_response
    decommissioned_assets_cp, filter_failure_response = get_filtered_query(
        decommissioned_assets_cp,
        request.data,
    )
    if filter_failure_response:
        return filter_failure_response
    count = decommissioned_assets.count() + decommissioned_assets_cp.count()
    page_count = math.ceil(count / page_size)
    return JsonResponse({"page_count": page_count})


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


def network_connections_have_changed(asset, asset_cp):
    network_ports_cp = NetworkPortCP.objects.filter(asset=asset_cp)
    network_ports = NetworkPort.objects.filter(asset=asset)
    for network_port_cp in network_ports_cp:
        # Get NetworkPort connected to this port live
        try:
            network_port = network_ports.get(
                port_name=network_port_cp.port_name,
            )
        except ObjectDoesNotExist:
            continue
        connected_port_live = network_port.connected_port
        # Get NetworkPort associated with the NetworkPortCP connected to this port live
        cp_connected_port_in_cp = network_port_cp.connected_port
        real_connected_port_in_cp = None
        if cp_connected_port_in_cp:
            related_asset = cp_connected_port_in_cp.asset.related_asset
            if related_asset:
                try:
                    real_connected_port_in_cp = NetworkPort.objects.get(
                        asset=related_asset,
                        port_name=cp_connected_port_in_cp.port_name,
                    )
                except ObjectDoesNotExist:
                    real_connected_port_in_cp = None
        # Check for match
        if connected_port_live != real_connected_port_in_cp:
            return True
    return False


def power_connections_have_changed(asset, asset_cp):
    power_ports_cp = PowerPortCP.objects.filter(asset=asset_cp)
    power_ports = PowerPort.objects.filter(asset=asset)
    for power_port_cp in power_ports_cp:
        # Get PDUPortCP corresponding to this CP connection
        pdu_port_cp = power_port_cp.power_connection
        # Get PDUPort corresponding to this live connection
        try:
            power_port_live = power_ports.get(
                port_name=power_port_cp.port_name
            )
        except ObjectDoesNotExist:
            continue
        pdu_port_live = power_port_live.power_connection
        # Check for match
        if (pdu_port_cp is None and pdu_port_live is None):
            continue
        if (
            (pdu_port_cp is None and pdu_port_live)
            or (pdu_port_cp and pdu_port_live is None)
        ):
            return True
        if (
            pdu_port_cp.port_number != pdu_port_live.port_number
            or pdu_port_cp.left_right != pdu_port_live.left_right
            or pdu_port_cp.rack != pdu_port_live.rack
        ):
            return True
    return False


def get_changes_on_asset(asset, asset_cp):
    fields = [field.name for field in Asset._meta.fields]
    changes = []
    for field in fields:
        if getattr(asset, field) != getattr(asset_cp, field):
            changes.append(field)
    if network_connections_have_changed(asset, asset_cp):
        changes.append('network_connections')
    if power_connections_have_changed(asset, asset_cp):
        changes.append('power_connections')
    return changes


def get_cp_modification_conflicts(asset_cp):
    conflicts = []
    nonresolvable_message = "This conflict cannot be resolved; the " + \
        "related changes need to be removed from your change plan."
    conflicting_asset_message_1 = "Due to more recent live changes, " + \
        "your change plan version of this asset's "
    conflicting_asset_message_2 = " now conflicts with a live asset. "
    if asset_cp.is_conflict and asset_cp.related_asset is None:
        conflicts.append({
            "conflict_message":
                "This asset has been deleted live. " + nonresolvable_message
        })
    if asset_cp.asset_conflict_hostname:
        conflicts.append({
            "conflict_message":
                conflicting_asset_message_1 + "hostname" +
                conflicting_asset_message_2 + nonresolvable_message,
            "conflicting_asset": asset_cp.asset_conflict_hostname.id,
            "conflict_resolvable": False,
        })
    if asset_cp.asset_conflict_asset_number:
        conflicts.append({
            "conflict_message":
                conflicting_asset_message_1 + "asset number" +
                conflicting_asset_message_2 + nonresolvable_message,
            "conflicting_asset": asset_cp.asset_conflict_asset_number.id,
            "conflict_resolvable": False,
        })
    if asset_cp.asset_conflict_location:
        conflicts.append({
            "conflict_message":
                conflicting_asset_message_1 + "rack location" +
                conflicting_asset_message_2 + nonresolvable_message,
            "conflicting_asset": asset_cp.asset_conflict_location.id,
            "conflict_resolvable": False,
        })
    deleted_relation_message = " associated with this asset has been deleted. "
    if asset_cp.model is None:
        conflicts.append({
            "conflict_message":
                "The model" + deleted_relation_message + nonresolvable_message,
            "conflicting_asset": None,
            "conflict_resolvable": False,
        })
    if asset_cp.rack is None:
        conflicts.append({
            "conflict_message":
                "The rack" + deleted_relation_message + nonresolvable_message,
            "conflicting_asset": None,
            "conflict_resolvable": False,
        })
    if asset_cp.related_decommissioned_asset:
        conflicts.append({
            "conflict_message":
                "This asset has been decommissioned in a live change. " +
                nonresolvable_message,
            "conflicting_asset": None,
            "conflict_resolvable": False,
        })
    if len(conflicts) == 0:
        if asset_cp.is_conflict:
            conflicts.append({
                "conflict_message":
                    "Live changes have been made to this asset since your " +
                    "latest change planner modification. This conflict " +
                    "needs to be resolved. Please select which version " +
                    "you would like to keep.",
                "conflicting_asset": None,
                "conflict_resolvable": True,
            })
    if len(conflicts) == 0:
        return None
    else:
        return conflicts


def get_location_detail(asset):
    return " at rack " + asset.rack.datacenter.abbreviation + " " + \
        asset.rack.row_letter + str(asset.rack.rack_num) + ", position " + \
        str(asset.rack_position)


def get_modifications_in_cp(change_plan):
    assets_cp = AssetCP.objects.filter(change_plan=change_plan)
    modifications = []
    for asset_cp in assets_cp:
        assetCP_data = RecursiveAssetCPSerializer(asset_cp).data
        related_asset = asset_cp.related_asset
        if related_asset:
            asset_data = RecursiveAssetSerializer(related_asset).data
            changes = get_changes_on_asset(related_asset, asset_cp)
        else:
            asset_data = None
            changes = None
        if asset_cp.is_decommissioned:
            modification_type = ModificationType.DECOMMISSION
            title = "Decommission asset"
            if asset_cp.asset_number:
                title += " " + str(asset_cp.asset_number)
            if asset_cp.rack:
                title += get_location_detail(asset_cp)
        elif related_asset or (asset_cp.is_conflict and related_asset is None):
            modification_type = ModificationType.MODIFY
            if related_asset:
                title = "Modify asset " + str(related_asset.asset_number) + \
                    get_location_detail(related_asset)
            else:
                title = "Modify asset"
        else:
            modification_type = ModificationType.CREATE
            title = "Create asset"
            if asset_cp.asset_number:
                title += " " + str(asset_cp.asset_number)
            if asset_cp.rack:
                title += get_location_detail(asset_cp)
            asset_data = None
        modifications.append({
            "title": title,
            "type": modification_type.value,
            "asset": asset_data,
            "asset_cp": assetCP_data,
            "conflicts": get_cp_modification_conflicts(asset_cp),
            "changes": changes,
        })
    return modifications


def asset_cp_has_conflicts(asset_cp):
    return (
        asset_cp.is_conflict
        or asset_cp.asset_conflict_hostname
        or asset_cp.asset_conflict_asset_number
        or asset_cp.asset_conflict_location
        or asset_cp.related_decommissioned_asset
        or asset_cp.model is None
        or asset_cp.rack is None
    )


def get_cp_already_executed_response(change_plan):
    if change_plan.execution_time:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "Executed change plans are read only.",
                "errors":
                    "Change plan with id=" + str(change_plan.id) + " "
                    "was executed on " + str(change_plan.execution_time)

            },
            status=HTTPStatus.BAD_REQUEST
        )
