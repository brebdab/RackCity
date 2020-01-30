from django.http import JsonResponse
from http import HTTPStatus
from rackcity.models import Rack
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_rack_usage(request):
    """
    Get summary of rack usage: the percentage of rackspace free versus used,
    allocated per vendor, allocated per model, and allocated per owner.
    """
    racks = Rack.objects.all()
    rack_usage_data = {}

    # Aggregate used rackspace by model
    model_allocation = {}
    rack_usage_data['vendor_allocation_percent'] = model_allocation

    # Aggregate used rackspace by vendor
    vendor_allocation = {}
    rack_usage_data['model_allocation_percent'] = vendor_allocation

    # Aggregate used rackspace by owner
    owner_allocation = {}
    rack_usage_data['owner_allocation_perecent'] = owner_allocation

    # Aggregate total used rackspace
    rack_usage_data['free_rackspace_percent'] = 0.0

    return JsonResponse(rack_usage_data, status=HTTPStatus.OK)
