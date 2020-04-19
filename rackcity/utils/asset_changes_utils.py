from django.core.exceptions import ObjectDoesNotExist

from rackcity.models import Asset, NetworkPortCP, NetworkPort, PowerPortCP, PowerPort


def get_changes_on_asset(asset, asset_cp):
    fields = [field.name for field in Asset._meta.fields]
    changes = []
    for field in fields:
        if field == "id" or field == "assetid_ptr":
            continue
        if field == "chassis":
            chassis_live = asset.chassis
            chassis_cp = asset_cp.chassis
            if chassis_live and (chassis_live != chassis_cp.related_asset):
                changes.append("chassis")
        elif getattr(asset, field) != getattr(asset_cp, field):
            changes.append(field)
    if network_connections_have_changed(asset, asset_cp):
        changes.append("network_connections")
    if power_connections_have_changed(asset, asset_cp):
        changes.append("power_connections")
    if mac_addresses_have_changed(asset, asset_cp):
        changes.append("mac_addresses")
    return changes


def mac_addresses_have_changed(asset, asset_cp):
    network_ports_cp = NetworkPortCP.objects.filter(asset=asset_cp)
    network_ports = NetworkPort.objects.filter(asset=asset)
    for network_port_cp in network_ports_cp:
        try:
            network_port = network_ports.get(port_name=network_port_cp.port_name,)
            if network_port.mac_address != network_port_cp.mac_address:
                return True
        except ObjectDoesNotExist:
            continue
        if network_port.mac_address != network_port_cp.mac_address:
            return True
    return False


def network_connections_have_changed(asset, asset_cp):
    network_ports_cp = NetworkPortCP.objects.filter(asset=asset_cp)
    network_ports = NetworkPort.objects.filter(asset=asset)
    for network_port_cp in network_ports_cp:
        # Get NetworkPort connected to this port live
        try:
            network_port = network_ports.get(port_name=network_port_cp.port_name,)
        except ObjectDoesNotExist:
            continue
        connected_port_live = network_port.connected_port
        connected_port_cp = network_port_cp.connected_port
        if (not connected_port_live and connected_port_cp) or (
            connected_port_live and not connected_port_cp
        ):
            return True

        live_connected_port_cp = None
        if connected_port_cp:
            related_asset = connected_port_cp.asset.related_asset
            if related_asset:
                try:
                    live_connected_port_cp = NetworkPort.objects.get(
                        asset=related_asset, port_name=connected_port_cp.port_name,
                    )
                except ObjectDoesNotExist:
                    live_connected_port_cp = None
        # Check for match
        if connected_port_live != live_connected_port_cp:
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
            power_port_live = power_ports.get(port_name=power_port_cp.port_name)
        except ObjectDoesNotExist:
            continue
        pdu_port_live = power_port_live.power_connection
        # Check for match
        if pdu_port_cp is None and pdu_port_live is None:
            continue
        if (pdu_port_cp is None and pdu_port_live) or (
            pdu_port_cp and pdu_port_live is None
        ):
            return True
        if (
            pdu_port_cp.port_number != pdu_port_live.port_number
            or pdu_port_cp.left_right != pdu_port_live.left_right
            or pdu_port_cp.rack != pdu_port_live.rack
        ):
            return True
    return False
