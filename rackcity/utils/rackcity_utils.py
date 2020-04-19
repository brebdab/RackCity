from django.core.exceptions import ObjectDoesNotExist
from rackcity.models import Asset, AssetCP, ITModel, Rack, PowerPort, NetworkPort
from rackcity.models.asset import get_assets_for_cp
from rackcity.utils.exceptions import LocationException, AssetModificationException


def validate_asset_datacenter_move(data, asset):
    old_datacenter = asset.rack.datacenter
    if "rack" not in data:
        return
    new_datacenter = Rack.objects.get(id=data["rack"]).datacenter
    if old_datacenter == new_datacenter:
        return
    power_ports = PowerPort.objects.filter(asset=asset.id)
    for power_port in power_ports:
        if power_port.power_connection is not None:
            raise LocationException(
                "Cannot move asset with existing power connections "
                + "to different datacenter."
            )
    network_ports = NetworkPort.objects.filter(asset=asset.id)
    for network_port in network_ports:
        if network_port.connected_port is not None:
            raise LocationException(
                "Cannot move asset with existing network connections "
                + "to different datacenter."
            )


def validate_asset_location_in_rack(
    rack_id,
    asset_rack_position,
    asset_height,
    asset_id=None,
    change_plan=None,
    related_asset_id=None,
):
    if asset_rack_position is None:
        return
    new_asset_location_range = [asset_rack_position + i for i in range(asset_height)]
    rack_height = Rack.objects.get(id=rack_id).height
    for location in new_asset_location_range:
        if location <= 0 or location > rack_height:
            raise LocationException("Cannot place asset outside of rack. ")
    if change_plan:
        assets, assets_cp = get_assets_for_cp(change_plan.id)
    else:
        assets = Asset.objects.all()

    for asset_in_rack in assets.filter(rack=rack_id):
        # Ignore if asset being modified conflicts with its old location

        is_valid_conflict = asset_id is None or asset_in_rack.id != asset_id

        if related_asset_id:
            is_valid_conflict = asset_in_rack.id != related_asset_id

        if is_valid_conflict:
            for occupied_location in [
                asset_in_rack.rack_position + i
                for i in range(asset_in_rack.model.height)
            ]:
                if occupied_location in new_asset_location_range:
                    if asset_in_rack.asset_number:
                        raise LocationException(
                            "Asset location conflicts with another asset: '"
                            + str(asset_in_rack.asset_number)
                            + "'. "
                        )
                    else:
                        raise LocationException(
                            "Asset location conflicts with another asset."
                        )
    if change_plan:
        for asset_in_rack in assets_cp.filter(rack=rack_id):
            # Ignore if asset being modified conflicts with its old location
            if (asset_id is None) or (asset_in_rack.id != asset_id):
                for occupied_location in [
                    asset_in_rack.rack_position + i
                    for i in range(asset_in_rack.model.height)
                ]:
                    if occupied_location in new_asset_location_range:
                        if asset_in_rack.asset_number:
                            raise LocationException(
                                "Asset location conflicts with another asset: '"
                                + str(asset_in_rack.asset_number)
                                + "'. "
                            )
                        else:
                            raise LocationException(
                                "Asset location conflicts with another asset."
                            )


def validate_asset_location_in_chassis(
    chassis_id, chassis_slot, asset_id=None, change_plan=None, related_asset_id=None,
):
    if chassis_slot is None:
        return
    num_slots_in_chassis = 14
    if chassis_slot < 1 or chassis_slot > num_slots_in_chassis:
        raise LocationException(str(chassis_slot) + " is not a valid slot number. ")
    if change_plan:
        assets, assets_cp = get_assets_for_cp(change_plan.id)
    else:
        assets = Asset.objects.all()
    for asset_in_chassis in assets.filter(chassis=chassis_id):
        # Ignore if asset being modified conflicts with its old location
        is_valid_conflict = asset_id is None or asset_in_chassis.id != asset_id
        if change_plan:
            is_valid_conflict = (
                related_asset_id is not None and asset_in_chassis.id != related_asset_id
            )

        if is_valid_conflict:
            if asset_in_chassis.chassis_slot == chassis_slot:
                if asset_in_chassis.asset_number:
                    raise LocationException(
                        "Blade location conflicts with another blade: '"
                        + str(asset_in_chassis.asset_number)
                        + "'. "
                    )
                else:
                    raise LocationException(
                        "Blade location conflicts with another blade."
                    )
    if change_plan:
        for asset_in_chassis in assets_cp.filter(chassis=chassis_id):
            # Ignore if asset being modified conflicts with its old location
            if (asset_id is None) or (asset_in_chassis.id != asset_id):
                if asset_in_chassis.chassis_slot == chassis_slot:
                    if asset_in_chassis.asset_number:
                        raise LocationException(
                            "Blade location conflicts with another blade: '"
                            + str(asset_in_chassis.asset_number)
                            + "'. "
                        )
                    else:
                        raise LocationException(
                            "Blade location conflicts with another blade."
                        )


def validate_location_modification(data, existing_asset, change_plan=None):
    asset_id = existing_asset.id
    rack_id = existing_asset.rack_id
    chassis_id = existing_asset.chassis_id
    related_asset_id = None
    if hasattr(existing_asset, "related_asset") and existing_asset.related_asset:
        related_asset_id = existing_asset.related_asset.id

    asset_rack_position = existing_asset.rack_position
    asset_chassis_slot = existing_asset.chassis_slot
    asset_height = existing_asset.model.height
    if "rack_position" in data and data["rack_position"]:
        try:
            asset_rack_position = int(data["rack_position"])
        except ValueError:
            raise Exception("Field 'rack_position' must be of type int.")

    if "chassis_slot" in data and data["chassis_slot"]:
        try:
            asset_chassis_slot = int(data["chassis_slot"])
        except ValueError:
            raise Exception("Field 'chassis_slot' must be of type int.")

    if "model" in data and data["model"]:
        try:
            asset_height = ITModel.objects.get(id=data["model"]).height
        except Exception:
            raise Exception("No existing model with id=" + str(data["model"]) + ".")

    if "rack" in data and data["rack"]:
        try:
            rack = Rack.objects.get(id=data["rack"])
            rack_id = rack.id
        except Exception:
            raise Exception("No existing rack with id=" + str(data["rack"]) + ".")

    if "chassis" in data and data["chassis"]:
        if change_plan:
            try:
                chassis = AssetCP.objects.get(id=data["chassis"])
                chassis_id = chassis.id
            except ObjectDoesNotExist:
                try:
                    chassis = Asset.objects.get(id=data["chassis"])
                    chassis_id = chassis.id
                except ObjectDoesNotExist:
                    raise Exception(
                        "Chassis '" + str(chassis_id) + "' does not exist. "
                    )
        else:
            try:
                chassis = Asset.objects.get(id=data["chassis"])
                chassis_id = chassis.id
            except ObjectDoesNotExist:
                raise Exception(
                    "No existing chassis with id=" + str(data["chassis"]) + "."
                )

    if not ("offline_storage_site" in data and data["offline_storage_site"]):
        if existing_asset.model.is_rackmount():
            try:
                validate_asset_location_in_rack(
                    rack_id,
                    asset_rack_position,
                    asset_height,
                    asset_id=asset_id,
                    change_plan=change_plan,
                    related_asset_id=related_asset_id,
                )
            except LocationException as error:
                raise error
        else:
            try:
                validate_asset_location_in_chassis(
                    chassis_id,
                    asset_chassis_slot,
                    asset_id=asset_id,
                    change_plan=change_plan,
                    related_asset_id=related_asset_id,
                )
            except LocationException as error:
                raise error


def records_are_identical(existing_data, new_data):
    existing_keys = existing_data.keys()
    new_keys = new_data.keys()
    for key in existing_keys:
        if (
            key not in new_keys
            and existing_data[key] is not None
            and existing_data[key] != ""
            and existing_data[key] != []
            and existing_data[key] != {}
            and key != "id"
        ):
            return False
        if (key in new_keys) and (new_data[key] != existing_data[key]):
            if not (
                int_string_comparison(existing_data[key], new_data[key])
                or empty_vs_null_comparison(existing_data[key], new_data[key])
            ):
                return False
    return True


def int_string_comparison(existing_value, new_value):
    return (
        isinstance(existing_value, int)
        and isinstance(new_value, str)
        and int(new_value) == existing_value
    )


def empty_vs_null_comparison(existing_value, new_value):
    return (
        (
            isinstance(existing_value, str)
            or isinstance(new_value, str)
            or isinstance(existing_value, list)
            or isinstance(new_value, list)
            or isinstance(existing_value, dict)
            or isinstance(new_value, dict)
        )
        and not new_value
        and not existing_value
    )


def no_infile_location_conflicts(asset_datas):
    rack_location_occupied_by = {}
    chassis_slot_occupied_by = {}
    unnamed_asset_count = 0
    for asset_data in asset_datas:
        if asset_data["offline_storage_site"]:
            continue
        model = ITModel.objects.get(id=asset_data["model"])
        if model.is_rackmount():
            rack = asset_data["rack"]
            height = model.height
            rack_position = int(asset_data["rack_position"])
            asset_location_range = [  # THIS IS REPEATED! FACTOR OUT.
                rack_position + i for i in range(height)
            ]
            if rack not in rack_location_occupied_by:
                rack_location_occupied_by[rack] = {}
            for location in asset_location_range:
                if location in rack_location_occupied_by[rack]:
                    raise LocationException(
                        "Asset '"
                        + str(asset_data["asset_number"])
                        + "' conflicts with asset '"
                        + rack_location_occupied_by[rack][location]
                        + "'. "
                    )
                else:
                    if ("asset_number" in asset_data) and (asset_data["asset_number"]):
                        asset_name = asset_data["asset_number"]
                    elif ("hostname" in asset_data) and (asset_data["hostname"]):
                        asset_name = asset_data["hostname"]
                    else:
                        asset_name = "unnamed_asset_" + str(unnamed_asset_count)
                        unnamed_asset_count += 1
                    rack_location_occupied_by[rack][location] = asset_name
        else:
            if "chassis" in asset_data:
                chassis = asset_data["chassis"]
            else:
                chassis = "new_" + asset_data["chassis_number"]
            chassis_slot = asset_data["chassis_slot"]
            if chassis not in chassis_slot_occupied_by:
                chassis_slot_occupied_by[chassis] = {}
            if chassis_slot in chassis_slot_occupied_by[chassis]:
                raise LocationException(
                    "Asset '"
                    + str(asset_data["asset_number"])
                    + "' conflicts with asset '"
                    + chassis_slot_occupied_by[chassis][chassis_slot]
                    + "'. "
                )
            else:
                if ("asset_number" in asset_data) and (asset_data["asset_number"]):
                    asset_name = asset_data["asset_number"]
                elif ("hostname" in asset_data) and (asset_data["hostname"]):
                    asset_name = asset_data["hostname"]
                else:
                    asset_name = "unnamed_asset_" + str(unnamed_asset_count)
                    unnamed_asset_count += 1
                chassis_slot_occupied_by[chassis][chassis_slot] = asset_name
    return


def validate_hostname_deletion(data, existing_asset):
    if "hostname" in data and not data["hostname"]:
        if isinstance(existing_asset, Asset):
            if Asset.objects.filter(chassis=existing_asset).exists():
                raise AssetModificationException(
                    "Cannot delete hostname of an chassis with blades installed. "
                )
        if isinstance(existing_asset, AssetCP):
            if AssetCP.objects.filter(chassis=existing_asset).exists():
                raise AssetModificationException(
                    "Cannot delete hostname of an chassis in a change plan with blades installed on the change plan. "
                )
