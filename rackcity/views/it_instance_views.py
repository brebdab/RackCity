# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITInstance
from rackcity.api.serializers import ITInstanceSerializer


def instance_list(request):
    """
    List all instances.
    """
    if request.method == 'GET':
        instances = ITInstance.objects.all()
        serializer = ITInstanceSerializer(instances, many=True)
        return JsonResponse(serializer.data, safe=False)


def instance_detail(request, pk):
    """
    Retrieve a single instance.
    """
    try:
        instance = ITInstance.objects.get(pk=pk)
    except ITInstance.DoesNotExist:
        return HttpResponse(status=404)

    if request.method == 'GET':
        serializer = ITInstanceSerializer(instance)
        return JsonResponse(serializer.data)
