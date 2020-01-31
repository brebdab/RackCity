from django.http import JsonResponse
from http import HTTPStatus
from rackcity.models import Rack, ITInstance
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_rack_usage(request):
    """
    Get summary of rack usage: the percentage of rackspace free versus used,
    allocated per vendor, allocated per model, and allocated per owner.
    """
    model_allocation = {}
    vendor_allocation = {}
    owner_allocation = {}
    num_full_rack_slots = 0
    instances = ITInstance.objects.all()
    for instance in instances:
        vendor = instance.model.vendor
        model = instance.model
        height = instance.model.height
        owner = instance.owner
        num_full_rack_slots += height
        if vendor not in vendor_allocation:
            vendor_allocation[vendor] = 0
        vendor_allocation[vendor] += height
        if model not in model_allocation:
            model_allocation[model] = 0
        model_allocation[model] += height
        if owner not in owner_allocation:
            owner_allocation[owner] = 0
        owner_allocation[owner] += height

    total_num_rack_slots = 0
    racks = Rack.objects.all()
    for rack in racks:
        total_num_rack_slots += rack.height

    rack_usage_data = {}
    rack_usage_data['free_rackspace_percent'] = \
        1 - (num_full_rack_slots / total_num_rack_slots)

    rack_usage_data['vendor_allocation'] = [
        {
            "vendor": vendor,
            "allocation_percent":
            vendor_allocation[vendor] / num_full_rack_slots
        } for vendor in vendor_allocation
    ]

    rack_usage_data['model_allocation'] = [
        {
            "vendor": model.vendor,
            "model_number": model.model_number,
            "allocation_percent":
            model_allocation[model] / num_full_rack_slots
        } for model in model_allocation
    ]

    rack_usage_data['owner_allocation'] = [
        {
            "owner": owner,
            "allocation_percent":
            owner_allocation[owner] / num_full_rack_slots
        } for owner in owner_allocation
    ]

    return JsonResponse(rack_usage_data, status=HTTPStatus.OK)
