# from django.http import HttpResponse, JsonResponse
from django.http import JsonResponse
from rackcity.models import (
    Rack,
    Asset
)
from rackcity.api.serializers import (
    serialize_power_connections,
)
# from rackcity.utils.log_utils import (
#     log_action,
#     log_bulk_import,
#     log_delete,
#     Action,
#     ElementType,
# )
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
# from rest_framework.parsers import JSONParser
from http import HTTPStatus
from rackcity.views.rackcity_utils import (
    validate_asset_location,
    validate_location_modification,
    no_infile_location_conflicts,
    records_are_identical,
    get_sort_arguments,
    get_filter_arguments,
)
import re
import requests

pdu_url = 'http://hyposoft-mgt.colab.duke.edu:8000/pdu.php?pdu=hpdu-rtp1-' # need to specify rack + side, e.g. for A1 left, use A01L


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
    port_info = serialize_power_connections(asset)

    # get string parameter representing rack number and side (L/R)
    rack_str = str(asset.rack.row_letter)
    if (asset.rack.rack_num / 10 < 1):
        rack_str = rack_str + "0"
    rack_str = rack_str + str(asset.rack.rack_num)

    power_status = dict()
    for port in port_info:
        html = requests.get(pdu_url + rack_str + str(port_info[port]['left_right']))
        power_status[port] = regex_power_status(html.text, port_info[port]['port_number'])[0]

    return JsonResponse(
        {
            "power_connections": port_info,
            "power_status": power_status
        },
        status=HTTPStatus.OK
    )


def regex_power_status(html, port):
    status_pattern = re.search('<td>'+str(port)+'<td><span.+(ON|OFF)', html)
    return status_pattern.groups(1)
