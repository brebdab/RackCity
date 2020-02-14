from django.http import HttpResponse, JsonResponse
from rackcity.models import Datacenter
from django.core.exceptions import ObjectDoesNotExist
from rackcity.api.serializers import DatacenterSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import JSONParser
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus
import math
from io import StringIO


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def datacenter_all(request):
    """
        Return List of all datacenters.
    """
    try:
        datacenters = Datacenter.objects.all()
        serializer = DatacenterSerializer(datacenters, many=True)
        return JsonResponse(
            {"datacenters": serializer.data},
            status=HTTPStatus.OK
        )
    except Datacenter.Error:
        failure_message = "No datacenters"
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
