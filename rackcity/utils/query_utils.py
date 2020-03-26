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


def get_sort_arguments(data):
    sort_args = []
    if 'sort_by' in data:
        sort_by = data['sort_by']
        for sort in sort_by:
            if ('field' not in sort) or ('ascending' not in sort):
                raise Exception("Must specify 'field' and 'ascending' fields.")
            if not isinstance(sort['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(sort['ascending'], bool):
                raise Exception("Field 'ascending' must be of type bool.")
            field_name = sort['field']
            order = "-" if not sort['ascending'] else ""
            sort_args.append(order + field_name)
    return sort_args


def get_filter_arguments(data):
    filter_args = []
    if 'filters' in data:
        filters = data['filters']
        for filter in filters:

            if (
                ('field' not in filter)
                or ('filter_type' not in filter)
                or ('filter' not in filter)
            ):
                raise Exception(
                    "Must specify 'field', 'filter_type', and 'filter' fields."
                )
            if not isinstance(filter['field'], str):
                raise Exception("Field 'field' must be of type string.")
            if not isinstance(filter['filter_type'], str):
                raise Exception("Field 'filter_type' must be of type string.")
            if not isinstance(filter['filter'], dict):
                raise Exception("Field 'filter' must be of type dict.")

            filter_field = filter['field']
            filter_type = filter['filter_type']
            filter_dict = filter['filter']

            if filter_type == 'text':
                if filter_dict['match_type'] == 'exact':
                    filter_args.append(
                        {
                            '{0}__iexact'.format(filter_field): filter_dict['value']
                        }
                    )
                elif filter_dict['match_type'] == 'contains':
                    filter_args.append(
                        {
                            '{0}__icontains'.format(filter_field):
                            filter_dict['value']
                        }
                    )

            elif filter_type == 'numeric':
                if (
                    filter_dict['min'] is not None
                    and isinstance(filter_dict['min'], int)
                    and (
                        filter_dict['max'] is None
                        or filter_dict['max'] == ""
                    )
                ):
                    filter_args.append(
                        {
                            '{0}__gte'.format(filter_field): int(filter_dict['min'])  # noqa greater than or equal to min
                        }
                    )
                elif (
                    filter_dict['max'] is not None
                    and isinstance(filter_dict['max'], int)
                    and (
                        filter_dict['min'] is None
                        or filter_dict['min'] == ""
                    )
                ):
                    filter_args.append(
                        {
                            '{0}__lte'.format(filter_field): int(filter_dict['max'])  # noqa less than or equal to max
                        }
                    )
                elif (
                    int(filter_dict['max']) is not None
                    and int(filter_dict['min']) is not None
                ):
                    range_value = (
                        int(filter_dict['min']),
                        int(filter_dict['max'])
                    )
                    filter_args.append(
                        {
                            '{0}__range'.format(filter_field): range_value  # noqa inclusive on both min, max
                        }
                    )
                else:
                    raise Exception(
                        "Numeric filters must contain integer min, integer max, or both."
                    )

            elif filter_type == 'rack_range':
                range_serializer = RackRangeSerializer(data=filter_dict)
                if not range_serializer.is_valid():
                    raise Exception(
                        "Invalid rack_range filter: " +
                        str(range_serializer.errors)
                    )
                filter_args.append(
                    {
                        'rack__rack_num__range':
                        range_serializer.get_number_range()
                    }
                )
                filter_args.append(
                    {
                        'rack__row_letter__range':
                        range_serializer.get_row_range()  # noqa inclusive on both letter, number
                    }
                )

            else:
                raise Exception(
                    "String field 'filter_type' must be either 'text', " +
                    "'numeric', or 'rack_range'."
                )

    return filter_args


def apply_filters_or(object_query, filter_args):
    q_objects = Q()
    for filter_arg in filter_args:
        q_objects |= Q(**filter_arg)
    object_query = object_query.filter(q_objects)
    return object_query


def apply_filters_and(object_query, filter_args):
    for filter_arg in filter_args:
        object_query = object_query.filter(**filter_arg)
    return object_query


def get_filtered_query(object_query, data, or_filters=False):
    try:
        filter_args = get_filter_arguments(data)
    except Exception as error:
        return (
            None,
            JsonResponse(
                {
                    "failure_message":
                    Status.ERROR.value + GenericFailure.FILTER.value,
                    "errors": str(error)
                },
                status=HTTPStatus.BAD_REQUEST
            )
        )
    if or_filters and len(filter_args) > 0:
        apply_filters_or(object_query, filter_args)
    else:
        apply_filters_and(object_query, filter_args)
    return (object_query, None)


def get_sorted_query(object_query, data, default_order=None):
    try:
        sort_args = get_sort_arguments(data)
    except Exception as error:
        return (
            None,
            JsonResponse(
                {
                    "failure_message":
                    Status.ERROR.value + GenericFailure.SORT.value,
                    "errors": str(error)
                },
                status=HTTPStatus.BAD_REQUEST
            )
        )
    if (len(sort_args) == 0 and default_order):
        objects = object_query.order_by(default_order)
    else:
        objects = object_query.order_by(*sort_args)
    return (objects, None)


def get_paginated_query(objects, request):
    paginator = PageNumberPagination()
    paginator.page_size = request.query_params.get('page_size')
    try:
        page_of_objects = paginator.paginate_queryset(objects, request)
    except Exception as error:
        return (
            None,
            JsonResponse(
                {
                    "failure_message":
                    Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                    "errors": str(error)
                },
                status=HTTPStatus.BAD_REQUEST,
            )
        )
    return (page_of_objects, None)


def should_paginate_query(query_params):
    return not(
        query_params.get('page') is None
        and query_params.get('page_size') is None
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
        object_query,
        request.data,
        or_filters=or_filters
    )
    if filter_failure_response:
        return filter_failure_response

    sorted_query, sort_failure_response = get_sorted_query(
        filtered_query,
        request.data,
        default_order=default_order
    )
    if sort_failure_response:
        return sort_failure_response

    if should_paginate:
        paginated_query, page_failure_response = get_paginated_query(
            sorted_query,
            request
        )
        if page_failure_response:
            return page_failure_response
        objects_to_serialize = paginated_query
    else:
        objects_to_serialize = sorted_query

    serializer = model_serializer(
        objects_to_serialize,
        many=True,
    )

    return JsonResponse(
        {response_key: serializer.data},
        status=HTTPStatus.OK,
    )


def get_page_count_response(
    model,
    query_params,
    data_for_filters=None,
    or_filters=False
):
    if (
        not query_params.get('page_size')
        or int(query_params.get('page_size')) <= 0
    ):
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                "errors": "Must specify positive integer page_size."
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(query_params.get('page_size'))
    object_query = model.objects.all()
    if data_for_filters:
        object_query, filter_failure_response = get_filtered_query(
            object_query,
            data_for_filters,
            or_filters=or_filters
        )
        if filter_failure_response:
            return filter_failure_response
    count = object_query.count()
    page_count = math.ceil(count / page_size)
    return JsonResponse({"page_count": page_count})