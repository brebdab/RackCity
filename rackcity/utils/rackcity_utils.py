from rackcity.models import Asset, ITModel, Rack, PowerPort, NetworkPort
from rackcity.permissions.permissions import user_has_asset_permission
from rackcity.api.serializers import RecursiveAssetSerializer, RackSerializer
from http import HTTPStatus
from django.http import JsonResponse
import functools
from django.db import close_old_connections
from rackcity.models.asset import get_assets_for_cp


def get_rack_detailed_response(racks):
    if racks.count() == 0:
        return JsonResponse(
            {"failure_message": "There are no existing racks within this range. "},
            status=HTTPStatus.BAD_REQUEST,
        )

    racks_with_assets = []
    for rack in racks:
        rack_serializer = RackSerializer(rack)
        assets = Asset.objects \
            .filter(rack=rack.id) \
            .order_by("rack_position")
        assets_serializer = RecursiveAssetSerializer(
            assets,
            many=True
        )
        rack_detail = {
            "rack": rack_serializer.data,
            "assets": assets_serializer.data,
        }
        racks_with_assets.append(rack_detail)

    return JsonResponse(
        {"racks": racks_with_assets},
        status=HTTPStatus.OK
    )


def validate_asset_datacenter_move(data, asset):
    old_datacenter = asset.rack.datacenter
    if 'rack' not in data:
        return
    new_datacenter = Rack.objects.get(id=data['rack']).datacenter
    if (old_datacenter == new_datacenter):
        return
    power_ports = PowerPort.objects.filter(asset=asset.id)
    for power_port in power_ports:
        if (power_port.power_connection is not None):
            raise LocationException(
                "Cannot move asset with existing power connections " +
                "to different datacenter."
            )
    network_ports = NetworkPort.objects.filter(asset=asset.id)
    for network_port in network_ports:
        if (network_port.connected_port is not None):
            raise LocationException(
                "Cannot move asset with existing network connections " +
                "to different datacenter."
            )


def validate_asset_location(
    rack_id,
    asset_rack_position,
    asset_height,
    asset_id=None,
    change_plan=None,
    related_asset_id=None
):
    new_asset_location_range = [
        asset_rack_position + i for i in range(asset_height)
    ]
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
        if change_plan:
            is_valid_conflict = related_asset_id is not None and asset_in_rack.id != related_asset_id

        if (is_valid_conflict):
            for occupied_location in [
                asset_in_rack.rack_position + i for i
                    in range(asset_in_rack.model.height)
            ]:
                if occupied_location in new_asset_location_range:
                    if asset_in_rack.asset_number:
                        raise LocationException(
                            "Asset location conflicts with another asset: '" +
                            str(asset_in_rack.asset_number) +
                            "'. "
                        )
                    else:
                        raise LocationException(
                            "Asset location conflicts with another asset."
                        )
    if change_plan:
        for asset_in_rack in assets_cp.filter(rack=rack_id):
            # Ignore if asset being modified conflicts with its old location
            if (asset_id is None or asset_in_rack.id != asset_id):
                for occupied_location in [
                    asset_in_rack.rack_position + i for i
                        in range(asset_in_rack.model.height)
                ]:
                    if occupied_location in new_asset_location_range:
                        if asset_in_rack.asset_number:
                            raise LocationException(
                                "Asset location conflicts with another asset: '" +
                                str(asset_in_rack.asset_number) +
                                "'. "
                            )
                        else:
                            raise LocationException(
                                "Asset location conflicts with another asset."
                            )


def validate_location_modification(data, existing_asset, user, change_plan=None):
    asset_id = existing_asset.id
    rack_id = existing_asset.rack_id
    related_asset_id = None
    print(existing_asset)
    if hasattr(existing_asset, "related_asset") and existing_asset.related_asset:
        print(existing_asset.related_asset)
        related_asset_id = existing_asset.related_asset.id
    print("here")
    asset_rack_position = existing_asset.rack_position
    asset_height = existing_asset.model.height
    if 'rack_position' in data:
        try:
            asset_rack_position = int(data['rack_position'])
        except ValueError:
            raise Exception("Field 'rack_position' must be of type int.")

    if 'model' in data:
        try:
            asset_height = ITModel.objects.get(id=data['model']).height
        except Exception:
            raise Exception("No existing model with id=" +
                            str(data['model']) + ".")

    if 'rack' in data:
        try:
            rack = Rack.objects.get(id=data['rack'])
            rack_id = rack.id
        except Exception:
            raise Exception("No existing rack with id=" +
                            str(data['rack']) + ".")
        else:
            if not user_has_asset_permission(user, rack.datacenter):
                raise Exception(
                    "You do not have permission to move assets to " +
                    "datacenter " + rack.datacenter.abbreviation + "."
                )

    try:
        validate_asset_location(
            rack_id,
            asset_rack_position,
            asset_height,
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
            and key != 'id'
        ):
            return False
        if (
            key in new_keys
            and new_data[key] != existing_data[key]
        ):
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
    location_occupied_by = {}
    unnamed_asset_count = 0
    for asset_data in asset_datas:
        rack = asset_data['rack']
        height = ITModel.objects.get(id=asset_data['model']).height
        rack_position = int(asset_data['rack_position'])
        asset_location_range = [  # THIS IS REPEATED! FACTOR OUT.
            rack_position + i for i in range(height)
        ]
        if rack not in location_occupied_by:
            location_occupied_by[rack] = {}
        for location in asset_location_range:
            if location in location_occupied_by[rack]:
                raise LocationException(
                    "Asset '" +
                    str(asset_data['asset_number']) +
                    "' conflicts with asset '" +
                    location_occupied_by[rack][location] +
                    "'. ")
            else:
                if 'asset_number' in asset_data and asset_data['asset_number']:
                    asset_name = asset_data['asset_number']
                elif 'hostname' in asset_data and asset_data['hostname']:
                    asset_name = asset_data['hostname']
                else:
                    asset_name = "unnamed_asset_"+str(unnamed_asset_count)
                    unnamed_asset_count += 1
                location_occupied_by[rack][location] = asset_name
    return


def close_old_connections_decorator(func):
    @functools.wraps(func)
    def wrapper_decorator(*args, **kwargs):
        close_old_connections()
        value = func(*args, **kwargs)
        close_old_connections()
        return value
    return wrapper_decorator
