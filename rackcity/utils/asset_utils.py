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


def save_network_connections(asset_data, asset_id, change_plan=None):
    if ("network_connections" not in asset_data) or (not asset_data["network_connections"]):
        return
    network_connections = asset_data["network_connections"]
    failure_message = ""
    for network_connection in network_connections:
        port_name = network_connection["source_port"]
        network_port = get_existing_network_port(port_name, asset_id, change_plan=change_plan)
        if network_port is None:
            failure_message += "Port name '" + port_name + "' is not valid. "
            continue
        
        if (
            not network_connection["destination_hostname"]
            and not network_connection["destination_port"]
        ):

            if change_plan:
                # need to add deleted connection's asset to asset change plan
                asset_cp = AssetCP.objects.get(id=asset_id)
                if asset_cp.related_asset_id:
                    asset_live = Asset.objects.get(id=asset_cp.related_asset_id)
                    network_port_live = NetworkPort.objects.get(
                        asset=asset_live, port_name=port_name
                    )
                    if network_port_live.connected_port:
                        destination_port_live = NetworkPort.objects.filter(
                            id=network_port_live.connected_port_id
                        )[0]
                        destination_asset_live = Asset.objects.get(
                            id=destination_port_live.asset_id
                        )
                        destination_asset_cp = AssetCP(
                            related_asset=destination_asset_live,
                            change_plan=change_plan,
                        )
                    # add destination asset to AssetCPTable
                    for field in destination_asset_live._meta.fields:
                        if field.name != "id" and field.name != "assetid_ptr":
                            setattr(
                                destination_asset_cp,
                                field.name,
                                getattr(destination_asset_live, field.name),
                            )

                    destination_asset_cp.save()

                    # Destination asset has been added to AssetCP, but its
                    # network ports are empty (no connections/mac
                    # addresses) get the network ports from the live asset
                    dest_network_ports_live = NetworkPort.objects.filter(
                        asset=destination_asset_live
                    )
                    for dest_network_port_live in dest_network_ports_live:
                        # for each port, copy over mac address values
                        dest_network_port_cp = NetworkPortCP.objects.get(
                            asset=destination_asset_cp,
                            port_name=dest_network_port_live.port_name,
                        )
                        dest_network_port_cp.mac_address = (
                            dest_network_port_live.mac_address
                        )
                        # also copy over the connected_port if there 1. is
                        # a connection and 2. is not the port that is being
                        # deleted in this PR
                        if dest_network_port_live.connected_port and not (
                            dest_network_port_live.connected_port.port_name
                            == port_name
                        ):
                            dest_network_port_cp.connected_port = (
                                dest_network_port_live.connected_port
                            )
                        dest_network_port_cp.save()
                    # same dealio with power ports
                    dest_power_ports_live = PowerPort.objects.filter(
                        asset=destination_asset_live
                    )
                    for dest_power_port_live in dest_power_ports_live:
                        dest_power_port_cp = PowerPortCP.objects.get(
                            asset=destination_asset_cp,
                            port_name=dest_power_port_live.port_name,
                        )
                        dest_pdu_live = dest_power_port_live.power_connection
                        # if the live power port had a pdu connection,
                        # create/update the PDUs on PDUCP
                        if dest_pdu_live:
                            if PDUPortCP.objects.filter(
                                rack=dest_pdu_live.rack,
                                left_right=dest_pdu_live.left_right,
                                port_number=dest_pdu_live.port_number,
                                change_plan=change_plan,
                            ).exists():
                                pdu_port = PDUPortCP.objects.filter(
                                    rack=dest_pdu_live.rack,
                                    left_right=dest_pdu_live.left_right,
                                    port_number=dest_pdu_live.port_number,
                                    change_plan=change_plan,
                                )
                            else:
                                pdu_port = PDUPortCP(change_plan=change_plan)
                                for field in dest_pdu_live._meta.fields:
                                    if field.name != "id":
                                        setattr(
                                            pdu_port,
                                            field.name,
                                            getattr(dest_pdu_live, field.name,),
                                        )
                                pdu_port.save()
                            dest_power_port_cp.power_connection = pdu_port
                            dest_power_port_cp.save()

            network_port.delete_network_connection()

            continue
        if not network_connection["destination_hostname"]:
            failure_message += (
                "Could not create connection on port '"
                + port_name
                + "' because no destination hostname was provided."
            )
            continue
        if not network_connection["destination_port"]:
            failure_message += (
                "Could not create connection on port '"
                + port_name
                + "' because no destination port was provided."
            )
            continue
        try:
            if change_plan:
                assets, assets_cp = get_assets_for_cp(change_plan.id)
                if assets.filter(
                    hostname=network_connection["destination_hostname"]
                ).exists():
                    destination_asset = assets.get(
                        hostname=network_connection["destination_hostname"]
                    )
                    asset_cp = AssetCP(
                        related_asset=destination_asset, change_plan=change_plan
                    )
                    # add destination asset to AssetCPTable
                    for field in destination_asset._meta.fields:
                        if field.name != "id" and field.name != "assetid_ptr":
                            setattr(
                                asset_cp,
                                field.name,
                                getattr(destination_asset, field.name),
                            )
                    asset_cp.save()
                    # copy over mac address values, the actual connections
                    # get made later in the create_network_connections()
                    # method
                    dest_network_ports_live = NetworkPort.objects.filter(
                        asset=destination_asset
                    )
                    for dest_network_port_live in dest_network_ports_live:
                        dest_network_port_cp = NetworkPortCP.objects.get(
                            asset=asset_cp,
                            port_name=dest_network_port_live.port_name,
                        )
                        dest_network_port_cp.mac_address = (
                            dest_network_port_live.mac_address
                        )
                        dest_network_port_cp.save()

                    # power connection info
                    dest_power_ports_live = PowerPort.objects.filter(
                        asset=destination_asset
                    )
                    for dest_power_port_live in dest_power_ports_live:
                        dest_power_port_cp = PowerPortCP.objects.get(
                            asset=asset_cp,
                            port_name=dest_power_port_live.port_name,
                        )
                        dest_pdu_live = dest_power_port_live.power_connection
                        if dest_pdu_live:
                            if PDUPortCP.objects.filter(
                                rack=dest_pdu_live.rack,
                                left_right=dest_pdu_live.left_right,
                                port_number=dest_pdu_live.port_number,
                                change_plan=change_plan,
                            ).exists():
                                pdu_port = PDUPortCP.objects.filter(
                                    rack=dest_pdu_live.rack,
                                    left_right=dest_pdu_live.left_right,
                                    port_number=dest_pdu_live.port_number,
                                    change_plan=change_plan,
                                )
                            else:
                                pdu_port = PDUPortCP(change_plan=change_plan)
                                for field in dest_pdu_live._meta.fields:
                                    if field.name != "id":
                                        setattr(
                                            pdu_port,
                                            field.name,
                                            getattr(dest_pdu_live, field.name,),
                                        )
                                pdu_port.save()
                            dest_power_port_cp.power_connection = pdu_port
                            dest_power_port_cp.save()
                    destination_asset = asset_cp

                else:
                    destination_asset = assets_cp.get(
                        hostname=network_connection["destination_hostname"],
                        change_plan=change_plan,
                    )
            else:
                destination_asset = Asset.objects.get(
                    hostname=network_connection["destination_hostname"]
                )
        except ObjectDoesNotExist:
            failure_message += (
                "Asset with hostname '"
                + network_connection["destination_hostname"]
                + "' does not exist. "
            )
        else:
            try:
                if change_plan:
                    destination_port = NetworkPortCP.objects.get(
                        asset=destination_asset,
                        port_name=network_connection["destination_port"],
                        change_plan=change_plan,
                    )
                else:
                    destination_port = NetworkPort.objects.get(
                        asset=destination_asset,
                        port_name=network_connection["destination_port"],
                    )
            except ObjectDoesNotExist:
                failure_message += (
                    "Destination port '"
                    + network_connection["destination_hostname"]
                    + ":"
                    + network_connection["destination_port"]
                    + "' does not exist. "
                )
            else:
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
