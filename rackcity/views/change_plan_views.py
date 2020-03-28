from django.http import JsonResponse
from rackcity.api.serializers import (
    AddChangePlanSerializer,
    GetChangePlanSerializer,
)
from rackcity.models import ChangePlan
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
def change_plan_remove_asset(request, id):
    """
    Remove a single assetCP from a change plan
    """
    (change_plan, response) = get_change_plan(id)
    if response:
        return response
    data = JSONParser().parse(request)
    if 'asset_cp' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include 'asset_cp' when removing an asset from change plan"
            },
            status=HTTPStatus.BAD_REQUEST
        )
    asset_cp=data['asset_cp']
    
    try:
        AssetCP.objects.get(id=asset_cp).delete()
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value +
                    "AssetCP" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing Asset CP with id="+str(asset_cp)
            },
            status=HTTPStatus.BAD_REQUEST
        )


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
                    "Model" + GenericFailure.DOES_NOT_EXIST.value,
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
                    "Model" + GenericFailure.DOES_NOT_EXIST.value,
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
