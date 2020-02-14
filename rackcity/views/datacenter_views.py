from django.http import HttpResponse, JsonResponse
# from rackcity.models import ITInstance, ITModel, Rack
from django.core.exceptions import ObjectDoesNotExist
# from rackcity.api.serializers import (
#     ITInstanceSerializer,
#     RecursiveITInstanceSerializer,
#     BulkITInstanceSerializer,
#     ITModelSerializer,
#     RackSerializer
# )
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import JSONParser
from rest_framework.pagination import PageNumberPagination
from http import HTTPStatus
import math
from io import StringIO


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def datacenter_all(request):
    return JsonResponse(
        {"instances": "hello"},
        status=HTTPStatus.OK,
    )
