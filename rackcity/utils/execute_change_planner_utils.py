from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import (
    AddDecommissionedAssetSerializer,
    RecursiveAssetSerializer,
)
from rackcity.models import (
    Asset,
    NetworkPort,
    NetworkPortCP,
    PDUPort,
    PowerPort,
    PowerPortCP,
)
from rackcity.utils.errors_utils import (
    Status,
    parse_serializer_errors,
    parse_save_validation_error,
)


def get_updated_asset(asset_cp,chassis_live=None):
    created = False
    related_asset = asset_cp.related_asset
    if related_asset:
        updated_asset = related_asset
    else:
        updated_asset = Asset()
        created = True
    for field in Asset._meta.fields:
        if (
            field.name != "id"
            and field.name != "assetid_ptr" and field.name !="chassis"
        ):
            setattr(updated_asset, field.name, getattr(asset_cp, field.name))
    if chassis_live:
        updated_asset.chassis = chassis_live
    else:
        updated_asset.chassis = asset_cp.chassis
    # Assigns asset number, creates network & power ports on save
    updated_asset.save()
    if not related_asset:
        # If asset was created, put that in related_asset field (network ports)
        asset_cp.related_asset = updated_asset
        asset_cp.save()
    return updated_asset, created


def update_network_ports(updated_asset, asset_cp, change_plan):
    network_ports_cp = NetworkPortCP.objects.filter(
        change_plan=change_plan, asset=asset_cp,
    )
    for network_port_cp in network_ports_cp:
        network_port_to_update = NetworkPort.objects.get(
            asset=updated_asset, port_name=network_port_cp.port_name,
        )
        if network_port_cp.connected_port:
            destination_host = network_port_cp.connected_port.asset.related_asset
            if destination_host:
                destination_port_to_connect = NetworkPort.objects.get(
                    asset=destination_host,
                    port_name=network_port_cp.connected_port.port_name,
                )
                network_port_to_update.connected_port = destination_port_to_connect
                destination_port_to_connect.connected_port = network_port_to_update
                destination_port_to_connect.save()
        else:
            network_port_to_update.connected_port = None
        network_port_to_update.mac_address = network_port_cp.mac_address
        network_port_to_update.save()


def update_power_ports(updated_asset, asset_cp, change_plan):
    power_ports_cp = PowerPortCP.objects.filter(
        change_plan=change_plan, asset=asset_cp,
    )
    for power_port_cp in power_ports_cp:
        power_port_to_update = PowerPort.objects.get(
            asset=updated_asset, port_name=power_port_cp.port_name,
        )
        pdu_port_cp = power_port_cp.power_connection
        if pdu_port_cp:
            pdu_port_to_connect = PDUPort.objects.get(
                rack=pdu_port_cp.rack,
                left_right=pdu_port_cp.left_right,
                port_number=pdu_port_cp.port_number,
            )
            power_port_to_update.power_connection = pdu_port_to_connect
        else:
            power_port_to_update.power_connection = None
        power_port_to_update.save()


def decommission_asset_cp(updated_asset, asset_cp, change_plan):
    asset_data = RecursiveAssetSerializer(updated_asset).data
    asset_data["live_id"] = asset_data["id"]
    del asset_data["id"]
    asset_data["decommissioning_user"] = str(change_plan.owner)
    decommissioned_asset = AddDecommissionedAssetSerializer(data=asset_data)
    if not decommissioned_asset.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message": Status.INVALID_INPUT.value
                + parse_serializer_errors(decommissioned_asset.errors),
                "errors": str(decommissioned_asset.errors),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        decommissioned_asset.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.DECOMMISSION_ERROR.value
                + parse_save_validation_error(error, "Decommissioned Asset "),
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        updated_asset.delete()
