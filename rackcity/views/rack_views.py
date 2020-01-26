# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import Rack
from rackcity.api.serializers import RackSerializer
from rackcity.api.objects import RackRangeSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from http import HTTPStatus


def rack_list(request):  # DEPRECATED !
    """
    List all racks.
    """
    if request.method == 'GET':
        racks = Rack.objects.all()
        serializer = RackSerializer(racks, many=True)
        return JsonResponse(serializer.data, safe=False)


def rack_detail(request, pk):  # DEPRECATED !
    """
    Retrieve a single rack.
    """
    try:
        rack = Rack.objects.get(pk=pk)
    except Rack.DoesNotExist:
        return HttpResponse(status=404)

    if request.method == 'GET':
        serializer = RackSerializer(rack)
        return JsonResponse(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rack_get(request):
    """
    List all racks within specified range.
    """
    rack_range_deserialized = RackRangeSerializer(data=request.data)
    if not rack_range_deserialized.is_valid():
        return JsonResponse({"failure_message": "Invalid body"}, status=HTTPStatus.BAD_REQUEST)

    return JsonResponse({})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def rack_create(request):
    """
    Create racks within specified range.
    """
    return JsonResponse({})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rack_delete(request):
    """
    Delete racks within specified range.
    """
    return JsonResponse({})
