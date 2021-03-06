from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from rackcity.models import Rack, Asset
from rackcity.api.serializers import RackSerializer
from rackcity.api.objects import RackRangeSerializer
from rackcity.permissions.permissions import user_has_asset_permission
from rackcity.utils.change_planner_utils import get_change_plan
from rackcity.utils.log_utils import (
    log_rack_action,
    Action,
)
from rackcity.utils.errors_utils import (
    AuthFailure,
    Status,
    GenericFailure,
    parse_serializer_errors,
    get_rack_failure_message,
    get_rack_exist_failure,
    get_rack_with_asset_failure,
    get_rack_do_not_exist_failure,
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from http import HTTPStatus
from rackcity.utils.rack_utils import get_rack_detailed_response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rack_get_all(request):
    """
    List all racks
    """

    datacenter_id = request.query_params.get("datacenter")
    if not datacenter_id:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value + "Must specifiy datacenter",
                "errors": "Query parameter 'datacenter' is required",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    racks = Rack.objects.filter(datacenter=datacenter_id)
    return get_rack_detailed_response(racks,change_plan)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rack_get(request):
    """
    List all racks within specified range.
    """
    range_serializer = RackRangeSerializer(data=request.data)

    if not range_serializer.is_valid():
        return JsonResponse(
            {
                "failure_message": Status.INVALID_INPUT.value
                + parse_serializer_errors(range_serializer.errors),
                "errors": str(range_serializer.errors),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    (change_plan, failure_response) = get_change_plan(
        request.query_params.get("change_plan")
    )
    if failure_response:
        return failure_response
    racks = Rack.objects.filter(
        datacenter=range_serializer.get_datacenter(),
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )

    return get_rack_detailed_response(racks,change_plan)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rack_create(request):
    """
    Create racks within specified range.
    """
    range_serializer = RackRangeSerializer(data=request.data)
    if not range_serializer.is_valid():
        return JsonResponse(
            {
                "failure_message": Status.INVALID_INPUT.value
                + parse_serializer_errors(range_serializer.errors),
                "errors": str(range_serializer.errors),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    datacenter_id = range_serializer.get_datacenter()
    if not user_has_asset_permission(request.user, datacenter_id):
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.RACK.value,
                "errors": "User "
                + request.user.username
                + " does not have asset permission in datacenter id="
                + str(datacenter_id),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    racks = Rack.objects.filter(
        datacenter=range_serializer.get_datacenter(),
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )
    if racks.count() > 0:
        return JsonResponse(
            {
                "failure_message": Status.CREATE_ERROR.value
                + get_rack_failure_message(range_serializer, "created")
                + get_rack_exist_failure(racks)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    rack_row_list = range_serializer.get_row_list()
    rack_num_list = range_serializer.get_number_list()
    for row in rack_row_list:
        for num in rack_num_list:
            rack = Rack(
                datacenter=range_serializer.get_datacenter(),
                row_letter=row,
                rack_num=num,
            )
            rack.save()
    related_racks = range_serializer.get_range_as_string()
    log_rack_action(
        request.user,
        Action.CREATE,
        related_racks,
        range_serializer.get_datacenter().abbreviation,
    )
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + "Racks "
            + related_racks
            + " were created in datacenter "
            + range_serializer.get_datacenter().abbreviation
        },
        status=HTTPStatus.OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rack_delete(request):
    """
    Delete racks within specified range.
    """
    range_serializer = RackRangeSerializer(data=request.data)
    if not range_serializer.is_valid():
        return JsonResponse(
            {
                "failure_message": Status.INVALID_INPUT.value
                + parse_serializer_errors(range_serializer.errors),
                "errors": str(range_serializer.errors),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    datacenter_id = range_serializer.get_datacenter()
    if not user_has_asset_permission(request.user, datacenter_id):
        return JsonResponse(
            {
                "failure_message": Status.AUTH_ERROR.value + AuthFailure.RACK.value,
                "errors": "User "
                + request.user.username
                + " does not have asset permission in datacenter id="
                + str(datacenter_id),
            },
            status=HTTPStatus.UNAUTHORIZED,
        )
    nonexistent_rack_names = []
    unempty_racks = []
    for row_letter in range_serializer.get_row_list():
        for rack_num in range_serializer.get_number_list():
            try:
                rack = Rack.objects.get(
                    datacenter=range_serializer.get_datacenter(),
                    row_letter=row_letter,
                    rack_num=rack_num,
                )
            except ObjectDoesNotExist:
                nonexistent_rack_names.append(row_letter + str(rack_num))
            else:
                if Asset.objects.filter(rack=rack.id).count() > 0:
                    unempty_racks.append(rack)
    if len(unempty_racks) > 0:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + get_rack_failure_message(range_serializer, "deleted")
                + get_rack_with_asset_failure(unempty_racks)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if len(nonexistent_rack_names) > 0:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + get_rack_failure_message(range_serializer, "deleted")
                + get_rack_do_not_exist_failure(nonexistent_rack_names)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    racks = Rack.objects.filter(
        datacenter=range_serializer.get_datacenter(),
        rack_num__range=range_serializer.get_number_range(),  # inclusive range
        row_letter__range=range_serializer.get_row_range(),
    )
    try:
        racks.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": Status.DELETE_ERROR.value
                + "Rack(s)"
                + GenericFailure.ON_DELETE.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    related_racks = range_serializer.get_range_as_string()
    log_rack_action(
        request.user,
        Action.DELETE,
        related_racks,
        range_serializer.get_datacenter().abbreviation,
    )
    return JsonResponse(
        {
            "success_message": Status.SUCCESS.value
            + "Racks "
            + related_racks
            + " were deleted in datacenter"
            + range_serializer.get_datacenter().abbreviation
        },
        status=HTTPStatus.OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def rack_summary(request):
    datacenter_id = request.query_params.get("datacenter")
    if not datacenter_id:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value + "Must specifiy datacenter",
                "errors": "Query parameter 'datacenter' is required",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    racks = Rack.objects.filter(datacenter=datacenter_id)
    serializer = RackSerializer(racks, many=True)
    return JsonResponse({"racks": serializer.data}, status=HTTPStatus.OK)
