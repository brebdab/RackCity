from http import HTTPStatus
import math

from django.db.models import Q
from django.http import JsonResponse
from rackcity.api.objects import RackRangeSerializer
from rackcity.utils.errors_utils import (
    GenericFailure,
    Status,
    get_invalid_paginated_request_response,
)
from rest_framework.pagination import PageNumberPagination
from rackcity.models import Asset


def get_sort_arguments(data):
    sort_args = []
    if "sort_by" in data:
        sort_by = data["sort_by"]
        for sort in sort_by:
            if ("field" not in sort) or ("ascending" not in sort):
                raise Exception("Must specify 'field' and 'ascending' fields.")
            if not isinstance(sort["field"], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(sort["ascending"], bool):
                raise Exception("Field 'ascending' must be of type bool.")
            field_name = sort["field"]
            order = "-" if not sort["ascending"] else ""
            sort_args.append(order + field_name)
    return sort_args


def get_filter_arguments(data):
    filter_args = []
    if "filters" in data:
        filters = data["filters"]
        for filter in filters:
            if (
                ("field" not in filter)
                or ("filter_type" not in filter)
                or ("filter" not in filter)
            ):
                raise Exception(
                    "Must specify 'field', 'filter_type', and 'filter' fields."
                )
            if not isinstance(filter["field"], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(filter["filter_type"], str):
                raise Exception("Field 'filter_type' must be of type string.")
            if not isinstance(filter["filter"], dict):
                raise Exception("Field 'filter' must be of type dict.")

            filter_field = filter["field"]
            filter_type = filter["filter_type"]
            filter_dict = filter["filter"]
            if filter_type == "text":
                if filter_field == "datacenter":
                    filter_args.append(
                        get_datacenter_filter_arguments(
                            filter_dict["match_type"], filter_dict["value"]
                        )
                    )
                elif filter_field == "offline_storage_site":
                    filter_args.append(
                        get_offline_site_filter_arguments(
                            filter_dict["match_type"], filter_dict["value"]
                        )
                    )
                else:
                    if filter_dict["match_type"] == "exact":
                        filter_args.append(
                            {"{0}__iexact".format(filter_field): filter_dict["value"]}
                        )
                    elif filter_dict["match_type"] == "contains":
                        filter_args.append(
                            {
                                "{0}__icontains".format(filter_field): filter_dict[
                                    "value"
                                ]
                            }
                        )

            elif filter_type == "numeric":
                if (
                    filter_dict["min"] is not None
                    and isinstance(filter_dict["min"], int)
                    and (filter_dict["max"] is None or filter_dict["max"] == "")
                ):
                    filter_args.append(
                        {
                            "{0}__gte".format(filter_field): int(
                                filter_dict["min"]
                            )  # noqa greater than or equal to min
                        }
                    )
                elif (
                    filter_dict["max"] is not None
                    and isinstance(filter_dict["max"], int)
                    and (filter_dict["min"] is None or filter_dict["min"] == "")
                ):
                    filter_args.append(
                        {
                            "{0}__lte".format(filter_field): int(
                                filter_dict["max"]
                            )  # noqa less than or equal to max
                        }
                    )
                elif (
                    int(filter_dict["max"]) is not None
                    and int(filter_dict["min"]) is not None
                ):
                    range_value = (int(filter_dict["min"]), int(filter_dict["max"]))
                    filter_args.append(
                        {
                            "{0}__range".format(
                                filter_field
                            ): range_value  # noqa inclusive on both min, max
                        }
                    )
                else:
                    raise Exception(
                        "Numeric filters must contain integer min, integer max, or both."
                    )

            elif filter_type == "rack_range":
                range_serializer = RackRangeSerializer(data=filter_dict)
                if not range_serializer.is_valid():
                    raise Exception(
                        "Invalid rack_range filter: " + str(range_serializer.errors)
                    )
                filter_args.append(
                    [
                        {"rack__rack_num__range": range_serializer.get_number_range()},
                        {
                            "chassis__rack__rack_num__range": range_serializer.get_number_range()
                        },
                    ]
                )
                filter_args.append(
                    [
                        {
                            "rack__row_letter__range": range_serializer.get_row_range()  # noqa inclusive on both letter, number
                        },
                        {
                            "chassis__rack__row_letter__range": range_serializer.get_row_range()
                        },
                    ]
                )

            elif filter_type == "datetime":
                if (
                    "after" in filter_dict
                    and filter_dict["after"] is not None
                    and isinstance(filter_dict["after"], str)
                    and (
                        "before" not in filter_dict
                        or filter_dict["before"] is None
                        or filter_dict["before"] == ""
                    )
                ):
                    filter_args.append(
                        {
                            "{0}__gte".format(filter_field): filter_dict[
                                "after"
                            ]  # noqa greater than or equal to min
                        }
                    )
                elif (
                    "before" in filter_dict
                    and filter_dict["before"] is not None
                    and isinstance(filter_dict["before"], str)
                    and (
                        "after" not in filter_dict
                        or filter_dict["after"] is None
                        or filter_dict["after"] == ""
                    )
                ):
                    filter_args.append(
                        {
                            "{0}__lte".format(filter_field): filter_dict[
                                "before"
                            ]  # noqa less than or equal to max
                        }
                    )
                elif (
                    filter_dict["before"] is not None
                    and filter_dict["after"] is not None
                ):
                    range_value = (filter_dict["after"], filter_dict["before"])
                    filter_args.append(
                        {
                            "{0}__range".format(
                                filter_field
                            ): range_value  # noqa inclusive on both min, max
                        }
                    )
                else:
                    raise Exception(
                        "Date filters must contain datetime min, datetime max, or both."
                    )

            else:
                raise Exception(
                    "String field 'filter_type' must be either 'text', "
                    + "'numeric', 'rack_range', or 'datetime'."
                )

    return filter_args


def get_datacenter_filter_arguments(match_type, value):
    datacenter_filter_args = []
    datacenter_filter_fields = [
        "rack__datacenter__name",
        "rack__datacenter__abbreviation",
        "chassis__rack__datacenter__name",
        "chassis__rack__datacenter__abbreviation",
    ]
    for datacenter_filter_field in datacenter_filter_fields:
        datacenter_filter_args.append(
            {"{0}__i{1}".format(datacenter_filter_field, match_type): value}
        )
    return datacenter_filter_args


def get_offline_site_filter_arguments(match_type, value):
    offline_site_filter_args = []
    offline_site_filter_fields = [
        "offline_storage_site__name",
        "offline_storage_site__abbreviation",
        "chassis__offline_storage_site__name",
        "chassis__offline_storage_site__abbreviation",
    ]
    for offline_site_filter_field in offline_site_filter_fields:
        offline_site_filter_args.append(
            {"{0}__i{1}".format(offline_site_filter_field, match_type): value}
        )
    return offline_site_filter_args


def apply_filters_or(object_query, filter_args):
    q_objects = Q()
    for filter_arg in filter_args:
        if isinstance(filter_arg, list):
            for sub_filter_arg in filter_arg:
                q_objects |= Q(**sub_filter_arg)
        else:
            q_objects |= Q(**filter_arg)
    return apply_filters(object_query, q_objects)


def apply_filters_and_with_nested_or(object_query, filter_args):
    q_objects = Q()
    for filter_arg in filter_args:
        if isinstance(filter_arg, list):
            sub_q_objects = Q()
            for sub_filter_arg in filter_arg:
                sub_q_objects |= Q(**sub_filter_arg)
            q_objects &= sub_q_objects
        else:
            q_objects &= Q(**filter_arg)
    return apply_filters(object_query, q_objects)


def apply_filters(object_query, q_objects):
    object_query = object_query.filter(q_objects)
    return object_query


def get_filtered_query(object_query, data, or_filters=False):
    try:
        filter_args = get_filter_arguments(data)
    except Exception as error:
        return (
            None,
            JsonResponse(
                {
                    "failure_message": Status.ERROR.value + GenericFailure.FILTER.value,
                    "errors": str(error),
                },
                status=HTTPStatus.BAD_REQUEST,
            ),
        )
    if or_filters and len(filter_args) > 0:
        object_query = apply_filters_or(object_query, filter_args)
    else:
        object_query = apply_filters_and_with_nested_or(object_query, filter_args)
    return (object_query, None)


def get_sorted_query(object_query, data, default_order=None):
    try:
        sort_args = get_sort_arguments(data)
    except Exception as error:
        return (
            None,
            JsonResponse(
                {
                    "failure_message": Status.ERROR.value + GenericFailure.SORT.value,
                    "errors": str(error),
                },
                status=HTTPStatus.BAD_REQUEST,
            ),
        )
    if len(sort_args) == 0 and default_order:
        objects = object_query.order_by(default_order)
    else:
        objects = object_query.order_by(*sort_args)
    return (objects, None)


def get_paginated_query(objects, request):
    paginator = PageNumberPagination()
    paginator.page_size = request.query_params.get("page_size")
    try:
        page_of_objects = paginator.paginate_queryset(objects, request)
    except Exception as error:
        return (
            None,
            JsonResponse(
                {
                    "failure_message": Status.ERROR.value
                    + GenericFailure.PAGE_ERROR.value,
                    "errors": str(error),
                },
                status=HTTPStatus.BAD_REQUEST,
            ),
        )
    return (page_of_objects, None)


def should_paginate_query(query_params):
    return not (
        query_params.get("page") is None and query_params.get("page_size") is None
    )


def get_many_response(
    model,
    model_serializer,
    response_key,
    request,
    or_filters=False,
    default_order=None,
    premade_object_query=None,
):
    """
    Returns response for a get many view, serialized according to inputs.
    Optional parameters: use or_filters to specify if the filters should be
    applied as OR (instead of default AND); use default_order to specify the
    field that the query should be sorted by if no other sort arguments are
    given in request; use premade_object_query if custom query manipulation
    needs to be performed before this method (instead of using the default
    model.objects.all()).
    """
    should_paginate = should_paginate_query(request.query_params)

    if should_paginate:
        page_failure_response = get_invalid_paginated_request_response(
            request.query_params
        )
        if page_failure_response:
            return page_failure_response

    if premade_object_query is not None:
        object_query = premade_object_query
    else:
        object_query = model.objects.all()

    filtered_query, filter_failure_response = get_filtered_query(
        object_query, request.data, or_filters=or_filters
    )
    if filter_failure_response:
        return filter_failure_response

    sorted_query, sort_failure_response = get_sorted_query(
        filtered_query, request.data, default_order=default_order
    )
    if sort_failure_response:
        return sort_failure_response

    if should_paginate:
        paginated_query, page_failure_response = get_paginated_query(
            sorted_query, request
        )
        if page_failure_response:
            return page_failure_response
        objects_to_serialize = paginated_query
    else:
        objects_to_serialize = sorted_query

    serializer = model_serializer(objects_to_serialize, many=True,)

    return JsonResponse({response_key: serializer.data}, status=HTTPStatus.OK,)


def get_page_count_response(
    model,
    query_params,
    data_for_filters=None,
    or_filters=False,
    premade_object_query=None,
):
    """
    Returns response for a get page count view.  Optional parameters: use
    data_for_filters to specify what filters should be applied; use or_filters
    to specify if the filters should be applied as OR (instead of default AND);
    use premade_object_query if custom query manipulation needs to be performed
    before this method (instead of using the default model.objects.all()).
    """
    if not query_params.get("page_size") or int(query_params.get("page_size")) <= 0:
        return JsonResponse(
            {
                "failure_message": Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                "errors": "Must specify positive integer page_size.",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(query_params.get("page_size"))
    if premade_object_query:
        object_query = premade_object_query
    else:
        object_query = model.objects.all()
    if data_for_filters:
        object_query, filter_failure_response = get_filtered_query(
            object_query, data_for_filters, or_filters=or_filters
        )
        if filter_failure_response:
            return filter_failure_response
    count = object_query.count()
    page_count = math.ceil(count / page_size)
    return JsonResponse({"page_count": page_count})


def assets_online_queryset():
    filter = Q(offline_storage_site__isnull=True) & Q(
        chassis__offline_storage_site__isnull=True
    )
    return Asset.objects.filter(filter)


def assets_offline_queryset():
    filter = Q(offline_storage_site__isnull=False) | Q(
        chassis__offline_storage_site__isnull=False
    )
    return Asset.objects.filter(filter)
