from http import HTTPStatus

from django.http import JsonResponse

from rackcity.api.serializers import (
    RackSerializer,
    RecursiveAssetSerializer,
    RecursiveAssetCPSerializer,
)
from rackcity.models import Asset
from rackcity.utils.change_planner_utils import get_racked_assets_for_cp


def get_rack_detailed_response(racks, change_plan):
    if racks.count() == 0:
        return JsonResponse(
            {"failure_message": "There are no existing racks within this range. "},
            status=HTTPStatus.BAD_REQUEST,
        )

    racks_with_assets = []
    for rack in racks:
        rack_serializer = RackSerializer(rack)
        if change_plan:
            assets, assets_cp = get_racked_assets_for_cp(change_plan)
            assets = assets.filter(rack=rack.id).order_by("rack_position")
            assets_cp = assets_cp.filter(rack=rack.id).order_by("rack_position")
            assets_serializer = RecursiveAssetSerializer(assets, many=True)
            assets_cp_serializer = RecursiveAssetCPSerializer(assets_cp,many=True)
            rack_detail = {
                "rack": rack_serializer.data,
                "assets": assets_serializer.data + assets_cp_serializer.data,
            }

        else:
            assets = Asset.objects.filter(rack=rack.id).order_by("rack_position")
            assets_serializer = RecursiveAssetSerializer(assets, many=True)
            rack_detail = {
                "rack": rack_serializer.data,
                "assets": assets_serializer.data,
            }
        racks_with_assets.append(rack_detail)

    return JsonResponse({"racks": racks_with_assets}, status=HTTPStatus.OK)
