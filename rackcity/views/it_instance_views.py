# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITInstance
from rackcity.api.serializers import ITInstanceSerializer, RecursiveITInstanceSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import JSONParser
from http import HTTPStatus


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def instance_list(request):
    """
    List all instances.
    """
    if request.method == 'GET':
        instances = ITInstance.objects.all()
        serializer = RecursiveITInstanceSerializer(instances, many=True)
        return JsonResponse(serializer.data, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def instance_detail(request, pk):
    """
    Retrieve a single instance.
    """
    try:
        instance = ITInstance.objects.get(pk=pk)
    except ITInstance.DoesNotExist:
        return HttpResponse(status=404)

    if request.method == 'GET':
        serializer = RecursiveITInstanceSerializer(instance)
        return JsonResponse(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def instance_add(request):
    """
    Add a new instance.
    """
    data = JSONParser().parse(request)
    error_description = ""
    if 'id' in data:
        error_description += "Don't include id on add. "
        return JsonResponse(
            {"error_description": error_description},
            status=HTTPStatus.BAD_REQUEST,
        )

    serializer = ITInstanceSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        error_description += str(serializer.errors)

    if error_description == "":
        try:
            serializer.save()
            return JsonResponse(
                {},
                status=HTTPStatus.OK
            )
        except Exception as error:
            error_description += str(error)

    return JsonResponse(
        {"error_description": error_description},
        status=HTTPStatus.BAD_REQUEST,
    )
