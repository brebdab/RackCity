from django.http import JsonResponse
from rackcity.models import (
    Asset
)
from rackcity.api.serializers import (
    serialize_power_connections,
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from http import HTTPStatus
import re
import requests

pdu_url = 'http://hyposoft-mgt.colab.duke.edu:8005/pdu.php?pdu=hpdu-rtp1-'  # Need to specify rack + side in request, e.g. for A1 left, use A01L


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
        html = requests.get(pdu_url + rack_str + str(power_connections[power_connection]['left_right']))
        power_status[power_connection] = regex_power_status(html.text, power_connections[power_connection]['port_number'])[0]

    return JsonResponse(
        {
            "power_connections": power_connections,
            "power_status": power_status
        },
        status=HTTPStatus.OK
    )


def regex_power_status(html, port):
    status_pattern = re.search('<td>'+str(port)+'<td><span.+(ON|OFF)', html)
    return status_pattern.groups(1)
