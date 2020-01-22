# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import Rack
from rackcity.api.serializers import RackSerializer


def rack_list(request):
    """
    List all racks.
    """
    if request.method == 'GET':
        racks = Rack.objects.all()
        serializer = RackSerializer(racks, many=True)
        return JsonResponse(serializer.data, safe=False)


def rack_detail(request, pk):
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
