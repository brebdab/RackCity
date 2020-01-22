from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITModel
from rackcity.api.serializers import ITModelSerializer

def model_list(request):
    """
    List all models, or create a new model.
    """
    if request.method == 'GET':
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)

    elif request.method == 'POST':
        data = JSONParser().parse(request)
        serializer = ITModelSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return JsonResponse(serializer.data, status=201)
        return JsonResponse(serializer.errors, status=400)


def model_detail(request, pk):
    """
    Retrieve, update or delete a model.
    """
    try:
        model = ITModel.objects.get(pk=pk)
    except ITModel.DoesNotExist:
        return HttpResponse(status=404)

    if request.method == 'GET':
        serializer = ITModelSerializer(model)
        return JsonResponse(serializer.data)

    elif request.method == 'PUT':
        data = JSONParser().parse(request)
        serializer = ITModelSerializer(model, data=data)
        if serializer.is_valid():
            serializer.save()
            return JsonResponse(serializer.data)
        return JsonResponse(serializer.errors, status=400)

    elif request.method == 'DELETE':
        model.delete()
        return HttpResponse(status=204)