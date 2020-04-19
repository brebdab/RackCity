from django.db.models.query_utils import Q
from django.http import JsonResponse
from http import HTTPStatus
from rackcity.models import Rack, Asset
from rackcity.models.model_utils import ModelType
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_rack_usage_global(request):
    """
    Get summary of rack usage across ALL site: the percentage of rackspace free versus used,
    allocated per vendor, allocated per model, and allocated per owner.
    """
    racks = Rack.objects.all()
    assets = Asset.objects.filter(~Q(model__model_type=ModelType.BLADE_ASSET.value))
    if len(racks) == 0 or len(assets) == 0:
        return JsonResponse(
            {"warning_message": "There are no racks or assets."},
            status=HTTPStatus.BAD_REQUEST,
        )
    return compute_rack_report(racks, assets)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_rack_usage_datacenter(request, id):
    """
    Get summary of rack usage for ONE datacenter: the percentage of rackspace free versus used,
    allocated per vendor, allocated per model, and allocated per owner.
    """
    racks = Rack.objects.filter(datacenter=id)
    assets = Asset.objects.filter(
        ~Q(model__model_type=ModelType.BLADE_ASSET.value) & Q(rack__datacenter=id)
    )
    if len(racks) == 0 or len(assets) == 0:
        return JsonResponse(
            {"warning_message": "There are no racks or assets."},
            status=HTTPStatus.BAD_REQUEST,
        )
    return compute_rack_report(racks, assets)


def compute_rack_report(racks, assets):
    total_num_rack_slots = 0
    for rack in racks:
        total_num_rack_slots += rack.height

    model_allocation = {}
    vendor_allocation = {}
    owner_allocation = {}
    num_full_rack_slots = 0
    assets = assets.order_by("model__vendor", "model__model_number")
    for asset in assets:
        vendor = asset.model.vendor
        model = asset.model
        height = asset.model.height
        owner = asset.owner
        num_full_rack_slots += height
        if vendor not in vendor_allocation:
            vendor_allocation[vendor] = 0
        vendor_allocation[vendor] += height
        if model not in model_allocation:
            model_allocation[model] = 0
        model_allocation[model] += height
        if owner is None or owner == "":
            owner = "(No owner)"
        if owner not in owner_allocation:
            owner_allocation[owner] = 0
        owner_allocation[owner] += height

    rack_usage_data = {
        "free_rackspace_percent": 1 - (num_full_rack_slots / total_num_rack_slots),
        "vendor_allocation": [
            {
                "vendor": vendor,
                "allocation_percent": vendor_allocation[vendor] / num_full_rack_slots,
            }
            for vendor in vendor_allocation
        ],
        "model_allocation": [
            {
                "vendor": model.vendor,
                "model_number": model.model_number,
                "allocation_percent": model_allocation[model] / num_full_rack_slots,
            }
            for model in model_allocation
        ],
        "owner_allocation": [
            {
                "owner": owner,
                "allocation_percent": owner_allocation[owner] / num_full_rack_slots,
            }
            for owner in owner_allocation
        ],
    }

    return JsonResponse(rack_usage_data, status=HTTPStatus.OK)
