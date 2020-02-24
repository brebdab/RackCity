from django.http import JsonResponse
from rackcity.models import (
    Rack,
    Asset
)
from rackcity.api.serializers import (
    serialize_power_connections,
)
from rackcity.utils.log_utils import (
    log_power_action,
    PowerAction,
)
from rest_framework.parsers import JSONParser
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from http import HTTPStatus
import re
import requests
import time
from requests.exceptions import ConnectionError

pdu_url = 'http://hyposoft-mgt.colab.duke.edu:8005/'
# Need to specify rack + side in request, e.g. for A1 left, use A01L
get_pdu = 'pdu.php?pdu=hpdu-rtp1-'
toggle_pdu = 'power.php'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def power_status(request, id):
    """
    Get status of all power ports for an asset in
    network controlled PDU datacenter.
    """
    try:
        asset = Asset.objects.get(id=id)
    except Asset.DoesNotExist:
        failure_message = "No asset exists with id=" + str(id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST
        )
    power_connections = serialize_power_connections(asset)

    # get string parameter representing rack number (i.e. A01<L/R>)
    rack_str = str(asset.rack.row_letter)
    if (asset.rack.rack_num / 10 < 1):
        rack_str = rack_str + "0"
    rack_str = rack_str + str(asset.rack.rack_num)

    power_status = dict()
    for power_connection in power_connections:
        try:
            html = requests.get(pdu_url + get_pdu + rack_str +
                        str(power_connections[power_connection]['left_right']),
                        timeout=5)
        except ConnectionError:
            return JsonResponse(
                {"failure_message": "Unable to contact PDU controller. Please try again later"},
                status=HTTPStatus.REQUEST_TIMEOUT
            )
        power_status[power_connection] = regex_power_status(
            html.text, power_connections[power_connection]['port_number'])[0]

    return JsonResponse(
        {
            "power_connections": power_connections,
            "power_status": power_status
        },
        status=HTTPStatus.OK
    )


"""
TODO check that power is in opposite state when performing a toggle
TODO validate if ports exist/are connected
"""
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def power_on(request):
    """
    Turn on power to specified port
    """
    data = JSONParser().parse(request)
    if 'id' not in data.keys():
        failure_message = "No asset id given"
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        asset = Asset.objects.get(id=data['id'])
    except Asset.DoesNotExist:
        failure_message = "No asset exists with id=" + str(id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    power_connections = serialize_power_connections(asset)
    # Check power is off
    for connection in power_connections:
        try:
            html = requests.get(
                pdu_url + get_pdu + get_pdu_status_ext(
                    asset,
                    str(power_connections[connection]['left_right'])
                )
            )
        except ConnectionError:
            return JsonResponse(
                {"failure_message": "Unable to contact PDU controller. Please try again later"},
                status=HTTPStatus.REQUEST_TIMEOUT
            )
        power_status = regex_power_status(
            html.text,
            power_connections[connection]['port_number']
        )[0]
        if power_status != "ON":
            toggle_power(asset, connection, "on")
    # log_power_action(
    #     request.user,
    #     PowerAction.ON,
    #     asset,
    #     data['power_port_number'],
    # )
    return JsonResponse(
        {"success_message": "Power successfully turned on"},
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def power_off(request):
    """
    Turn on power to specified port
    """
    data = JSONParser().parse(request)
    if 'id' not in data.keys():
        failure_message = "No asset id given"
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        asset = Asset.objects.get(id=data['id'])
    except Asset.DoesNotExist:
        failure_message = "No asset exists with id=" + str(id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    power_connections = serialize_power_connections(asset)
    # Check power is off
    for connection in power_connections:
        try:
            html = requests.get(
                pdu_url + get_pdu + get_pdu_status_ext(
                    asset,
                    str(power_connections[connection]['left_right'])
                )
            )
        except ConnectionError:
            return JsonResponse(
                {"failure_message": "Unable to contact PDU controller. Please try again later"},
                status=HTTPStatus.REQUEST_TIMEOUT
            )
        power_status = regex_power_status(
            html.text,
            power_connections[connection]['port_number']
        )[0]
        if power_status == "ON":
            toggle_power(asset, connection, "off")
    # log_power_action(
    #     request.user,
    #     PowerAction.ON,
    #     asset,
    #     data['power_port_number'],
    # )
    return JsonResponse(
        {"success_message": "Power successfully turned off"},
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def power_cycle(request):
    data = JSONParser().parse(request)
    if 'id' not in data.keys():
        failure_message = "No asset id given"
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        asset = Asset.objects.get(id=data['id'])
    except Asset.DoesNotExist:
        failure_message = "No asset exists with id=" + str(id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    power_connections = serialize_power_connections(asset)
    for connection in power_connections:
        toggle_power(asset, connection, "off")
    time.sleep(2)
    for connection in power_connections:
        toggle_power(asset, connection, "on")
    log_power_action(request.user, PowerAction.CYCLE, asset)
    return JsonResponse(
        {"success_message": "Power successfully cycled, all asset power ports reset"},
        status=HTTPStatus.OK
    )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def power_availability(request):
    rack_id = request.query_params.get('id')
    print(rack_id)
    
    if not rack_id:
        return JsonResponse(
            {
                "failure_message":
                     "Must specifiy rack id",
                "errors": "Query parameter 'id' is required"
            },
            status=HTTPStatus.BAD_REQUEST
        )

    try:
        rack = Rack.objects.get(id=rack_id)
    except Rack.DoesNotExist:
        failure_message = "No rack exists with id=" + str(rack_id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    assets = Asset.objects.filter(rack=rack.id)
    availableL = list(range(1, 25))
    availableR = list(range(1, 25))
    for asset in assets:
        asset_power = serialize_power_connections(asset)
        for port_num in asset_power.keys():
            if asset_power[port_num]["left_right"] == "L":
                try:
                    availableL.remove(asset_power[port_num]["port_number"])
                except ValueError:
                    failure_message = "Port " + asset_power[port_num]["port_number"] + " does not exist on PDU"
                    return JsonResponse(
                        {"failure_message": failure_message},
                        status=HTTPStatus.BAD_REQUEST
                    )
            else:
                try:
                    availableR.remove(asset_power[port_num]["port_number"])
                except ValueError:
                    failure_message = "Port " + asset_power[port_num]["port_number"] + " does not exist on PDU"
                    return JsonResponse(
                        {"failure_message": failure_message},
                        status=HTTPStatus.BAD_REQUEST
                    )
    for index in availableL:
        if index in availableR:
            suggest = index
            break

    return JsonResponse(
        {
            "left_available": availableL,
            "right_available": availableR,
            "left_suggest": suggest,
            "right_suggest": suggest
        },
        status=HTTPStatus.OK
    )


def regex_power_status(html, port):
    status_pattern = re.search('<td>'+str(port)+'<td><span.+(ON|OFF)', html)
    return status_pattern.groups(1)


def get_pdu_status_ext(asset, left_right):
    rack_str = str(asset.rack.row_letter)
    if (asset.rack.rack_num / 10 < 1):
        rack_str = rack_str + "0"
    rack_str = rack_str + str(asset.rack.rack_num)

    return rack_str + left_right


def toggle_power(asset, asset_port_number, goal_state):
    power_connections = serialize_power_connections(asset)
    pdu_port = power_connections[asset_port_number]['port_number']
    pdu = 'hpdu-rtp1-' + \
        get_pdu_status_ext(asset, str(
            power_connections[asset_port_number]['left_right']))
    try:
        requests.post(
            pdu_url + toggle_pdu,
            {"pdu": pdu, "port": pdu_port, "v": goal_state}
        )
    except ConnectionError:
            return JsonResponse(
                {"failure_message": "Unable to contact PDU controller. Please try again later"},
                status=HTTPStatus.REQUEST_TIMEOUT
            )
    return
