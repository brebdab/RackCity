from rackcity.models import Asset, ITModel, Rack, PowerPort, NetworkPort
from rackcity.api.objects import RackRangeSerializer
from rackcity.api.serializers import RecursiveAssetSerializer, RackSerializer
from http import HTTPStatus
from django.http import JsonResponse
import functools
from django.db import close_old_connections


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
):
    new_asset_location_range = [
        asset_rack_position + i for i in range(asset_height)
    ]
    rack_height = Rack.objects.get(id=rack_id).height
    for location in new_asset_location_range:
        if location <= 0 or location > rack_height:
            raise LocationException("Cannot place asset outside of rack. ")
    assets_in_rack = Asset.objects.filter(rack=rack_id)
    for asset_in_rack in assets_in_rack:
        # Ignore if asset being modified conflicts with its old location
        if (asset_id is None or asset_in_rack.id != asset_id):
            for occupied_location in [
                asset_in_rack.rack_position + i for i
                    in range(asset_in_rack.model.height)
            ]:
                if occupied_location in new_asset_location_range:
                    raise LocationException(
                        "Asset location conflicts with another asset: '" +
                        str(asset_in_rack.asset_number) +
                        "'. "
                    )


def validate_location_modification(data, existing_asset):
    asset_id = existing_asset.id
    rack_id = existing_asset.rack.id
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
            rack_id = Rack.objects.get(id=data['rack']).id
        except Exception:
            raise Exception("No existing rack with id=" +
                            str(data['rack']) + ".")

    try:
        validate_asset_location(
            rack_id,
            asset_rack_position,
            asset_height,
            asset_id=asset_id,
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
            and key != 'id'
        ):
            return False
        if (
            key in new_keys
            and new_data[key] != existing_data[key]
        ):
            if not (
                int_string_comparison(existing_data[key], new_data[key])
                or empty_string_null_comparison(existing_data[key], new_data[key])
            ):
                return False
    return True


def int_string_comparison(existing_value, new_value):
    return (
        isinstance(existing_value, int)
        and isinstance(new_value, str)
        and int(new_value) == existing_value
    )


def empty_string_null_comparison(existing_value, new_value):
    return (
        (
            isinstance(existing_value, str)
            or isinstance(new_value, str)
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


class LocationException(Exception):
    def __init__(self, *args, **kwargs):
        Exception.__init__(self, *args, **kwargs)


class MacAddressException(Exception):
    def __init__(self, *args, **kwargs):
        Exception.__init__(self, *args, **kwargs)


class PowerConnectionException(Exception):
    def __init__(self, *args, **kwargs):
        Exception.__init__(self, *args, **kwargs)


class NetworkConnectionException(Exception):
    def __init__(self, *args, **kwargs):
        Exception.__init__(self, *args, **kwargs)


def get_sort_arguments(data):
    sort_args = []
    if 'sort_by' in data:
        sort_by = data['sort_by']
        for sort in sort_by:
            if ('field' not in sort) or ('ascending' not in sort):
                raise Exception("Must specify 'field' and 'ascending' fields.")
            if not isinstance(sort['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(sort['ascending'], bool):
                raise Exception("Field 'ascending' must be of type bool.")
            field_name = sort['field']
            order = "-" if not sort['ascending'] else ""
            sort_args.append(order + field_name)
    return sort_args


def get_filter_arguments(data):
    filter_args = []
    if 'filters' in data:
        filters = data['filters']
        for filter in filters:

            if (
                ('field' not in filter)
                or ('filter_type' not in filter)
                or ('filter' not in filter)
            ):
                raise Exception(
                    "Must specify 'field', 'filter_type', and 'filter' fields."
                )
            if not isinstance(filter['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(filter['filter_type'], str):
                raise Exception("Field 'filter_type' must be of type string.")
            if not isinstance(filter['filter'], dict):
                raise Exception("Field 'filter' must be of type dict.")

            filter_field = filter['field']
            filter_type = filter['filter_type']
            filter_dict = filter['filter']

            if filter_type == 'text':
                if filter_dict['match_type'] == 'exact':
                    filter_args.append(
                        {
                            '{0}__iexact'.format(filter_field): filter_dict['value']
                        }
                    )
                elif filter_dict['match_type'] == 'contains':
                    filter_args.append(
                        {
                            '{0}__icontains'.format(filter_field):
                            filter_dict['value']
                        }
                    )

            elif filter_type == 'numeric':
                if (
                    filter_dict['min'] is not None
                    and isinstance(filter_dict['min'], int)
                    and (
                        filter_dict['max'] is None
                        or filter_dict['max'] == ""
                    )
                ):
                    filter_args.append(
                        {
                            '{0}__gte'.format(filter_field): int(filter_dict['min'])  # noqa greater than or equal to min
                        }
                    )
                elif (
                    filter_dict['max'] is not None
                    and isinstance(filter_dict['max'], int)
                    and (
                        filter_dict['min'] is None
                        or filter_dict['min'] == ""
                    )
                ):
                    filter_args.append(
                        {
                            '{0}__lte'.format(filter_field): int(filter_dict['max'])  # noqa less than or equal to max
                        }
                    )
                elif (
                    int(filter_dict['max']) is not None
                    and int(filter_dict['min']) is not None
                ):
                    range_value = (
                        int(filter_dict['min']),
                        int(filter_dict['max'])
                    )
                    filter_args.append(
                        {
                            '{0}__range'.format(filter_field): range_value  # noqa inclusive on both min, max
                        }
                    )
                else:
                    raise Exception(
                        "Numeric filters must contain integer min, integer max, or both."
                    )

            elif filter_type == 'rack_range':
                range_serializer = RackRangeSerializer(data=filter_dict)
                if not range_serializer.is_valid():
                    raise Exception(
                        "Invalid rack_range filter: " +
                        str(range_serializer.errors)
                    )
                filter_args.append(
                    {
                        'rack__rack_num__range':
                        range_serializer.get_number_range()
                    }
                )
                filter_args.append(
                    {
                        'rack__row_letter__range':
                        range_serializer.get_row_range()  # noqa inclusive on both letter, number
                    }
                )

            else:
                raise Exception(
                    "String field 'filter_type' must be either 'text', " +
                    "'numeric', or 'rack_range'."
                )

    return filter_args


def close_old_connections_decorator(func):
    @functools.wraps(func)
    def wrapper_decorator(*args, **kwargs):
        close_old_connections()
        value = func(*args, **kwargs)
        close_old_connections()
        return value
    return wrapper_decorator
