from django.core.exceptions import ObjectDoesNotExist, ValidationError
from rackcity.models import (
    Asset,
    AssetCP,
    ITModel,
    NetworkPort,
    NetworkPortCP,
    PowerPort,
    PowerPortCP,
    PDUPort,
    PDUPortCP,
    Rack,
)
from rackcity.models.asset import get_assets_for_cp, validate_asset_number_uniqueness
from rackcity.utils.errors_utils import parse_save_validation_error
from rackcity.utils.exceptions import (
    MacAddressException,
    NetworkConnectionException,
    PowerConnectionException,
)
from rackcity.utils.log_utils import log_network_action


def get_existing_network_port(port_name, asset_id, change_plan=None):
    """
    If live, returns NetworkPort corresponding to port_name and asset_id. If change plan,
    returns NetworkPortCP corresponding to port_name, asset_id, and change_plan. If object
    does not exist in either case, returns None.
    """
    try:
        if change_plan:
            network_port = NetworkPortCP.objects.get(
                asset=asset_id, port_name=port_name, change_plan=change_plan
            )
        else:
            network_port = NetworkPort.objects.get(asset=asset_id, port_name=port_name)
    except ObjectDoesNotExist:
        return None
    else:
        return network_port


def get_existing_power_port(port_name, asset_id, change_plan=None):
    try:
        if change_plan:
            power_port = PowerPortCP.objects.get(
                asset=asset_id, port_name=port_name, change_plan=change_plan.id
            )
        else:
            power_port = PowerPort.objects.get(asset=asset_id, port_name=port_name)
    except ObjectDoesNotExist:
        return None
    else:
        return power_port


def does_asset_exist(asset_id, change_plan):
    return (
        AssetCP.objects.filter(id=asset_id, change_plan=change_plan.id).exists()
    ) or (Asset.objects.filter(id=asset_id).exists())


def get_or_create_asset_with_hostname(hostname, change_plan=None):
    """
    If live, returns Asset corresponding to hostname. If change plan, checks if an Asset
    with that hostname exists; if so, it copies that Asset to the AssetCP table and returns
    the newly created AssetCP; if it does not already exist as an Asset, then it returns
    the AssetCP corresponding to hostname. If the asset object being fetched does not exist,
    then None is returned.
    """
    try:
        if change_plan:
            assets, assets_cp = get_assets_for_cp(change_plan.id)
            if assets.filter(hostname=hostname).exists():
                asset_live = assets.get(hostname=hostname)
                asset = copy_asset_to_new_asset_cp(asset_live, change_plan)
            else:
                asset = assets_cp.get(hostname=hostname, change_plan=change_plan)
        else:
            asset = Asset.objects.get(hostname=hostname)
    except ObjectDoesNotExist:
        return None
    else:
        return asset


def get_or_create_pdu_port(asset, power_connection_data, change_plan=None):
    try:
        pdu_port_live = PDUPort.objects.get(
            rack=asset.rack,
            left_right=power_connection_data["left_right"],
            port_number=power_connection_data["port_number"],
        )
    except ObjectDoesNotExist:
        return None
    if change_plan:
        try:
            pdu_port = PDUPortCP.objects.get(
                rack=asset.rack,
                left_right=power_connection_data["left_right"],
                port_number=power_connection_data["port_number"],
                change_plan=change_plan,
            )
            return pdu_port
        except ObjectDoesNotExist:
            pdu_port = PDUPortCP(change_plan=change_plan)
            for field in pdu_port_live._meta.fields:
                if field.name != "id":
                    setattr(pdu_port, field.name, getattr(pdu_port_live, field.name))
            pdu_port.save()
            return pdu_port
    else:
        return pdu_port_live


def copy_asset_to_new_asset_cp(asset_live, change_plan):
    """
    Copies an existing Asset (asset_live) to the AssetCP table, assigning
    the given change_plan. Copies all Asset fields, network port mac addresses,
    and power connections (but not network connections).
    """
    # Copy existing asset to AssetCP table
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
            asset=asset_cp, port_name=network_port_live.port_name,
        )
        network_port_cp.mac_address = network_port_live.mac_address
        network_port_cp.save()

    # Copy over power connections
    power_ports_live = PowerPort.objects.filter(asset=asset_live)
    for power_port_live in power_ports_live:
        power_port_cp = PowerPortCP.objects.get(
            asset=asset_cp, port_name=power_port_live.port_name,
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


def validate_network_connection_data(network_connection_data):
    """
    Validates that network_connection_data contains valid values for source_port,
    destination_hostname, and destination_port. Returns error message if invalid, and
    None if valid.
    """
    if network_connection_data["source_port"] is None:
        return "Could not create connection because source port was not provided."
    port_name = network_connection_data["source_port"]
    if (network_connection_data["destination_hostname"] is None) and (
        network_connection_data["destination_port"] is not None
    ):
        return (
            "Could not create connection on port '"
            + port_name
            + "' because no destination hostname was provided."
        )
    elif (network_connection_data["destination_hostname"] is not None) and (
        network_connection_data["destination_port"] is None
    ):
        return (
            "Could not create connection on port '"
            + port_name
            + "' because no destination port was provided."
        )
    else:
        return None


def network_connection_data_has_destination(network_connection_data):
    """
    Returns True if network_connection_data contains non-null destination_hostname
    and destination_port, returns False otherwise.
    """
    return (network_connection_data["destination_hostname"] is not None) and (
        network_connection_data["destination_port"] is not None
    )


def handle_network_connection_delete_on_cp(port_name, asset_id, change_plan):
    """
    Adds any Asset that was connected to the AssetCP with asset_id via the network
    connection being deleted to the AssetCP table, and updates its network connection.
    """
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
        destination_network_ports_live = NetworkPort.objects.filter(
            asset=destination_port_live
        )
        for destination_network_port_live in destination_network_ports_live:
            destination_network_port_cp = NetworkPortCP.objects.get(
                asset=asset_cp, port_name=network_port_live.port_name,
            )
            # Only copy the connection if it's not to the port being disconnected
            if (
                destination_network_port_live.connected_port
                and destination_network_port_live.connected_port.port_name != port_name
            ):
                destination_network_port_cp.connected_port = (
                    destination_network_port_live.connected_port
                )
                destination_network_port_cp.save()


def save_network_connections(asset_data, asset_id, change_plan=None):
    if ("network_connections" not in asset_data) or (
        not asset_data["network_connections"]
    ):
        return
    network_connections = asset_data["network_connections"]
    failure_message = ""
    for network_connection in network_connections:
        error = validate_network_connection_data(network_connection)
        if error:
            failure_message += error
            continue
        port_name = network_connection["source_port"]
        network_port = get_existing_network_port(
            port_name, asset_id, change_plan=change_plan
        )
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
            destination_asset = get_or_create_asset_with_hostname(
                destination_hostname, change_plan=change_plan
            )
            if destination_asset is None:
                failure_message += (
                    "Asset with hostname '"
                    + destination_hostname
                    + "' does not exist. "
                )
                continue
            destination_port = get_existing_network_port(
                destination_port_name, destination_asset.id, change_plan=change_plan
            )
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
                network_port.create_network_connection(
                    destination_port=destination_port
                )
            except Exception as error:
                failure_message += (
                    "Could not save connection for port '"
                    + port_name
                    + "'. "
                    + str(error)
                )
    if failure_message:
        raise NetworkConnectionException(failure_message)


def save_power_connections(asset_data, asset_id, change_plan=None):
    if ("power_connections" not in asset_data) or (not asset_data["power_connections"]):
        return
    power_connection_assignments = asset_data["power_connections"]
    failure_message = ""
    for port_name in power_connection_assignments.keys():
        power_port = get_existing_power_port(
            port_name, asset_id, change_plan=change_plan
        )
        if power_port is None:
            failure_message += (
                "Power port '" + port_name + "' does not exist on this asset. "
            )
            continue
        power_connection_data = power_connection_assignments[port_name]
        if not power_connection_data:
            power_port.power_connection = None
            power_port.save()
            continue
        if change_plan:
            asset = AssetCP.objects.get(id=asset_id)
        else:
            asset = Asset.objects.get(id=asset_id)
        pdu_port = get_or_create_pdu_port(
            asset, power_connection_data, change_plan=change_plan
        )
        if pdu_port is None:
            failure_message += (
                "PDU port '"
                + power_connection_data["left_right"]
                + str(power_connection_data["port_number"])
                + "' does not exist. "
            )
            continue
        power_port.power_connection = pdu_port
        try:
            power_port.save()
        except Exception:
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
        network_port = get_existing_network_port(
            port_name, asset_id, change_plan=change_plan
        )
        if not network_port:
            failure_message += "Port name '" + port_name + "' is not valid. "
            continue
        mac_address = mac_address_assignments[port_name]
        network_port.mac_address = mac_address
        try:
            network_port.save()
        except Exception:
            failure_message += "Mac address '" + mac_address + "' is not valid. "
    if failure_message:
        raise MacAddressException(failure_message)


def save_all_connection_data(data, asset, user, change_plan=None):
    warning_message = ""
    try:
        save_mac_addresses(asset_data=data, asset_id=asset.id, change_plan=change_plan)
    except MacAddressException as error:
        warning_message += "Some mac addresses couldn't be saved. " + str(error)
    try:
        save_power_connections(
            asset_data=data, asset_id=asset.id, change_plan=change_plan
        )
    except PowerConnectionException as error:
        warning_message += "Some power connections couldn't be saved. " + str(error)
    try:
        save_network_connections(
            asset_data=data, asset_id=asset.id, change_plan=change_plan
        )
        if not change_plan:
            log_network_action(user, asset)
    except NetworkConnectionException as error:
        warning_message += "Some network connections couldn't be saved. " + str(error)
    return warning_message


def save_all_field_data_live(data, asset):
    asset_id = data["id"]
    for field in data.keys():
        if field == "model":
            value = ITModel.objects.get(id=data[field])
        elif field == "rack":
            value = Rack.objects.get(id=data[field])
        elif field == "hostname" and data["hostname"]:
            assets_with_hostname = Asset.objects.filter(hostname__iexact=data[field])
            if len(assets_with_hostname) > 0 and assets_with_hostname[0].id != asset_id:
                return (
                    "Asset with hostname '" + data[field].lower() + "' already exists."
                )
            value = data[field]
        elif field == "asset_number":
            assets_with_asset_number = Asset.objects.filter(asset_number=data[field])
            if (
                data[field]
                and len(assets_with_asset_number) > 0
                and assets_with_asset_number[0].id != asset.id
            ):
                return (
                    "Asset with asset number '" + str(data[field]) + "' already exists."
                )
            value = data[field]
        else:
            value = data[field]

        if field is not "id":
            setattr(asset, field, value)
    try:
        asset.save()
    except Exception as error:
        return parse_save_validation_error(error, "Asset")


def save_all_field_data_cp(data, asset, change_plan, create_asset_cp):
    asset_id = data["id"]
    for field in data.keys():
        if field == "model":
            value = ITModel.objects.get(id=data[field])
        elif field == "rack":
            value = Rack.objects.get(id=data[field])
        elif field == "hostname" and data["hostname"]:
            assets, assets_cp = get_assets_for_cp(change_plan.id)
            assets_with_hostname = assets.filter(hostname__iexact=data[field])
            if not (
                len(assets_with_hostname) > 0 and assets_with_hostname[0].id != asset_id
            ):
                assets_with_hostname = assets_cp.filter(hostname__iexact=data[field])
            if len(assets_with_hostname) > 0 and assets_with_hostname[0].id != asset_id:
                return (
                    None,
                    "Asset with hostname '" + data[field].lower() + "' already exists.",
                )
            value = data[field]
        elif field == "asset_number":
            if create_asset_cp:
                related_asset = asset
            else:
                related_asset = asset.related_asset
            try:
                validate_asset_number_uniqueness(
                    data[field], asset_id, change_plan, related_asset,
                )
            except ValidationError:
                return (
                    None,
                    "Asset with asset number '"
                    + str(data[field])
                    + "' already exists.",
                )

            value = data[field]
        else:
            value = data[field]

        if field is not "id":
            setattr(asset, field, value)

    try:
        if create_asset_cp:
            asset_cp = copy_asset_to_new_asset_cp(asset, change_plan)
            asset_cp.save()
            return asset_cp, None

        else:
            asset.save()
            return asset, None
    except Exception as error:
        return None, parse_save_validation_error(error, "Asset")
