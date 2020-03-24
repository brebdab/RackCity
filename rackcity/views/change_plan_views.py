from django.http import JsonResponse
from rackcity.api.serializers import (
    AddChangePlanSerializer,
    GetChangePlanSerializer,
)
from rackcity.models import ChangePlan
from rackcity.utils.query_utils import (
    get_sort_arguments,
    get_filter_arguments,
    get_page_count_response,
)
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    parse_serializer_errors,
    parse_save_validation_error)
from http import HTTPStatus
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import JSONParser
from django.core.exceptions import ObjectDoesNotExist
import math


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
    errors = []
    should_paginate = not(
        request.query_params.get('page') is None
        and request.query_params.get('page_size') is None
    )
    if should_paginate:
        if not request.query_params.get('page'):
            errors.append("Must specify field 'page' on paginated requests")
        elif not request.query_params.get('page_size'):
            errors.append(
                "Must specify field 'page_size' on paginated requests"
            )
        elif int(request.query_params.get('page_size')) <= 0:
            errors.append(
                "Field 'page_size' must be an integer greater than 0"
            )

    if len(errors) > 0:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                "errors": " ".join(errors)
            },
            status=HTTPStatus.BAD_REQUEST,
        )

    user = request.user
    change_plans_query = ChangePlan.objects.filter(owner=user)

    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.FILTER.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        change_plans_query = change_plans_query.filter(**filter_arg)
    try:
        sort_args = get_sort_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.SORT.value,
                "errors": str(error)
            },
            status=HTTPStatus.BAD_REQUEST
        )
    change_plans = change_plans_query.order_by(*sort_args)

    if should_paginate:
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size')
        try:
            page_of_change_plans = paginator.paginate_queryset(
                change_plans, request)
        except Exception as error:
            return JsonResponse(
                {
                    "failure_message":
                        Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                    "errors": str(error)
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        change_plans_to_serialize = page_of_change_plans
    else:
        change_plans_to_serialize = change_plans
    serializer = GetChangePlanSerializer(change_plans_to_serialize, many=True)
    return JsonResponse(
        {"change-plans": serializer.data},
        status=HTTPStatus.OK,
    )
