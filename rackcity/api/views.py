from rest_framework import viewsets
from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rackcity.models import (
    Article, 
    ITInstance,
    ITModel, 
    Rack, 
    User
)
from rackcity.api.serializers import (
    ArticleSerializer, 
    ITInstanceSerializer, 
    ITModelSerializer, 
    RackSerializer, 
    UserSerializer
)

class ArticleViewSet(viewsets.ModelViewSet):
    serializer_class = ArticleSerializer
    queryset = Article.objects.all()

@csrf_exempt
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