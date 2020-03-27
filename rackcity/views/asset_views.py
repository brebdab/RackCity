from django.http import JsonResponse
from rackcity.models import (
    Asset,
    DecommissionedAsset,
    ITModel,
    Rack,
    NetworkPort,
    PowerPort,
    PDUPort,
    Datacenter,
)
from django.contrib.auth.decorators import permission_required
from django.core.exceptions import ObjectDoesNotExist
from rackcity.api.serializers import (
    AssetSerializer,
    GetDecommissionedAssetSerializer,
    RecursiveAssetSerializer,
    BulkAssetSerializer,
    BulkNetworkPortSerializer,
    ITModelSerializer,
    RackSerializer,
    normalize_bulk_asset_data,
    normalize_bulk_network_data,
)
from rackcity.utils.log_utils import (
    log_action,
    log_bulk_upload,
    log_bulk_approve,
    log_delete,
    log_network_action,
    Action,
    ElementType,
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error,
    BulkFailure
)
from rackcity.permissions.decorators import (
    asset_permission_required,
    power_permission_required,
)
from rackcity.permissions.permissions import PermissionPath
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus
import math
import csv
from base64 import b64decode
import re
from io import StringIO, BytesIO
from rackcity.views.rackcity_utils import (
    validate_asset_location,
    validate_location_modification,
    no_infile_location_conflicts,
    records_are_identical,
    get_sort_arguments,
    get_filter_arguments,
    LocationException,
    MacAddressException,
    PowerConnectionException,
    NetworkConnectionException,
)
from rackcity.models.asset import get_next_available_asset_number


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def asset_many(request):
    """
    List many assets. If page is not specified as a query parameter, all
    assets are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """

    errors = []

    should_paginate = not(
        request.query_params.get('page') is None
        and request.query_params.get('page_size') is None
    )

    if should_paginate:
        if not request.query_params.get('page'):
            errors.append("Must specify field 'page' on " +
                          "paginated requests.")
        elif not request.query_params.get('page_size'):
            errors.append("Must specify field 'page_size' on " +
                          "paginated requests.")
        elif int(request.query_params.get('page_size')) <= 0:
            errors.append("Field 'page_size' must be an integer " +
                          "greater than 0.")

    if len(errors) > 0:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                "errors": " ".join(errors)
            },
            status=HTTPStatus.BAD_REQUEST,
        )

    assets_query = Asset.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.FILTER.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        print(filter_arg)
        assets_query = assets_query.filter(**filter_arg)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.SORT.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    assets = assets_query.order_by(*sort_args)

    if should_paginate:
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size')
        try:
            page_of_assets = paginator.paginate_queryset(assets, request)
        except Exception as error:
            return JsonResponse(
                {
                    "failure_message":
                        Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                    "errors": str(error)
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        assets_to_serialize = page_of_assets
    else:
        assets_to_serialize = assets

    serializer = RecursiveAssetSerializer(
        assets_to_serialize,
        many=True,
    )
    return JsonResponse(
        {"assets": serializer.data},
        status=HTTPStatus.OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def asset_detail(request, id):
    """
    Retrieve a single asset.
    """

    try:
        asset = Asset.objects.get(id=id)
    except Asset.DoesNotExist:
        try:
            decommissioned_asset = DecommissionedAsset.objects.get(live_id=id)
        except DecommissionedAsset.DoesNotExist:
            return JsonResponse(
                {
                    "failure_message":
                        Status.ERROR.value +
                        "Asset" + GenericFailure.DOES_NOT_EXIST.value,
                    "errors": "No existing asset with id="+str(id)
                },
                status=HTTPStatus.BAD_REQUEST
            )
        else:
            serializer = GetDecommissionedAssetSerializer(decommissioned_asset)
    else:
        serializer = RecursiveAssetSerializer(asset)
    return JsonResponse(serializer.data, status=HTTPStatus.OK)


@api_view(['POST'])
# @asset_permission_required()
def asset_add(request):
    """
    Add a new asset.
    """
    data = JSONParser().parse(request)
    if 'id' in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Don't include 'id' when creating an asset"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    serializer = AssetSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message":
                    Status.INVALID_INPUT.value +
                    parse_serializer_errors(serializer.errors),
                "errors": str(serializer.errors)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    rack_id = serializer.validated_data['rack'].id
    rack_position = serializer.validated_data['rack_position']
    height = serializer.validated_data['model'].height
    try:
        validate_asset_location(rack_id, rack_position, height)
    except LocationException as error:
        return JsonResponse(
            {"failure_message": Status.CREATE_ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        asset = serializer.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value +
                    parse_save_validation_error(error, "Asset"),
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    warning_message = ""
    try:
        save_mac_addresses(
            asset_data=data,
            asset_id=asset.id
        )
    except MacAddressException as error:
        warning_message += "Some mac addresses couldn't be saved. " + \
            str(error)
    try:
        save_power_connections(
            asset_data=data,
            asset_id=asset.id
        )
    except PowerConnectionException as error:
        warning_message += "Some power connections couldn't be saved. " + \
            str(error)
    try:
        save_network_connections(
            asset_data=data,
            asset_id=asset.id
        )
        log_network_action(request.user, asset)
    except NetworkConnectionException as error:
        warning_message += "Some network connections couldn't be saved. " + \
            str(error)
    if warning_message:
        return JsonResponse(
            {"warning_message": warning_message},
            status=HTTPStatus.OK,
        )
    else:
        log_action(request.user, asset, Action.CREATE)
        return JsonResponse(
            {
                "success_message":
                    Status.SUCCESS.value +
                    "Asset " + str(asset.asset_number) + " created"
            },
            status=HTTPStatus.OK,
        )


def save_mac_addresses(asset_data, asset_id):
    if (
        'mac_addresses' not in asset_data
        or not asset_data['mac_addresses']
    ):
        return
    mac_address_assignments = asset_data['mac_addresses']
    failure_message = ""
    for port_name in mac_address_assignments.keys():
        try:
            network_port = NetworkPort.objects.get(
                asset=asset_id,
                port_name=port_name
            )
        except ObjectDoesNotExist:
            failure_message += "Port name '"+port_name+"' is not valid. "
        else:
            mac_address = mac_address_assignments[port_name]
            network_port.mac_address = mac_address
            try:
                network_port.save()
            except Exception:
                failure_message += \
                    "Mac address '" + \
                    mac_address + \
                    "' is not valid. "
    if failure_message:
        raise MacAddressException(failure_message)


def save_network_connections(asset_data, asset_id):
    if (
        'network_connections' not in asset_data
        or not asset_data['network_connections']
    ):
        return
    network_connections = asset_data['network_connections']
    failure_message = ""
    for network_connection in network_connections:
        port_name = network_connection['source_port']
        try:
            network_port = NetworkPort.objects.get(
                asset=asset_id,
                port_name=port_name
            )
        except ObjectDoesNotExist:
            failure_message += "Port name '"+port_name+"' is not valid. "
        else:
            if (
                not network_connection['destination_hostname'] and
                not network_connection['destination_port']
            ):
                network_port.delete_network_connection()
                continue
            if (
                not network_connection['destination_hostname']
            ):
                failure_message += "Could not create connection on port '" + \
                    port_name + \
                    "' because no destination hostname was provided."
                continue
            if (
                not network_connection['destination_port']
            ):
                failure_message += "Could not create connection on port '" + \
                    port_name + \
                    "' because no destination port was provided."
                continue
            try:
                destination_asset = Asset.objects.get(
                    hostname=network_connection['destination_hostname']
                )
            except ObjectDoesNotExist:
                failure_message += \
                    "Asset with hostname '" + \
                    network_connection['destination_hostname'] + \
                    "' does not exist. "
            else:
                try:
                    destination_port = NetworkPort.objects.get(
                        asset=destination_asset,
                        port_name=network_connection['destination_port']
                    )
                except ObjectDoesNotExist:
                    failure_message += \
                        "Destination port '" + \
                        network_connection['destination_hostname'] + \
                        ":" + \
                        network_connection['destination_port'] + \
                        "' does not exist. "
                else:
                    try:
                        network_port.create_network_connection(
                            destination_port=destination_port
                        )
                    except Exception as error:
                        failure_message += \
                            "Could not save connection for port '" + \
                            port_name + \
                            "'. " + \
                            str(error)
    if failure_message:
        raise NetworkConnectionException(failure_message)


def save_power_connections(asset_data, asset_id):
    if (
        'power_connections' not in asset_data
        or not asset_data['power_connections']
    ):
        return
    power_connection_assignments = asset_data['power_connections']
    failure_message = ""
    for port_name in power_connection_assignments.keys():
        try:
            power_port = PowerPort.objects.get(
                asset=asset_id,
                port_name=port_name
            )
        except ObjectDoesNotExist:
            failure_message += "Power port '"+port_name+"' does not exist on this asset. "
        else:
            power_connection_data = power_connection_assignments[port_name]
            asset = Asset.objects.get(id=asset_id)
            if not power_connection_data:
                power_port.power_connection = None
                power_port.save()
                continue
            try:
                pdu_port = PDUPort.objects.get(
                    rack=asset.rack,
                    left_right=power_connection_data['left_right'],
                    port_number=power_connection_data['port_number']
                )
            except ObjectDoesNotExist:
                failure_message += \
                    "PDU port '" + \
                    power_connection_data['left_right'] + \
                    str(power_connection_data['port_number']) + \
                    "' does not exist. "
            else:
                power_port.power_connection = pdu_port
                try:
                    power_port.save()
                except Exception as error:
                    failure_message += \
                        "Power connection on port '" + \
                        port_name + \
                        "' of asset '" + \
                        str(asset.asset_number) + \
                        "' was not valid. "
    if failure_message:
        raise PowerConnectionException(failure_message)


@api_view(['POST'])
@asset_permission_required()
def asset_modify(request):
    """
    Modify a single existing asset
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when modifying an asset"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        existing_asset = Asset.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Model" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        validate_location_modification(data, existing_asset)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Invalid location change. " + str(error)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    for field in data.keys():
        if field == 'model':
            value = ITModel.objects.get(id=data[field])
        elif field == 'rack':
            value = Rack.objects.get(id=data[field])
        elif field == 'hostname' and data['hostname']:
            assets_with_hostname = Asset.objects.filter(
                hostname__iexact=data[field]
            )
            if (
                len(assets_with_hostname) > 0
                and assets_with_hostname[0].id != id
            ):
                return JsonResponse(
                    {
                        "failure_message":
                            Status.MODIFY_ERROR.value +
                            "Asset with hostname '" +
                            data[field].lower() + "' already exists."
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
            value = data[field]
        elif field == 'asset_number':
            assets_with_asset_number = Asset.objects.filter(
                asset_number=data[field]
            )
            if (
                len(assets_with_asset_number) > 0
                and assets_with_asset_number[0].id != id
            ):
                return JsonResponse(
                    {
                        "failure_message":
                            Status.MODIFY_ERROR.value +
                            "Asset with asset number '" +
                            str(data[field]) + "' already exists."
                    },
                    status=HTTPStatus.BAD_REQUEST,
                )
            value = data[field]
        else:
            value = data[field]
        setattr(existing_asset, field, value)

    try:
        existing_asset.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    parse_save_validation_error(error, "Asset"),
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    else:
        warning_message = ""
        try:
            save_mac_addresses(
                asset_data=data,
                asset_id=existing_asset.id
            )
        except MacAddressException as error:
            warning_message += "Some mac addresses couldn't be saved. " + \
                str(error)
        try:
            save_power_connections(
                asset_data=data,
                asset_id=existing_asset.id
            )
        except PowerConnectionException as error:
            warning_message += "Some power connections couldn't be saved. " + \
                str(error)
        try:
            save_network_connections(
                asset_data=data,
                asset_id=existing_asset.id
            )
            log_network_action(request.user, existing_asset)
        except NetworkConnectionException as error:
            warning_message += \
                "Some network connections couldn't be saved. " + str(error)
        if warning_message:
            return JsonResponse(
                {"warning_message": warning_message},
                status=HTTPStatus.OK,
            )
        else:
            log_action(request.user, existing_asset, Action.MODIFY)
            return JsonResponse(
                {
                    "success_message":
                        Status.SUCCESS.value +
                        "Asset " +
                    str(existing_asset.asset_number) + " modified"
                },
                status=HTTPStatus.OK,
            )


@api_view(['POST'])
# @asset_permission_required()
def asset_delete(request):
    """
    Delete a single existing asset
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when deleting an asset"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        existing_asset = Asset.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Model" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing asset with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    asset_number = existing_asset.asset_number
    if (existing_asset.hostname):
        asset_hostname = existing_asset.hostname
        asset_log_name = str(asset_number) + ' (' + asset_hostname + ')'
    else:
        asset_log_name = str(asset_number)
    try:
        existing_asset.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Asset" +
                    GenericFailure.ON_DELETE.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    log_delete(request.user, ElementType.ASSET, asset_log_name)
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                "Asset " + str(asset_number) + " deleted"
        },
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
# TODO Check all assets for datacenter-level permissions
def asset_bulk_upload(request):
    """
    Bulk upload many assets to add or modify
    """
    data = JSONParser().parse(request)
    if 'import_csv' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.IMPORT_ERROR.value +
                    BulkFailure.IMPORT.value,
                "errors":
                    "Bulk upload request should have a parameter 'import_csv'"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    base_64_csv = data['import_csv']
    csv_bytes_io = BytesIO(
        b64decode(re.sub(".*base64,", '', base_64_csv))
    )
    csv_string_io = StringIO(csv_bytes_io.read().decode('UTF-8'))
    csvReader = csv.DictReader(csv_string_io)
    expected_fields = BulkAssetSerializer.Meta.fields
    given_fields = csvReader.fieldnames
    if (
        len(expected_fields) != len(given_fields)  # check for repeated fields
        or set(expected_fields) != set(given_fields)
    ):
        return JsonResponse(
            {
                "failure_message":
                    Status.IMPORT_ERROR.value +
                    BulkFailure.IMPORT_COLUMNS.value
            },
            status=HTTPStatus.BAD_REQUEST
        )
    bulk_asset_datas = []
    for row in csvReader:
        bulk_asset_datas.append(dict(row))
    assets_to_add = []
    potential_modifications = []
    hostnames_in_import = set()
    asset_numbers_in_import = set()
    asset_datas = []
    warning_message = ""
    for bulk_asset_data in bulk_asset_datas:
        asset_data = normalize_bulk_asset_data(bulk_asset_data)
        asset_datas.append(asset_data)
        try:
            model = ITModel.objects.get(
                vendor=asset_data['vendor'],
                model_number=asset_data['model_number']
            )
        except ObjectDoesNotExist:
            failure_message = \
                Status.IMPORT_ERROR.value + \
                "Model does not exist: " + \
                "vendor="+asset_data['vendor'] + \
                ", model_number="+asset_data['model_number']
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        asset_data['model'] = model.id
        del asset_data['vendor']
        del asset_data['model_number']
        try:
            datacenter = Datacenter.objects.get(
                abbreviation=asset_data['datacenter']
            )
        except ObjectDoesNotExist:
            failure_message = \
                Status.IMPORT_ERROR.value + \
                "Provided datacenter doesn't exist: " + \
                asset_data['datacenter']
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        try:
            row_letter = asset_data['rack'][:1].upper()
            rack_num = asset_data['rack'][1:]
            rack = Rack.objects.get(
                datacenter=datacenter,
                row_letter=row_letter,
                rack_num=rack_num
            )
        except ObjectDoesNotExist:
            failure_message = \
                Status.IMPORT_ERROR.value + \
                "Provided rack doesn't exist: " + \
                asset_data['rack']
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        asset_data['rack'] = rack.id
        asset_serializer = AssetSerializer(
            data=asset_data)  # non-recursive to validate
        if not asset_serializer.is_valid():
            errors = asset_serializer.errors
            if not (  # if the only errors are the asset number and/or hostname uniqueness, that's fine - it's a modify
                (
                    len(errors.keys()) == 2  # known bug here!
                    and 'hostname' in errors
                    and len(errors['hostname']) == 1
                    and errors['hostname'][0].code == 'unique'
                    and 'asset_number' in errors
                    and len(errors['asset_number']) == 1
                    and errors['asset_number'][0].code == 'unique'
                )
                or
                (
                    len(errors.keys()) == 1
                    and 'asset_number' in errors
                    and len(errors['asset_number']) == 1
                    and errors['asset_number'][0].code == 'unique'
                )
            ):
                return JsonResponse(
                    {
                        "failure_message":
                            Status.IMPORT_ERROR.value +
                            BulkFailure.ASSET_INVALID.value +
                            parse_serializer_errors(asset_serializer.errors),
                        "errors": str(asset_serializer.errors)
                    },
                    status=HTTPStatus.BAD_REQUEST
                )
        # Check that all hostnames in file are case insensitive unique
        if 'hostname' in asset_data and asset_data['hostname']:
            asset_data_hostname_lower = asset_data['hostname'].lower()
            if asset_data_hostname_lower in hostnames_in_import:
                failure_message = \
                    Status.IMPORT_ERROR.value + \
                    "Hostname must be unique, but '" + \
                    asset_data_hostname_lower + \
                    "' appears more than once in import. "
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST
                )
            else:
                hostnames_in_import.add(asset_data_hostname_lower)
        # Check that all asset_numbers in file are unique
        if 'asset_number' in asset_data and asset_data['asset_number']:
            asset_number = asset_data['asset_number']
            if asset_number in asset_numbers_in_import:
                failure_message = \
                    Status.IMPORT_ERROR.value + \
                    "Asset number must be unique, but '" + \
                    str(asset_number) + \
                    "' appears more than once in import. "
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST
                )
            else:
                asset_numbers_in_import.add(asset_number)
        asset_exists = False
        if 'asset_number' in asset_data and asset_data['asset_number']:
            try:
                existing_asset = Asset.objects.get(
                    asset_number=asset_data['asset_number'])
            except ObjectDoesNotExist:
                pass
            else:
                asset_exists = True
        if asset_exists:
            # asset number specfies existing asset
            try:
                validate_location_modification(asset_data, existing_asset)
            except Exception:
                failure_message = \
                    Status.IMPORT_ERROR.value + \
                    "Asset " + \
                    str(asset_data['asset_number']) + \
                    " would conflict location with an existing asset. "
                return JsonResponse(
                    {"failure_message": failure_message},
                    status=HTTPStatus.BAD_REQUEST
                )
            potential_modifications.append(
                {
                    "existing_asset": existing_asset,
                    "new_data": asset_data
                }
            )
        else:
            # asset number not provided or it is new
            model = ITModel.objects.get(id=asset_data['model'])
            try:
                validate_asset_location(
                    asset_serializer.validated_data['rack'].id,
                    asset_serializer.validated_data['rack_position'],
                    model.height,
                    asset_id=None,
                )
            except LocationException as error:
                if 'asset_number' in asset_data and asset_data['asset_number']:
                    asset_name = str(asset_data['asset_number'])
                elif 'hostname' in asset_data and asset_data['hostname']:
                    asset_name = asset_data['hostname']
                else:
                    asset_name = ""
                return JsonResponse(
                    {
                        "failure_message":
                            Status.IMPORT_ERROR.value +
                            "Asset " + asset_name +
                            " is invalid. " + str(error)
                    },
                    status=HTTPStatus.BAD_REQUEST
                )
            else:
                assets_to_add.append(
                    {
                        "asset_serializer": asset_serializer,
                        "asset_data": asset_data
                    }
                )
    try:
        no_infile_location_conflicts(asset_datas)
    except LocationException as error:
        failure_message = \
            Status.IMPORT_ERROR.value + \
            "Location conflicts among assets in import file. " + \
            str(error)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST
        )
    records_added = 0
    for asset_to_add in assets_to_add:
        records_added += 1
        asset_serializer = asset_to_add['asset_serializer']
        asset_data = asset_to_add['asset_data']
        asset_added = asset_serializer.save()
        try:
            save_power_connections(
                asset_data=asset_data,
                asset_id=asset_added.id
            )
        except PowerConnectionException as error:
            warning_message += "Some power connections couldn't be saved. " + \
                str(error)
    records_ignored = 0
    modifications_to_approve = []
    for potential_modification in potential_modifications:
        new_data = potential_modification['new_data']
        new_data['model'] = ITModelSerializer(
            ITModel.objects.get(id=new_data['model'])
        ).data
        new_data['rack'] = RackSerializer(
            Rack.objects.get(id=new_data['rack'])
        ).data
        existing_data = RecursiveAssetSerializer(
            potential_modification['existing_asset']
        ).data
        # macs and connections aren't specified in this file, so ignore them
        del existing_data['mac_addresses']
        del existing_data['network_connections']
        del existing_data['network_graph']
        if records_are_identical(existing_data, new_data):
            records_ignored += 1
        else:
            new_data['id'] = existing_data['id']
            for field in existing_data.keys():
                if field not in new_data:
                    new_data[field] = None
            modifications_to_approve.append(
                {
                    "existing": existing_data,
                    "modified": new_data
                }
            )
    response = {
        "added": records_added,
        "ignored": records_ignored,
        "modifications": modifications_to_approve
    }
    if warning_message:
        response['warning_message'] = warning_message
    log_bulk_upload(
        request.user,
        ElementType.ASSET,
        records_added,
        records_ignored,
        len(modifications_to_approve)
    )
    return JsonResponse(
        response,
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
# TODO Check all assets for datacenter-level permissions
def asset_bulk_approve(request):
    """
    Bulk approve many assets to modify
    """
    data = JSONParser().parse(request)
    if 'approved_modifications' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.IMPORT_ERROR.value +
                    BulkFailure.IMPORT.value,
                "errors":
                    "Bulk approve request should have a parameter " +
                    "'approved_modifications'"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    asset_datas = data['approved_modifications']
    # Don't do any validation here because we know we sent valid assets to the frontend,
    # and they should send the same ones back
    warning_message = ""
    for asset_data in asset_datas:
        existing_asset = Asset.objects.get(
            id=asset_data['id'])
        for field in asset_data.keys():  # This is assumed to have all fields, and with null values for blank ones. That's how it's returned in bulk-upload
            if field == 'model':
                value = ITModel.objects.get(id=asset_data[field]['id'])
            elif field == 'rack':
                value = Rack.objects.get(id=asset_data[field]['id'])
            else:
                value = asset_data[field]
            setattr(existing_asset, field, value)
        existing_asset.save()
        try:
            save_power_connections(
                asset_data=asset_data,
                asset_id=existing_asset.id
            )
        except PowerConnectionException as error:
            warning_message += "Some power connections couldn't be saved. " + \
                str(error)
    log_bulk_approve(request.user, ElementType.ASSET, len(asset_datas))
    if warning_message:
        return JsonResponse(
            {"warning_message": warning_message},
            status=HTTPStatus.OK
        )
    else:
        return JsonResponse(
            {"success_message": "Assets succesfully modified. "},
            status=HTTPStatus.OK
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def asset_bulk_export(request):
    """
    List all assets in csv form, in accordance with Bulk Spec.
    """
    assets_query = Asset.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.EXPORT_ERROR.value + GenericFailure.FILTER.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        assets_query = assets_query.filter(**filter_arg)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.EXPORT_ERROR.value + GenericFailure.SORT.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    assets = assets_query.order_by(*sort_args)

    serializer = BulkAssetSerializer(assets, many=True)
    csv_string = StringIO()
    fields = serializer.data[0].keys()
    csv_writer = csv.DictWriter(csv_string, fields)
    csv_writer.writeheader()
    csv_writer.writerows(serializer.data)
    return JsonResponse(
        {"export_csv": csv_string.getvalue()},
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
# TODO Check all affected assets for datacenter-level permissions
def network_bulk_upload(request):
    data = JSONParser().parse(request)
    if 'import_csv' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.IMPORT_ERROR.value +
                    BulkFailure.IMPORT.value,
                "errors":
                    "Bulk upload request should have a parameter 'import_csv'"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    base_64_csv = data['import_csv']
    csv_bytes_io = BytesIO(
        b64decode(re.sub(".*base64,", '', base_64_csv))
    )
    csv_string_io = StringIO(csv_bytes_io.read().decode('UTF-8'))
    csvReader = csv.DictReader(csv_string_io)
    expected_fields = BulkNetworkPortSerializer.Meta.fields
    given_fields = csvReader.fieldnames
    if (
        len(expected_fields) != len(given_fields)  # check for repeated fields
        or set(expected_fields) != set(given_fields)
    ):
        return JsonResponse(
            {
                "failure_message":
                    Status.IMPORT_ERROR.value +
                    BulkFailure.IMPORT_COLUMNS.value
            },
            status=HTTPStatus.BAD_REQUEST
        )
    bulk_network_port_datas = []
    for row in csvReader:
        bulk_network_port_datas.append(dict(row))
    num_ports_ignored = 0
    modifications_to_approve = []
    for bulk_network_port_data in bulk_network_port_datas:
        if (
            'src_hostname' not in bulk_network_port_data
            or not bulk_network_port_data['src_hostname']
        ):
            failure_message = \
                Status.IMPORT_ERROR.value + \
                "Field 'src_hostname' is required for all network imports."
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        if (
            'src_port' not in bulk_network_port_data
            or not bulk_network_port_data['src_port']
        ):
            failure_message = \
                Status.IMPORT_ERROR.value + \
                "Field 'src_port' is required for all network imports."
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        try:
            source_asset = Asset.objects.get(
                hostname=bulk_network_port_data['src_hostname']
            )
        except ObjectDoesNotExist:
            failure_message = \
                Status.IMPORT_ERROR.value + \
                "Source asset '" + \
                bulk_network_port_data['src_hostname'] + \
                "' does not exist. "
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        try:
            existing_port = NetworkPort.objects.get(
                asset=source_asset,
                port_name=bulk_network_port_data['src_port']
            )
        except ObjectDoesNotExist:
            failure_message = \
                Status.IMPORT_ERROR.value + \
                "Source port '" + \
                bulk_network_port_data['src_port'] + \
                "' does not exist on asset '" + \
                bulk_network_port_data['src_hostname'] + \
                "'. "
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST
            )
        existing_port_serializer = BulkNetworkPortSerializer(existing_port)
        if records_are_identical(
            bulk_network_port_data,
            existing_port_serializer.data
        ):
            num_ports_ignored += 1
        else:
            modifications_to_approve.append(
                {
                    "existing": existing_port_serializer.data,
                    "modified": bulk_network_port_data
                }
            )
    # all network connections are modifications,
    # because bulk import can't be used to create new ports
    response = {
        "added": 0,
        "ignored": num_ports_ignored,
        "modifications": modifications_to_approve
    }
    log_bulk_upload(
        request.user,
        ElementType.NETWORK_CONNECTIONS,
        0,
        num_ports_ignored,
        len(modifications_to_approve)
    )
    return JsonResponse(
        response,
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_required(PermissionPath.ASSET_WRITE.value, raise_exception=True)
# TODO Check all assets for datacenter-level permissions
def network_bulk_approve(request):
    data = JSONParser().parse(request)
    if 'approved_modifications' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.IMPORT_ERROR.value +
                    BulkFailure.IMPORT.value,
                "errors":
                    "Bulk approve request should have a parameter " +
                    "'approved_modifications'"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    network_datas = data['approved_modifications']
    warning_message = ""
    for network_data in network_datas:
        source_asset = Asset.objects.get(
            hostname=network_data['src_hostname']
        )
        source_asset_data = RecursiveAssetSerializer(source_asset).data
        mac_address, network_connection = normalize_bulk_network_data(
            network_data
        )
        source_asset_data['mac_addresses'] = mac_address
        source_asset_data['network_connections'] = network_connection
        try:
            save_mac_addresses(
                asset_data=source_asset_data,
                asset_id=source_asset.id
            )
        except MacAddressException as error:
            warning_message += \
                "Some mac addresses couldn't be saved. " + \
                str(error)
        try:
            save_network_connections(
                asset_data=source_asset_data,
                asset_id=source_asset.id
            )
        except NetworkConnectionException as error:
            warning_message += \
                "Some network connections couldn't be saved. " + \
                str(error)
    log_bulk_approve(
        request.user,
        ElementType.NETWORK_CONNECTIONS,
        len(network_datas)
    )
    if warning_message:
        return JsonResponse(
            {"warning_message": warning_message},
            status=HTTPStatus.OK,
        )
    else:
        return JsonResponse(
            {
                "success_message":
                    "All network connections created succesfully."
            },
            status=HTTPStatus.OK,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def network_bulk_export(request):
    assets_query = Asset.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.EXPORT_ERROR.value + GenericFailure.FILTER.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        assets_query = assets_query.filter(**filter_arg)

    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.EXPORT_ERROR.value + GenericFailure.SORT.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    assets = assets_query.order_by(*sort_args)
    all_ports = []
    for asset in assets:
        ports = NetworkPort.objects.filter(asset=asset)
        for port in ports:
            if port.asset.hostname:
                all_ports.append(port)
    serializer = BulkNetworkPortSerializer(all_ports, many=True)
    csv_string = StringIO()
    fields = BulkNetworkPortSerializer.Meta.fields
    print(fields)
    csv_writer = csv.DictWriter(csv_string, fields)
    csv_writer.writeheader()
    csv_writer.writerows(serializer.data)
    return JsonResponse(
        {"export_csv": csv_string.getvalue()},
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def asset_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
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
    assets_query = Asset.objects
    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.FILTER.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        assets_query = assets_query.filter(**filter_arg)
    asset_count = assets_query.count()
    page_count = math.ceil(asset_count / page_size)
    return JsonResponse({"page_count": page_count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def asset_fields(request):
    """
    Return all fields on the AssetSerializer.
    """
    return JsonResponse(
        {"fields": [
            'asset_number',
            'hostname',
            'model',
            'rack',
            'rack_position',
            'owner',
            'comment',
        ]},
        status=HTTPStatus.OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def asset_number(request):
    """
    Get a suggest asset number for Asset creation
    """
    return JsonResponse(
        {"asset_number": get_next_available_asset_number()}
    )
