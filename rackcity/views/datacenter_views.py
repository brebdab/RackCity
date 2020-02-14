from django.http import JsonResponse
from rackcity.models import Datacenter
from django.core.exceptions import ObjectDoesNotExist
from rackcity.api.serializers import DatacenterSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from http import HTTPStatus


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
    except Datacenter.ObjectDoesNotExist:
        failure_message = "No datacenters"
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
