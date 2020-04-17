from django.contrib.auth.decorators import permission_required
from rackcity.api.serializers import LogSerializer
from rackcity.models import Log
from rackcity.permissions.permissions import PermissionPath
from rackcity.utils.query_utils import (
    get_page_count_response,
    get_many_response,
)
from rest_framework.decorators import api_view


@api_view(["POST"])
@permission_required(PermissionPath.AUDIT_READ.value, raise_exception=True)
def log_many(request):
    """
    List many logs. If page is not specified as a query parameter, all
    logs are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of assets will be returned.
    """
    return get_many_response(
        Log, LogSerializer, "logs", request, default_order="-date",
    )


@api_view(["POST"])
@permission_required(PermissionPath.AUDIT_READ.value, raise_exception=True)
def log_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    return get_page_count_response(
        Log, request.query_params, data_for_filters=request.data,
    )
