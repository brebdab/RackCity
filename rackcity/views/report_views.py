from django.http import JsonResponse
from http import HTTPStatus
from rackcity.models import Rack, ITInstance
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_rack_usage(request):
    """
    Get summary of rack usage: the percentage of rackspace free versus used,
    allocated per vendor, allocated per model, and allocated per owner.
    """
    model_allocation = {}
    vendor_allocation = {}
    owner_allocation = {}
    num_rack_slots_full = 0
    instances = ITInstance.objects.all()
    for instance in instances:
        vendor = instance.model.vendor
        model = vendor + instance.model.model_number
        height = instance.model.height
        owner = instance.owner
        num_rack_slots_full += height
        if vendor not in vendor_allocation:
            vendor_allocation[vendor] = 0
        vendor_allocation[vendor] += height
        if model not in model_allocation:
            model_allocation[model] = 0
        model_allocation[model] += height
        if owner not in owner_allocation:
            owner_allocation[owner] = 0
        owner_allocation[owner] += height

    num_rack_slots_total = 0
    racks = Rack.objects.all()
    for rack in racks:
        num_rack_slots_total += rack.height

    rack_usage_data = {}
    rack_usage_data['free_rackspace_percent'] = \
        num_rack_slots_full / num_rack_slots_total
    rack_usage_data['vendor_allocation_percent'] = {
        vendor: num_rack_slots / num_rack_slots_total
        for vendor, num_rack_slots in vendor_allocation.items()
    }
    rack_usage_data['model_allocation_percent'] = {
        model: num_rack_slots / num_rack_slots_total
        for model, num_rack_slots in model_allocation.items()
    }
    rack_usage_data['owner_allocation_perecent'] = {
        owner: num_rack_slots / num_rack_slots_total
        for owner, num_rack_slots in owner_allocation.items()
    }

    return JsonResponse(rack_usage_data, status=HTTPStatus.OK)
