from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import LogSerializer
from rackcity.models import Log
from rackcity.views.rackcity_utils import get_filter_arguments
from rest_framework.decorators import permission_classes, api_view
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_many(request):
    """
    List many logs. If page is not specified as a query parameter, all
    logs are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """

    failure_message = ""

    should_paginate = not(
        request.query_params.get('page') is None
        and request.query_params.get('page_size') is None
    )

    if should_paginate:
        if not request.query_params.get('page'):
            failure_message += "Must specify field 'page' on " + \
                "paginated requests. "
        elif not request.query_params.get('page_size'):
            failure_message += "Must specify field 'page_size' on " + \
                "paginated requests. "
        elif int(request.query_params.get('page_size')) <= 0:
            failure_message += "Field 'page_size' must be an integer " + \
                "greater than 0. "

    if failure_message != "":
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )

    logs = Log.objects.order_by('-date')

    try:
        filter_args = get_filter_arguments(request.data)
    except Exception as error:
        return JsonResponse(
            {"failure_message": "Filter error: " + str(error)},
            status=HTTPStatus.BAD_REQUEST
        )
    for filter_arg in filter_args:
        logs = logs.filter(**filter_arg)

    if should_paginate:
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size')
        try:
            page_of_logs = paginator.paginate_queryset(logs, request)
        except Exception as error:
            failure_message += "Invalid page requested: " + str(error)
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST,
            )
        logs_to_serialize = page_of_logs
    else:
        logs_to_serialize = logs

    serializer = LogSerializer(
        logs_to_serialize,
        many=True,
    )
    return JsonResponse(
        {"logs": serializer.data},
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    if (
        not request.query_params.get('page_size')
        or int(request.query_params.get('page_size')) <= 0
    ):
        return JsonResponse(
            {"failure_message": "Must specify positive integer page_size."},
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(request.query_params.get('page_size'))
    log_count = Log.objects.all().count()
    page_count = math.ceil(log_count / page_size)
    return JsonResponse({"page_count": page_count})
