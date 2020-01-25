from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITModel
from rackcity.api.serializers import ITModelSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser


@api_view(['GET'])
def model_list(request):
    """
    List all models.
    """
    if request.method == 'GET':
        # print(request.auth)
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)



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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_auth(request):
    """
    List all models, but requires user authentication in header.
    (Temporary for auth testing on front end)
    """
    if request.method == 'GET':
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)



@api_view(['GET'])
@permission_classes([IsAdminUser])
def model_admin(request):
    """ 
    List all models, but requires request comes from admin user.
    (Temporary for auth testing on front end)
    """
    if request.method == 'GET':
        models = ITModel.objects.all()
        serializer = ITModelSerializer(models, many=True)
        return JsonResponse(serializer.data, safe=False)


@api_view(['GET'])
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
