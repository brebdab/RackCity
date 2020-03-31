from django.core.exceptions import ObjectDoesNotExist
from rackcity.models import (
    Asset,
    AssetCP,
    NetworkPort,
    NetworkPortCP,
    PowerPort,
    PowerPortCP,
    PDUPort,
    PDUPortCP,
)
from rackcity.models.asset import get_assets_for_cp
from rackcity.utils.exceptions import (
    MacAddressException,
    NetworkConnectionException,
    PowerConnectionException,
)


def get_existing_network_port(port_name, asset_id, change_plan=None):
    try:
        if change_plan:
            network_port_cp = NetworkPortCP.objects.get(
                asset=asset_id, port_name=port_name, change_plan=change_plan
            )
            return network_port_cp
        else:
            network_port = NetworkPort.objects.get(
                asset=asset_id, port_name=port_name
            )
            return network_port
    except ObjectDoesNotExist:
        return None


def validate_network_connection_data(network_connection_data):
    if network_connection_data["source_port"] is None:
        return "Could not create connection because source port was not provided."
    port_name = network_connection_data["source_port"]
    if (
        (network_connection_data["destination_hostname"] is None)
        and (network_connection_data["destination_port"] is not None)
    ):
        return "Could not create connection on port '" + port_name + "' because no destination hostname was provided."
    elif (
        (network_connection_data["destination_hostname"] is not None)
        and (network_connection_data["destination_port"] is None)
    ):
        return "Could not create connection on port '" + port_name + "' because no destination port was provided."
    else:
        return None


def network_connection_data_has_destination(network_connection_data):
    return (
        (network_connection_data["destination_hostname"] is not None)
        and (network_connection_data["destination_port"] is not None)
    )


def copy_asset_to_new_asset_cp(asset_live, change_plan):
    # Copy existing asset to AssetCP table
    # asset_live = assets.get(hostname=hostname)
    asset_cp = AssetCP(related_asset=asset_live, change_plan=change_plan)
    for field in asset_live._meta.fields:
        if field.name != "id" and field.name != "assetid_ptr":
            setattr(asset_cp, field.name, getattr(asset_live, field.name))
    asset_cp.save()

    # Copy mac address values
    # Note: actual connections get made later in create_network_connections()
    network_ports_live = NetworkPort.objects.filter(asset=asset_live)
    for network_port_live in network_ports_live:
        network_port_cp = NetworkPortCP.objects.get(
            asset=asset_cp,
            port_name=network_port_live.port_name,
        )
        network_port_cp.mac_address = network_port_live.mac_address
        network_port_cp.save()

    # Copy over power connections
    power_ports_live = PowerPort.objects.filter(asset=asset_live)
    for power_port_live in power_ports_live:
        power_port_cp = PowerPortCP.objects.get(
            asset=asset_cp,
            port_name=power_port_live.port_name,
        )
        connected_pdu_live = power_port_live.power_connection
        if connected_pdu_live:
            try:
                connected_pdu_port_cp = PDUPortCP.objects.get(
                    rack=connected_pdu_live.rack,
                    left_right=connected_pdu_live.left_right,
                    port_number=connected_pdu_live.port_number,
                    change_plan=change_plan,
                )
            except ObjectDoesNotExist:
                connected_pdu_port_cp = PDUPortCP(change_plan=change_plan)
                for field in connected_pdu_live._meta.fields:
                    if field.name != "id":
                        setattr(
                            connected_pdu_port_cp,
                            field.name,
                            getattr(connected_pdu_live, field.name),
                        )
                connected_pdu_port_cp.save()
            power_port_cp.power_connection = connected_pdu_port_cp
            power_port_cp.save()

    return asset_cp


def handle_network_connection_delete_on_cp(port_name, asset_id, change_plan):
    # If connection being deleted was with a live asset, add that asset to the change plan
    asset_cp = AssetCP.objects.get(id=asset_id)
    if not asset_cp.related_asset:
        return
    asset_live = Asset.objects.get(id=asset_cp.related_asset_id)
    network_port_live = NetworkPort.objects.get(asset=asset_live, port_name=port_name)
    if network_port_live.connected_port:
        # Add destination asset to the change plan (and delete connection on change plan only)
        destination_port_live = NetworkPort.objects.get(
            id=network_port_live.connected_port_id
        )
        _ = copy_asset_to_new_asset_cp(destination_port_live, change_plan)
        # Copy over network connections for the new AssetCP
        destination_network_ports_live = NetworkPort.objects.filter(asset=destination_port_live)
        for destination_network_port_live in destination_network_ports_live:
            destination_network_port_cp = NetworkPortCP.objects.get(
                asset=asset_cp,
                port_name=network_port_live.port_name,
            )
            # Only copy the connection if it's not to the port being disconnected
            if (
                destination_network_port_live.connected_port
                and destination_network_port_live.connected_port.port_name != port_name
            ):
                destination_network_port_cp.connected_port = destination_network_port_live.connected_port
                destination_network_port_cp.save()


def get_destination_asset(destination_hostname, change_plan=None):
    try:
        if change_plan:
            assets, assets_cp = get_assets_for_cp(change_plan.id)
            if assets.filter(hostname=destination_hostname).exists():
                destination_asset = copy_asset_to_new_asset_cp(assets, destination_hostname, change_plan)
            else:
                destination_asset = assets_cp.get(hostname=destination_hostname, change_plan=change_plan)
        else:
            destination_asset = Asset.objects.get(hostname=destination_hostname)
    except ObjectDoesNotExist:
        return None
    else:
        return destination_asset


def get_destination_port(destination_asset, destination_port_name, change_plan=None):
    try:
        if change_plan:
            destination_port = NetworkPortCP.objects.get(
                asset=destination_asset,
                port_name=destination_port_name,
                change_plan=change_plan,
            )
        else:
            destination_port = NetworkPort.objects.get(
                asset=destination_asset,
                port_name=destination_port_name,
            )
    except ObjectDoesNotExist:
        return None
    else:
        return destination_port


def save_network_connections(asset_data, asset_id, change_plan=None):
    if ("network_connections" not in asset_data) or (not asset_data["network_connections"]):
        return
    network_connections = asset_data["network_connections"]
    failure_message = ""
    for network_connection in network_connections:
        error = validate_network_connection_data(network_connection)
        if error:
            failure_message += error
            continue
        port_name = network_connection["source_port"]
        network_port = get_existing_network_port(port_name, asset_id, change_plan=change_plan)
        if network_port is None:
            failure_message += "Port name '" + port_name + "' is not valid. "
            continue
        if not network_connection_data_has_destination(network_connection):
            # Delete network connection
            if change_plan:
                handle_network_connection_delete_on_cp(port_name, asset_id, change_plan)
            network_port.delete_network_connection()
        else:
            # Modify network connection
            destination_hostname = network_connection["destination_hostname"]
            destination_port_name = network_connection["destination_port"]
            destination_asset = get_destination_asset(destination_hostname, change_plan=change_plan)
            if destination_asset is None:
                failure_message += ("Asset with hostname '" + destination_hostname + "' does not exist. ")
                continue
            destination_port = get_destination_port(destination_asset, destination_port_name, change_plan=change_plan)
            if destination_port is None:
                failure_message += (
                    "Destination port '"
                    + destination_hostname
                    + ":"
                    + destination_port_name
                    + "' does not exist. "
                )
                continue
            try:
                network_port.create_network_connection(destination_port=destination_port)
            except Exception as error:
                failure_message += ("Could not save connection for port '" + port_name + "'. " + str(error))

    if failure_message:
        raise NetworkConnectionException(failure_message)


def save_power_connections(asset_data, asset_id, change_plan=None):
    if "power_connections" not in asset_data or not asset_data["power_connections"]:
        return
    power_connection_assignments = asset_data["power_connections"]
    failure_message = ""
    for port_name in power_connection_assignments.keys():
        try:
            if change_plan:
                power_port = PowerPortCP.objects.get(
                    asset=asset_id, port_name=port_name, change_plan=change_plan.id
                )
            else:
                power_port = PowerPort.objects.get(asset=asset_id, port_name=port_name)
        except ObjectDoesNotExist:
            failure_message += (
                "Power port '" + port_name + "' does not exist on this asset. "
            )
        else:
            power_connection_data = power_connection_assignments[port_name]
            if change_plan:
                asset = AssetCP.objects.get(id=asset_id)
            else:
                asset = Asset.objects.get(id=asset_id)
            if not power_connection_data:
                power_port.power_connection = None
                power_port.save()
                continue
            try:
                pdu_port_master = PDUPort.objects.get(
                    rack=asset.rack,
                    left_right=power_connection_data["left_right"],
                    port_number=power_connection_data["port_number"],
                )
                pdu_port = pdu_port_master
                if change_plan:
                    if PDUPortCP.objects.filter(
                        rack=asset.rack,
                        left_right=power_connection_data["left_right"],
                        port_number=power_connection_data["port_number"],
                        change_plan=change_plan,
                    ).exists():
                        pdu_port = PDUPortCP.objects.get(
                            rack=asset.rack,
                            left_right=power_connection_data["left_right"],
                            port_number=power_connection_data["port_number"],
                            change_plan=change_plan,
                        )
                    else:
                        pdu_port = PDUPortCP(change_plan=change_plan)
                        for field in pdu_port_master._meta.fields:
                            if field.name != "id":
                                setattr(
                                    pdu_port,
                                    field.name,
                                    getattr(pdu_port_master, field.name),
                                )
                        pdu_port.save()

            except ObjectDoesNotExist:
                failure_message += (
                    "PDU port '"
                    + power_connection_data["left_right"]
                    + str(power_connection_data["port_number"])
                    + "' does not exist. "
                )
            else:
                power_port.power_connection = pdu_port
                try:
                    power_port.save()
                except Exception as error:
                    failure_message += (
                        "Power connection on port '"
                        + port_name
                        + "' of asset '"
                        + str(asset.asset_number)
                        + "' was not valid. "
                    )
    if failure_message:
        raise PowerConnectionException(failure_message)


def save_mac_addresses(asset_data, asset_id, change_plan=None):
    if "mac_addresses" not in asset_data or not asset_data["mac_addresses"]:
        return
    mac_address_assignments = asset_data["mac_addresses"]
    failure_message = ""
    for port_name in mac_address_assignments.keys():
        try:
            if change_plan:
                network_port = NetworkPortCP.objects.get(
                    asset=asset_id, port_name=port_name, change_plan=change_plan
                )
            else:
                network_port = NetworkPort.objects.get(
                    asset=asset_id, port_name=port_name
                )
        except ObjectDoesNotExist:
            failure_message += "Port name '" + port_name + "' is not valid. "
        else:
            mac_address = mac_address_assignments[port_name]
            network_port.mac_address = mac_address
            try:
                network_port.save()
            except Exception:
                failure_message += "Mac address '" + mac_address + "' is not valid. "
    if failure_message:
        raise MacAddressException(failure_message)
