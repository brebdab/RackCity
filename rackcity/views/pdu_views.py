from django.http import HttpResponse, JsonResponse
from rackcity.models import (
    Asset
)
from rackcity.api.serializers import (
    serialize_power_connections,
)
from rest_framework.parsers import JSONParser
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from http import HTTPStatus
import re
import requests

pdu_url = 'http://hyposoft-mgt.colab.duke.edu:8005/'
get_pdu = 'pdu.php?pdu=hpdu-rtp1-'  # Need to specify rack + side in request, e.g. for A1 left, use A01L
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
        failure_message = "No model exists with id=" + str(id)
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
        html = requests.get(pdu_url + get_pdu + rack_str + str(power_connections[power_connection]['left_right']))
        power_status[power_connection] = regex_power_status(html.text, power_connections[power_connection]['port_number'])[0]

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
@permission_classes([IsAdminUser])
def power_on(request):
    """
    Turn on power to specified port
    """
    toggle_power(request, "on")
    return HttpResponse(status=HTTPStatus.OK)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def power_off(request):
    """
    Turn on power to specified port
    """
    toggle_power(request, "off")
    return HttpResponse(status=HTTPStatus.OK)


def regex_power_status(html, port):
    status_pattern = re.search('<td>'+str(port)+'<td><span.+(ON|OFF)', html)
    return status_pattern.groups(1)


def get_pdu_status_ext(asset, left_right):
    rack_str = str(asset.rack.row_letter)
    if (asset.rack.rack_num / 10 < 1):
        rack_str = rack_str + "0"
    rack_str = rack_str + str(asset.rack.rack_num)

    return rack_str + left_right


def toggle_power(request, goal_state):
    data = JSONParser().parse(request)
    failure_message = ""
    try:
        asset = Asset.objects.get(id=data['id'])
    except Asset.DoesNotExist:
        failure_message = "No model exists with id=" + str(id)
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    asset_port_number = data['power_port_number']
    power_connections = serialize_power_connections(asset)
    pdu_port = power_connections[asset_port_number]['port_number']
    pdu = 'hpdu-rtp1-' + get_pdu_status_ext(asset, str(power_connections[asset_port_number]['left_right']))
    requests.post(
        pdu_url + toggle_pdu,
        {"pdu": pdu, "port": pdu_port, "v": goal_state}
    )
    return
