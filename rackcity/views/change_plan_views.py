from datetime import datetime
from django.http import JsonResponse
from rackcity.api.serializers import (
    AddChangePlanSerializer,
    GetChangePlanSerializer,
)
from rackcity.models import (
    ChangePlan,
    Asset,
    AssetCP,
    DecommissionedAsset,
    NetworkPort,
    NetworkPortCP,
    PDUPort,
    PDUPortCP,
    PowerPort,
    PowerPortCP,
)
from rackcity.utils.query_utils import (
    get_page_count_response,
    get_many_response,
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error)
from http import HTTPStatus
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
from django.core.exceptions import ObjectDoesNotExist


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_delete(request):
    """
    Delete a single existing change plan
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when deleting a Change Plan"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        existing_change_plan = ChangePlan.objects.get(id=id)

    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Change plan" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing Change Plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        existing_change_plan.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Change Plan" +
                    GenericFailure.ON_DELETE.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                "Change Plan " + str(existing_change_plan.name) + " deleted"
        },
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_modify(request):
    """
    Modify single existing change plan
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                Status.MODIFY_ERROR.value + GenericFailure.INTERNAL.value,
                    "errors": "Must include 'id' when modifying a change plan"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        existing_change_plan = ChangePlan.objects.get(id=id)

    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Change plan" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing change plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    for field in data.keys():
        value = data[field]
        setattr(existing_change_plan, field, value)
    try:
        existing_change_plan.save()
        return JsonResponse(
            {
                "success_message":
                    Status.SUCCESS.value +
                    "Change Plan " +
                    str(existing_change_plan.name) +
                    " modified",
                "related_id": str(existing_change_plan.id)
            },
            status=HTTPStatus.OK,
        )
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    parse_save_validation_error(error, "Asset"),
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_add(request):
    """
    Add a new change plan
    """
    data = JSONParser().parse(request)
    if 'id' in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Don't include 'id' when creating a change planner"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    data["owner"] = request.user.id
    serializer = AddChangePlanSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        return JsonResponse(
            {
                "failure_message":
                    Status.INVALID_INPUT.value +
                    parse_serializer_errors(serializer.errors),
                "errors": str(serializer.errors)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    try:
        change_plan = serializer.save()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.CREATE_ERROR.value +
                    parse_save_validation_error(error, "Change Plan"),
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    return JsonResponse(
        {
            "success_message":
                Status.SUCCESS.value +
                "Change Plan " +
                str(change_plan.name) +
                " created",
            "related_id": str(change_plan.id)
        },
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    return get_page_count_response(ChangePlan, request.query_params)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_many(request):
    """
    List many change plans. If page is not specified as a query parameter, all
    models are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of models will be returned.
    """
    user = request.user
    user_change_plans = ChangePlan.objects.filter(owner=user)
    return get_many_response(
        ChangePlan,
        GetChangePlanSerializer,
        "change-plans",
        request,
        premade_object_query=user_change_plans,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_plan_execute(request):
    """
    Execute all changes associated with a change plan.
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'id' when deleting a Change Plan"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    id = data['id']
    try:
        change_plan = ChangePlan.objects.get(id=id)
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "Change plan" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing change plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    if request.user != change_plan.owner:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "You do not have access to execute this change plan.",
                "errors":
                    "User " + request.user.username +
                    "does not own change plan with id="+str(id)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    assets_cp = AssetCP.objects.filter(change_plan=change_plan)
    for asset_cp in assets_cp:
        if (
            asset_cp.is_conflict
            or asset_cp.asset_conflict_hostname
            or asset_cp.asset_conflict_asset_number
            or asset_cp.asset_conflict_location
            or asset_cp.related_decommissioned_asset
            or asset_cp.model is None
            or asset_cp.rack is None
        ):
            return JsonResponse(
                {
                    "failure_message":
                        Status.ERROR.value +
                        "All conflicts must be resolved before a change " +
                        "plan can be executed.",
                    "errors":
                        "Conflict found on AssetCP with id=" + str(asset_cp.id)
                },
                status=HTTPStatus.BAD_REQUEST,
            )
    num_created = 0
    num_modified = 0
    num_decommissioned = 0
    for asset_cp in assets_cp:
        # Update asset
        related_asset = asset_cp.related_asset
        if related_asset:
            updated_asset = related_asset
            num_modified += 1
        else:
            updated_asset = Asset()
            num_created += 1
        for field in Asset._meta.fields:
            if field != 'id':
                setattr(
                    updated_asset,
                    field.name,
                    getattr(asset_cp, field.name)
                )
        # Assigns asset number, creates network & power ports on save
        updated_asset.save()

        # Update network ports
        network_ports_cp = NetworkPortCP.objects.filter(
            change_plan=change_plan,
            asset=asset_cp,
        )

        # Update power ports
        power_ports_cp = PowerPortCP.objects.filter(
            change_plan=change_plan,
            asset=asset_cp,
        )
        for power_port_cp in power_ports_cp:
            pdu_port_cp = power_port_cp.power_connection
            pdu_port_to_connect = PDUPort.objects.get(
                rack=pdu_port_cp.rack,
                left_right=pdu_port_cp.left_right,
                port_number=pdu_port_cp.port_number,
            )
            power_port_to_connect = PowerPort.objects.get(
                asset=updated_asset,
                port_name=power_port_cp.port_name,
            )
            power_port_to_connect.power_connection = pdu_port_to_connect
            power_port_to_connect.save()

        # Decommission asset
        if asset_cp.is_decommissioned:
            decommissioned_asset = DecommissionedAsset()
            # update fields
            decommissioned_asset.save()
            num_decommissioned += 1

    # Mark change plan as executed
    change_plan.execution_time = datetime.now()
    change_plan.save()

    return JsonResponse(
        {"success_message":
            "Change Plan '" + change_plan.name + "' executed: " +
            str(num_created) + " assets created, " +
            str(num_modified) + " assets modified, " +
            str(num_decommissioned) + " assets decommissioned."
         },
        status=HTTPStatus.OK,
    )
