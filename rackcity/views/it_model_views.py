from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITModel
from rackcity.api.serializers import ITModelSerializer
#from django.views.decorators.csrf import csrf_exempt

def model_list(request):
    """
    List all models.
    """
    if request.method == 'GET':
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)

    # elif request.method == 'POST':
    #     data = JSONParser().parse(request)
    #     serializer = ITModelSerializer(data=data)
    #     if serializer.is_valid():
    #         serializer.save()
    #         return JsonResponse(serializer.data, status=201)
    #     return JsonResponse(serializer.errors, status=400)

def model_add(request): # TODO: make it only accept POSTs
    """
    Add a new model
    """
    if request.method == 'POST':
        data = JSONParser().parse(request)
        serializer = ITModelSerializer(data=data)
        if serializer.is_valid(): # TODO: figure out what .valid() does.  Different fields are required for add, update, etc
            print("valid")
            serializer.save()
            return HttpResponse(status=201) # should return something better maybe
        else:
            print("invalid")
            return HttpResponse(status=400) # should return something better definitely


def model_detail(request, pk):
    """
    Retrieve a single model.
    """
    try:
        model = ITModel.objects.get(pk=pk)
    except ITModel.DoesNotExist:
        return HttpResponse(status=404)

    if request.method == 'GET':
        serializer = ITModelSerializer(model)
        return JsonResponse(serializer.data)

    # elif request.method == 'PUT':
    #     data = JSONParser().parse(request)
    #     serializer = ITModelSerializer(model, data=data)
    #     if serializer.is_valid():
    #         serializer.save()
    #         return JsonResponse(serializer.data)
    #     return JsonResponse(serializer.errors, status=400)

    # elif request.method == 'DELETE':
    #     model.delete()
    #     return HttpResponse(status=204)
