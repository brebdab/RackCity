from django.http import JsonResponse
from rackcity.models import (
    Asset,
    AssetCP,
    DecommissionedAsset,
    ITModel,
    Rack,
    NetworkPort,
    NetworkPortCP,
    PowerPort,
    PowerPortCP,
    PDUPort,
    PDUPortCP,
    Datacenter,
    ChangePlan,
)
import traceback
from rackcity.models.asset import get_assets_for_cp
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from rackcity.api.serializers import (
    AssetSerializer,
    AssetCPSerializer,
    GetDecommissionedAssetSerializer,
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
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
    BulkFailure,
    AuthFailure,
)
from rackcity.permissions.permissions import user_has_asset_permission
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
from http import HTTPStatus
import csv
from base64 import b64decode
import re
from io import StringIO, BytesIO
from rackcity.utils.query_utils import (
    get_sort_arguments,
    get_filter_arguments,
    get_page_count_response,
    get_many_response,
)
from rackcity.utils.change_planner_utils import (
    get_many_assets_response_for_cp,
    get_page_count_response_for_cp,
    get_cp_already_executed_response,
)
from rackcity.views.rackcity_utils import (
    validate_asset_location,
    validate_location_modification,
    no_infile_location_conflicts,
    records_are_identical,
    LocationException,
    MacAddressException,
    PowerConnectionException,
    NetworkConnectionException,
    get_change_plan
)
from rackcity.models.asset import get_next_available_asset_number, validate_asset_number_uniqueness


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def asset_many(request):
    """
    List many assets. If page is not specified as a query parameter, all
    assets are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """
    if request.query_params.get('change_plan'):
        (change_plan, response) = get_change_plan(
            request.query_params.get('change_plan')
        )
        if response:
            return response
        else:
            return get_many_assets_response_for_cp(
                request,
                change_plan,
            )
    else:
        return get_many_response(
            Asset,
            RecursiveAssetSerializer,
            "assets",
            request,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def asset_detail(request, id):
    """
    Retrieve a single asset.
    """
    change_plan = None
    serializer = None
    if request.query_params.get("change_plan"):
        (change_plan, response) = get_change_plan(
            request.query_params.get("change_plan"))
        if response:
            return response
    try:
        if change_plan:
            assets, assets_cp = get_assets_for_cp(
                change_plan.id, show_decommissioned=True)
            # if id of live asset is given on a change plan, just return the corresponding related assetCP
            if assets_cp.filter(related_asset=id).exists():
                asset = assets_cp.get(related_asset=id)
                serializer = RecursiveAssetCPSerializer(asset)
            elif assets_cp.filter(id=id).exists():
                asset = assets_cp.get(id=id)
                serializer = RecursiveAssetCPSerializer(asset)
            else:
                asset = assets.get(id=id)
                serializer = RecursiveAssetSerializer(asset)
        else:
            asset = Asset.objects.get(id=id)
            serializer = RecursiveAssetSerializer(asset)
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

    return JsonResponse(serializer.data, status=HTTPStatus.OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
    change_plan = None
    if request.query_params.get("change_plan"):
        (change_plan, response) = get_change_plan(
            request.query_params.get("change_plan"))
        if response:
            return response
        response = get_cp_already_executed_response(change_plan)
        if response:
            return response
        data["change_plan"] = change_plan.id
        serializer = AssetCPSerializer(data=data)
    else:
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
    try:
        rack = Rack.objects.get(id=rack_id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Rack" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing rack with id="+str(rack_id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    if not user_has_asset_permission(request.user, rack.datacenter):
        return JsonResponse(
            {
                "failure_message":
                    Status.AUTH_ERROR.value + AuthFailure.ASSET.value,
                "errors":
                    "User " + request.user.username +
                    " does not have asset permission in datacenter id="
                    + str(rack.datacenter.id)
            },
            status=HTTPStatus.UNAUTHORIZED
        )
    rack_position = serializer.validated_data['rack_position']
    height = serializer.validated_data['model'].height

    try:
        validate_asset_location(
            rack_id,
            rack_position,
            height,
            change_plan=change_plan
        )
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
    # TODO: CHANGE PLAN save power connections and network connections

    try:
        save_mac_addresses(
            asset_data=data,
            asset_id=asset.id,
            change_plan=change_plan
        )
    except MacAddressException as error:
        warning_message += "Some mac addresses couldn't be saved. " + \
            str(error)

    try:
        save_power_connections(
            asset_data=data,
            asset_id=asset.id,
            change_plan=change_plan
        )
    except PowerConnectionException as error:
        warning_message += "Some power connections couldn't be saved. " + \
            str(error)
    try:
        save_network_connections(
            asset_data=data,
            asset_id=asset.id,
            change_plan=change_plan
        )
        if not change_plan:
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
        if change_plan:
            return JsonResponse(
                {
                    "success_message":
                        Status.SUCCESS.value +
                        "Asset created on change plan " +
                        change_plan.name,
                    "related_id": change_plan.id,
                },
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


def save_mac_addresses(asset_data, asset_id, change_plan=None):
    if (
        'mac_addresses' not in asset_data
        or not asset_data['mac_addresses']
    ):
        return
    mac_address_assignments = asset_data['mac_addresses']
    failure_message = ""
    for port_name in mac_address_assignments.keys():
        try:
            if change_plan:
                network_port = NetworkPortCP.objects.get(
                    asset=asset_id,
                    port_name=port_name,
                    change_plan=change_plan
                )
            else:
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


def save_network_connections(asset_data, asset_id, change_plan=None):
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
            if change_plan:
                network_port = NetworkPortCP.objects.get(
                    asset=asset_id,
                    port_name=port_name,
                    change_plan=change_plan)
            else:
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
          
                if change_plan:
                    # need to add deleted connection's asset to asset change plan
                    asset_cp = AssetCP.objects.get(id=asset_id)
                    if asset_cp.related_asset_id:
                        asset_live = Asset.objects.get(id=asset_cp.related_asset_id)
                        network_port_live = NetworkPort.objects.get(asset=asset_live,port_name=port_name)
                        if network_port_live.connected_port:
                            destination_port_live = NetworkPort.objects.filter(id=network_port_live.connected_port_id)[0]
                            destination_asset_live = Asset.objects.get(id=destination_port_live.asset_id)
                            destination_asset_cp = AssetCP(
                                related_asset=destination_asset_live,
                                change_plan=change_plan
                            )
                        # add destination asset to AssetCPTable
                        for field in destination_asset_live._meta.fields:
                            
                            if field.name != 'id' and field.name != "assetid_ptr":
                                setattr(destination_asset_cp, field.name, getattr(
                                    destination_asset_live, field.name))

                        destination_asset_cp.save()
                        dest_network_ports_live = NetworkPort.objects.filter(asset=destination_asset_live)
                        for dest_network_port_live in dest_network_ports_live:
                            dest_network_port_cp = NetworkPortCP.objects.get(
                                asset=destination_asset_cp,
                                port_name=dest_network_port_live.port_name)
                            dest_network_port_cp.mac_address = dest_network_port_live.mac_address
                            if dest_network_port_live.connected_port and not (dest_network_port_live.connected_port.port_name == port_name):
                                dest_network_port_cp.connected_port = dest_network_port_live.connected_port
                            dest_network_port_cp.save()
                        dest_power_ports_live = PowerPort.objects.filter(asset=destination_asset_live)
                        for dest_power_port_live in dest_power_ports_live:
                            dest_power_port_cp = PowerPortCP.objects.get(
                                asset=destination_asset_cp,
                                port_name=dest_power_port_live.port_name
                            )
                            dest_pdu_live = dest_power_port_live.power_connection
                            if dest_pdu_live:
                                if PDUPortCP.objects.filter(
                                    rack=dest_pdu_live.rack,
                                    left_right=dest_pdu_live.left_right,
                                    port_number=dest_pdu_live.port_number,
                                    change_plan=change_plan
                                ).exists():
                                    pdu_port = PDUPortCP.objects.filter(
                                        rack=dest_pdu_live.rack,
                                        left_right=dest_pdu_live.left_right,
                                        port_number=dest_pdu_live.port_number,
                                        change_plan=change_plan
                                    )
                                else:
                                    pdu_port = PDUPortCP(change_plan=change_plan)
                                    for field in dest_pdu_live._meta.fields:
                                        if field.name != "id":
                                            setattr(pdu_port, field.name, getattr(
                                                dest_pdu_live, field.name))
                                    pdu_port.save()
                                dest_power_port_cp.power_connection = pdu_port
                                dest_power_port_cp.save()

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
                if change_plan:
                    assets, assets_cp = get_assets_for_cp(change_plan.id)
                    if assets.filter(hostname=network_connection['destination_hostname']).exists():
                        destination_asset = assets.get(
                            hostname=network_connection['destination_hostname']
                        )
                        asset_cp = AssetCP(
                            related_asset=destination_asset,
                            change_plan=change_plan
                        )
                        # add destination asset to AssetCPTable
                        for field in destination_asset._meta.fields:
                            if field.name != 'id' and field.name != "assetid_ptr":
                                setattr(asset_cp, field.name, getattr(
                                    destination_asset, field.name))
                        asset_cp.save()
                        dest_network_ports_live = NetworkPort.objects.filter(asset=destination_asset)
                        for dest_network_port_live in dest_network_ports_live:
                            dest_network_port_cp = NetworkPortCP.objects.get(
                                asset=asset_cp,
                                port_name=dest_network_port_live.port_name)
                            dest_network_port_cp.mac_address = dest_network_port_live.mac_address
                            dest_network_port_cp.save()
                        
                        dest_power_ports_live = PowerPort.objects.filter(asset=destination_asset)
                        for dest_power_port_live in dest_power_ports_live:
                            dest_power_port_cp = PowerPortCP.objects.get(
                                asset=asset_cp,
                                port_name=dest_power_port_live.port_name
                            )
                            print(dest_power_port_live)
                            dest_pdu_live = dest_power_port_live.power_connection
                            if dest_pdu_live:
                                if PDUPortCP.objects.filter(
                                    rack=dest_pdu_live.rack,
                                    left_right=dest_pdu_live.left_right,
                                    port_number=dest_pdu_live.port_number,
                                    change_plan=change_plan
                                ).exists():
                                    pdu_port = PDUPortCP.objects.filter(
                                        rack=dest_pdu_live.rack,
                                        left_right=dest_pdu_live.left_right,
                                        port_number=dest_pdu_live.port_number,
                                        change_plan=change_plan
                                    )
                                else:
                                    pdu_port = PDUPortCP(change_plan=change_plan)
                                    for field in dest_pdu_live._meta.fields:
                                        if field.name != "id":
                                            setattr(pdu_port, field.name, getattr(
                                                dest_pdu_live, field.name))
                                    pdu_port.save()
                                dest_power_port_cp.power_connection = pdu_port
                                dest_power_port_cp.save()
                        destination_asset = asset_cp
                            
                    else:
                        destination_asset = assets_cp.get(
                            hostname=network_connection['destination_hostname'],
                            change_plan=change_plan,
                        )
                else:
                    destination_asset = Asset.objects.get(
                        hostname=network_connection['destination_hostname']
                    )
            except ObjectDoesNotExist:
                track = traceback.format_exc()
                print(track)

                failure_message += \
                    "Asset with hostname '" + \
                    network_connection['destination_hostname'] + \
                    "' does not exist. "
            else:
                try:
                    if change_plan:
                        destination_port = NetworkPortCP.objects.get(
                            asset=destination_asset,
                            port_name=network_connection['destination_port'],
                            change_plan=change_plan
                        )
                    else:
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


def save_power_connections(asset_data, asset_id, change_plan=None):
    if (
        'power_connections' not in asset_data
        or not asset_data['power_connections']
    ):
        return
    power_connection_assignments = asset_data['power_connections']
    failure_message = ""
    for port_name in power_connection_assignments.keys():
        try:
            if change_plan:
                power_port = PowerPortCP.objects.get(
                    asset=asset_id,
                    port_name=port_name,
                    change_plan=change_plan.id
                )
            else:
                power_port = PowerPort.objects.get(
                    asset=asset_id,
                    port_name=port_name
                )
        except ObjectDoesNotExist:
            failure_message += "Power port '"+port_name+"' does not exist on this asset. "
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
                    left_right=power_connection_data['left_right'],
                    port_number=power_connection_data['port_number']
                )
                pdu_port = pdu_port_master
                if change_plan:
                    if PDUPortCP.objects.filter(
                        rack=asset.rack,
                        left_right=power_connection_data['left_right'],
                        port_number=power_connection_data['port_number'],
                        change_plan=change_plan
                    ).exists():
                        pdu_port = PDUPortCP.objects.get(
                            rack=asset.rack,
                            left_right=power_connection_data['left_right'],
                            port_number=power_connection_data['port_number'],
                            change_plan=change_plan
                        )
                    else:
                        pdu_port = PDUPortCP(change_plan=change_plan)
                        for field in pdu_port_master._meta.fields:
                            if field.name != "id":
                                setattr(pdu_port, field.name, getattr(
                                    pdu_port_master, field.name))
                        pdu_port.save()
                
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
@permission_classes([IsAuthenticated])
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
    if request.query_params.get("change_plan"):
        (change_plan, response) = get_change_plan(
            request.query_params.get("change_plan"))
        if response:
            return response
        response = get_cp_already_executed_response(change_plan)
        if response:
            return response
        del data['id']
    else:
        change_plan = None

    if change_plan:
        assets, assets_cp = get_assets_for_cp(change_plan.id)
        if assets_cp.filter(id=id).exists():
            # if asset was created on a change_plan
            existing_asset = assets_cp.get(id=id)
        else:
            try:
                existing_asset_master = assets.get(id=id)
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
            existing_asset = AssetCP(
                change_plan=change_plan,
                related_asset=existing_asset_master)
            for field in existing_asset_master._meta.fields:
                if not (field.name == "id" or field.name == "assetid_ptr"):
                    setattr(existing_asset, field.name, getattr(
                        existing_asset_master, field.name))
    else:
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

    if not user_has_asset_permission(
        request.user,
        existing_asset.rack.datacenter
    ):
        return JsonResponse(
            {
                "failure_message":
                    Status.AUTH_ERROR.value + AuthFailure.ASSET.value,
                "errors":
                    "User " + request.user.username +
                    " does not have asset permission in datacenter id="
                    + str(existing_asset.rack.datacenter.id)
            },
            status=HTTPStatus.UNAUTHORIZED
        )
    try:
        validate_location_modification(
            data, existing_asset, request.user, change_plan=change_plan)
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
            if change_plan:
                assets, assets_cp = get_assets_for_cp(change_plan.id)
                assets_with_hostname = assets.filter(
                    hostname__iexact=data[field]
                )
                if not (
                    len(assets_with_hostname) > 0
                    and assets_with_hostname[0].id != id
                ):
                    assets_with_hostname = assets_cp.filter(
                        hostname__iexact=data[field]
                    )
            else:
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
            if change_plan:
                try:
                    validate_asset_number_uniqueness(
                        data[field], id, change_plan, existing_asset.related_asset)
                except ValidationError:
                    return JsonResponse(
                        {
                            "failure_message":
                                Status.MODIFY_ERROR.value +
                                "Asset with asset number '" +
                                str(data[field]) + "' already exists."
                        },
                        status=HTTPStatus.BAD_REQUEST,
                    )

            else:
                assets_with_asset_number = Asset.objects.filter(
                    asset_number=data[field]
                )
                if (
                    data[field] and len(assets_with_asset_number) > 0
                    and assets_with_asset_number[0].id != existing_asset.id
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
                asset_id=existing_asset.id,
                change_plan=change_plan
            )
        except MacAddressException as error:
            warning_message += "Some mac addresses couldn't be saved. " + \
                str(error)
        try:
            save_power_connections(
                asset_data=data,
                asset_id=existing_asset.id,
                change_plan=change_plan
            )
        except PowerConnectionException as error:
            warning_message += "Some power connections couldn't be saved. " + \
                str(error)
        try:
            save_network_connections(
                asset_data=data,
                asset_id=existing_asset.id,
                change_plan=change_plan
            )
            if not change_plan:
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
            if not change_plan:
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
            else:
                return JsonResponse(
                    {
                        "success_message":
                            Status.SUCCESS.value +
                            "Asset modified on change plan " +
                            change_plan.name,
                        "related_id": change_plan.id,
                    },
                    status=HTTPStatus.OK,
                )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
    if not user_has_asset_permission(
        request.user,
        existing_asset.rack.datacenter
    ):
        return JsonResponse(
            {
                "failure_message":
                    Status.AUTH_ERROR.value + AuthFailure.ASSET.value,
                "errors":
                    "User " + request.user.username +
                    " does not have asset permission in datacenter id="
                    + str(existing_asset.rack.datacenter.id)
            },
            status=HTTPStatus.UNAUTHORIZED
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
@permission_classes([IsAuthenticated])
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
    csv_string_io = StringIO(csv_bytes_io.read().decode('UTF-8-SIG'))
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
                validate_location_modification(
                    asset_data,
                    existing_asset,
                    request.user,
                )
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
            rack = asset_serializer.validated_data['rack']
            if not user_has_asset_permission(request.user, rack.datacenter):
                return JsonResponse(
                    {
                        "failure_message":
                            Status.AUTH_ERROR.value + AuthFailure.ASSET.value,
                        "errors":
                            "User " + request.user.username +
                            " does not have asset permission in datacenter id="
                            + str(rack.datacenter.id)
                    },
                    status=HTTPStatus.UNAUTHORIZED
                )
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
    csv_string_io = StringIO(csv_bytes_io.read().decode('UTF-8-SIG'))
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
        if not user_has_asset_permission(
            request.user,
            source_asset.rack.datacenter
        ):
            return JsonResponse(
                {
                    "failure_message":
                        Status.AUTH_ERROR.value + AuthFailure.ASSET.value,
                    "errors":
                        "User " + request.user.username +
                        " does not have asset permission in datacenter id="
                        + str(source_asset.rack.datacenter.id)
                },
                status=HTTPStatus.UNAUTHORIZED
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
@permission_classes([IsAuthenticated])
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
    change_plan = None
    if request.query_params.get("change_plan"):
        (change_plan, response) = get_change_plan(
            request.query_params.get("change_plan")
        )
        if response:
            return response
    if change_plan:
        return get_page_count_response_for_cp(request, change_plan)
    else:
        return get_page_count_response(
            Asset,
            request.query_params,
            data_for_filters=request.data,
        )


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
