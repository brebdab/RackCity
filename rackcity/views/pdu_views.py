from django.http import HttpResponse, JsonResponse
from rackcity.models import (
    Asset,
    Rack,
    PowerPort,
    PDUPort
)
from django.core.exceptions import ObjectDoesNotExist
from rackcity.api.serializers import (
    AssetSerializer,
    RecursiveAssetSerializer,
    RackSerializer,
    serialize_power_connections,
)
from rackcity.utils.log_utils import (
    log_action,
    log_bulk_import,
    log_delete,
    Action,
    ElementType,
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import JSONParser
from http import HTTPStatus
import math
from io import StringIO
from rackcity.views.rackcity_utils import (
    validate_asset_location,
    validate_location_modification,
    no_infile_location_conflicts,
    records_are_identical,
    get_sort_arguments,
    get_filter_arguments,
)


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
    serializer = serialize_power_connections(asset)
    

    return JsonResponse(
        {"power_connections": serializer},
        # {
        #     "connections": connections,

        # },
        status=HTTPStatus.OK
    )
