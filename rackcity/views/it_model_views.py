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


@api_view(['POST'])
@permission_classes([IsAdminUser])
def model_add(request):
    """
    Add a new model
    """
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' in data:
        failure_message = failure_message + "Don't include id when adding a model. "
    serializer = ITModelSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        failure_message = failure_message + str(serializer.errors)
    if failure_message == "":
        try:
            serializer.save()
            return JsonResponse({"success": True}, status=201)
        except Exception as error:
            failure_message = failure_message + str(error)

    failure_message = "Request was invalid. " + failure_message
    return JsonResponse({
        "success": False,
        "failure_message": failure_message
    },
        status=406
    )


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


@api_view(['GET'])
def i_am_admin(request):
    print("yeah")
    if(request.user.is_superuser):
        print("yeah")
        return JsonResponse({"is_admin": True})
    else:
        print("nah")
        return JsonResponse({"is_admin": False})
