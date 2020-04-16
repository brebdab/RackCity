from django.http import JsonResponse
from rackcity.models import Rack, Asset, PowerPort, PowerPortCP
from rackcity.api.serializers import serialize_power_connections
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    PowerFailure,
    AuthFailure,
)
from rackcity.utils.log_utils import (
    log_power_action,
    PowerAction,
)
from rackcity.permissions.permissions import user_has_power_permission
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes, api_view
from http import HTTPStatus
import re
import requests
import time
from requests.exceptions import ConnectionError
from rackcity.models.asset import get_assets_for_cp
from rackcity.utils.change_planner_utils import get_change_plan
from rackcity.utils.exceptions import (
    PowerManagementException,
    UserPowerPermissionException,
)
import os
from django.core.exceptions import ObjectDoesNotExist


BCMAN_URL = "hyposoft-mgt.colab.duke.edu"
PDU_URL = "http://hyposoft-mgt.colab.duke.edu:8005/"
# Need to specify rack + side in request, e.g. for A1 left, use A01L
GET_PDU = "pdu.php?pdu=hpdu-rtp1-"
TOGGLE_PDU = "power.php"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pdu_power_status(request, id):
    """
    Get status of all power ports for an asset in
    network controlled PDU datacenter.
    """
    try:
        asset = Asset.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Asset"
                + GenericFailure.DOES_NOT_EXIST.value
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if not is_asset_power_controllable_by_pdu(asset):
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Power is not network controllable on this rack."
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    power_connections = serialize_power_connections(PowerPort, asset)
    # Get string parameter representing rack number (i.e. A01<L/R>)
    rack_str = str(asset.rack.row_letter)
    if (asset.rack.rack_num / 10) < 1:
        rack_str = rack_str + "0"
    rack_str = rack_str + str(asset.rack.rack_num)
    power_status = dict()
    for power_connection in power_connections:
        try:
            html = requests.get(
                PDU_URL
                + GET_PDU
                + rack_str
                + str(power_connections[power_connection]["left_right"]),
                timeout=5,
            )
        except ConnectionError:
            return JsonResponse(
                {
                    "failure_message": Status.CONNECTION.value
                    + PowerFailure.CONNECTION.value
                },
                status=HTTPStatus.REQUEST_TIMEOUT,
            )
        power_status[power_connection] = regex_power_status(
            html.text, power_connections[power_connection]["port_number"]
        )[0]
    return JsonResponse(
        {"power_connections": power_connections, "power_status": power_status},
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pdu_power_on(request):
    """
    Turn on power to specified port
    """
    try:
        asset = get_pdu_power_request_parameters(request)
    except PowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except UserPowerPermissionException as error:
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": str(error),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    power_connections = serialize_power_connections(PowerPort, asset)
    # Check power is off
    for connection in power_connections:
        try:
            html = requests.get(
                PDU_URL
                + GET_PDU
                + get_pdu_status_ext(
                    asset, str(power_connections[connection]["left_right"])
                )
            )
        except ConnectionError:
            return JsonResponse(
                {
                    "failure_message": Status.CONNECTION.value
                    + PowerFailure.CONNECTION.value
                },
                status=HTTPStatus.REQUEST_TIMEOUT,
            )
        power_status = regex_power_status(
            html.text, power_connections[connection]["port_number"]
        )[0]
        if power_status != "ON":
            toggle_pdu_power(asset, connection, "on")
    log_power_action(
        request.user, PowerAction.ON, asset,
    )
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + "Power turned on."},
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pdu_power_off(request):
    """
    Turn on power to specified port
    """
    try:
        asset = get_pdu_power_request_parameters(request)
    except PowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except UserPowerPermissionException as error:
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": str(error),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    power_connections = serialize_power_connections(PowerPort, asset)
    # Check power is off
    for connection in power_connections:
        try:
            html = requests.get(
                PDU_URL
                + GET_PDU
                + get_pdu_status_ext(
                    asset, str(power_connections[connection]["left_right"])
                )
            )
        except ConnectionError:
            return JsonResponse(
                {
                    "failure_message": Status.CONNECTION.value
                    + PowerFailure.CONNECTION.value
                },
                status=HTTPStatus.REQUEST_TIMEOUT,
            )
        power_status = regex_power_status(
            html.text, power_connections[connection]["port_number"]
        )[0]
        if power_status == "ON":
            toggle_pdu_power(asset, connection, "off")
    log_power_action(
        request.user, PowerAction.OFF, asset,
    )
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + "Power turned off."},
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pdu_power_cycle(request):
    try:
        asset = get_pdu_power_request_parameters(request)
    except PowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except UserPowerPermissionException as error:
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": str(error),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    power_connections = serialize_power_connections(PowerPort, asset)
    for connection in power_connections:
        toggle_pdu_power(asset, connection, "off")
    time.sleep(2)
    for connection in power_connections:
        toggle_pdu_power(asset, connection, "on")
    log_power_action(request.user, PowerAction.CYCLE, asset)
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + "Power cycled, all asset power ports reset."
        },
        status=HTTPStatus.OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def pdu_port_availability(request):
    rack_id = request.query_params.get("id")
    if not rack_id:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Query parameter 'id' is required",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        rack = Rack.objects.get(id=rack_id)
    except Rack.DoesNotExist:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value
                + "Rack"
                + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing rack with id=" + str(rack_id),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    if change_plan:
        assets, assets_cp = get_assets_for_cp(change_plan.id)
        assets_cp = assets_cp.filter(rack=rack.id)
        assets = assets.filter(rack=rack.id)
    else:
        assets_cp = None
        assets = Asset.objects.filter(rack=rack.id)
    available_left = list(range(1, 25))
    available_right = list(range(1, 25))
    try:
        remove_unavailable_pdu_ports(available_left, available_right, assets, PowerPort)
    except Exception as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    if change_plan:
        try:
            remove_unavailable_pdu_ports(
                available_left, available_right, assets_cp, PowerPortCP
            )
        except Exception as error:
            return JsonResponse(
                {"failure_message": Status.ERROR.value + str(error)},
                status=HTTPStatus.BAD_REQUEST,
            )
    suggest = None
    for index in available_left:
        if index in available_right:
            suggest = index
            break
    return JsonResponse(
        {
            "left_available": available_left,
            "right_available": available_right,
            "left_suggest": suggest,
            "right_suggest": suggest,
        },
        status=HTTPStatus.OK,
    )


def remove_unavailable_pdu_ports(
    available_left, available_right, assets, power_port_model
):
    for asset in assets:
        asset_power = serialize_power_connections(power_port_model, asset)
        for port_num in asset_power.keys():
            if asset_power[port_num]["left_right"] == "L":
                try:
                    available_left.remove(asset_power[port_num]["port_number"])
                except ValueError:
                    raise Exception(
                        "Port "
                        + asset_power[port_num]["port_number"]
                        + " does not exist on PDU. "
                    )
            else:
                try:
                    available_right.remove(asset_power[port_num]["port_number"])
                except ValueError:
                    raise Exception(
                        "Port "
                        + asset_power[port_num]["port_number"]
                        + " does not exist on PDU. "
                    )


def regex_power_status(html, port):
    status_pattern = re.search("<td>" + str(port) + "<td><span.+(ON|OFF)", html)
    return status_pattern.groups(1)


def get_pdu_status_ext(asset, left_right):
    rack_str = str(asset.rack.row_letter)
    if (asset.rack.rack_num / 10) < 1:
        rack_str = rack_str + "0"
    rack_str = rack_str + str(asset.rack.rack_num)

    return rack_str + left_right


def toggle_pdu_power(asset, asset_port_number, goal_state):
    power_connections = serialize_power_connections(PowerPort, asset)
    pdu_port = power_connections[asset_port_number]["port_number"]
    pdu = "hpdu-rtp1-" + get_pdu_status_ext(
        asset, str(power_connections[asset_port_number]["left_right"])
    )
    try:
        requests.post(
            PDU_URL + TOGGLE_PDU, {"pdu": pdu, "port": pdu_port, "v": goal_state}
        )
    except ConnectionError:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + PowerFailure.CONNECTION.value
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    return


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chassis_power_status(request):
    try:
        chassis, blade_slot = get_chassis_power_request_parameters(request)
    except PowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except UserPowerPermissionException as error:
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": str(error),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    result, exit_status = make_bcman_request(chassis.hostname, str(blade_slot), "")
    if exit_status != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    if "is ON" in result:
        blade_slot_power_status = "ON"
    elif "is OFF" in result:
        blade_slot_power_status = "OFF"
    else:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Power status returned as: " + result,
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    return JsonResponse(
        {"power_status": blade_slot_power_status}, status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chassis_power_on(request):
    try:
        chassis, blade_slot = get_chassis_power_request_parameters(request)
    except PowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except UserPowerPermissionException as error:
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": str(error),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    result, exit_status = make_bcman_request(chassis.hostname, str(blade_slot), "on")
    if exit_status != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    log_power_action(request.user, PowerAction.ON, chassis, blade_slot=blade_slot)
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + result}, status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chassis_power_off(request):
    try:
        chassis, blade_slot = get_chassis_power_request_parameters(request)
    except PowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except UserPowerPermissionException as error:
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": str(error),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    result, exit_status = make_bcman_request(chassis.hostname, str(blade_slot), "off")
    if exit_status != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    log_power_action(request.user, PowerAction.OFF, chassis, blade_slot=blade_slot)
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + result}, status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chassis_power_cycle(request):
    try:
        chassis, blade_slot = get_chassis_power_request_parameters(request)
    except PowerManagementException as error:
        return JsonResponse(
            {"failure_message": Status.ERROR.value + str(error)},
            status=HTTPStatus.BAD_REQUEST,
        )
    except UserPowerPermissionException as error:
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.POWER.value,
                "errors": str(error),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    result_off, exit_status_off = make_bcman_request(
        chassis.hostname, str(blade_slot), "off"
    )
    if exit_status_off != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status_off),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    time.sleep(2)
    result_on, exit_status_on = make_bcman_request(
        chassis.hostname, str(blade_slot), "on"
    )
    if exit_status_on != 0:
        return JsonResponse(
            {
                "failure_message": Status.CONNECTION.value
                + "Unable to contact network controlled blade chassis power management.",
                "errors": "Request to bcman exited with non-zero status: "
                + str(exit_status_on),
            },
            status=HTTPStatus.REQUEST_TIMEOUT,
        )
    result = (
        "chassis '" + chassis.hostname + "' blade " + str(blade_slot) + "' power cycled"
    )
    log_power_action(request.user, PowerAction.CYCLE, chassis, blade_slot=blade_slot)
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + result}, status=HTTPStatus.OK,
    )


def make_bcman_request(chassis, blade, power_command):
    user = os.environ["BCMAN_USERNAME"]
    options = os.environ["BCMAN_OPTIONS"]
    password = os.environ["BCMAN_PASSWORD"]
    cmd = "rackcity/utils/bcman.expect '{}' '{}' '{}' '{}' '{}' '{}' '{}' > temp.txt".format(
        user, BCMAN_URL, options, password, chassis, blade, power_command,
    )
    exit_status = os.system(cmd)
    result = None
    if os.path.exists("temp.txt") and (exit_status == 0):
        fp = open("temp.txt", "r")
        result = fp.read().splitlines()[0]
        fp.close()
        os.remove("temp.txt")
    return result, exit_status


def get_chassis_power_request_parameters(request):
    data = JSONParser().parse(request)
    if ("chassis_id" not in data) or ("blade_slot" not in data):
        raise PowerManagementException(
            "Must specify 'chassis_id' and 'blade_slot' on chassis power request. "
        )
    try:
        blade_slot = int(data["blade_slot"])
        chassis_id = int(data["chassis_id"])
    except ValueError:
        raise PowerManagementException(
            "Parameters 'chassis_id' and 'blade_slot' must be of type int. "
        )
    try:
        chassis = Asset.objects.get(id=chassis_id)
    except ObjectDoesNotExist:
        raise PowerManagementException("Chassis" + GenericFailure.DOES_NOT_EXIST.value)
    if not user_has_power_permission(request.user, asset=chassis):
        raise UserPowerPermissionException(
            "User "
            + request.user.username
            + " does not have power permission and does not own asset with id="
            + str(data["id"])
            + ". "
        )
    if not is_asset_power_controllable_by_bcman(chassis):
        raise PowerManagementException(
            "Power is only network controllable for blade chassis "
            + "that are of vendor 'BMI', have valid hostnames, and are not in storage. "
        )
    if (blade_slot < 1) or (blade_slot > 14):
        raise PowerManagementException(
            "Blade slot " + str(blade_slot) + " does not exist on chassis. "
        )
    return chassis, blade_slot


def get_pdu_power_request_parameters(request):
    data = JSONParser().parse(request)
    if "id" not in data:
        raise PowerManagementException("Must specify 'id' on pdu power request. ")
    try:
        asset = Asset.objects.get(id=data["id"])
    except ObjectDoesNotExist:
        raise PowerManagementException(
            "Asset" + GenericFailure.DOES_NOT_EXIST.value + ". "
        )
    if not user_has_power_permission(request.user, asset=asset):
        raise UserPowerPermissionException(
            "User "
            + request.user.username
            + " does not have power permission and does not own asset with id="
            + str(data["id"])
            + ". "
        )
    if not is_asset_power_controllable_by_pdu(asset):
        raise PowerManagementException(
            "Power is not network controllable on this rack. "
        )
    return asset


def is_asset_power_controllable_by_bcman(asset):
    return (
        asset.model.is_blade_chassis()
        and not asset.is_in_offline_storage()
        and asset.model.vendor == "BMI"
        and asset.hostname is not None
        and "-" not in asset.hostname
    )


def is_asset_power_controllable_by_pdu(asset):
    return (
        asset.model.is_rackmount()
        and not asset.is_in_offline_storage()
        and asset.rack.is_network_controlled
    )
