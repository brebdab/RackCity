# from rest_framework.parsers import JSONParser
from django.http import HttpResponse, JsonResponse
from rackcity.models import ITInstance
from rackcity.api.serializers import (
    ITInstanceSerializer,
    RecursiveITInstanceSerializer,
)
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.parsers import JSONParser
from rest_framework.pagination import PageNumberPagination
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
        return JsonResponse({"instances": serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def instance_page(request):
    """
    List a page of instances.
    """
    instances = ITInstance.objects.all()
    paginator = PageNumberPagination()
    paginator.page_size = 10
    page_of_instances = paginator.paginate_queryset(instances, request)
    serializer = RecursiveITInstanceSerializer(page_of_instances, many=True)
    return JsonResponse({"instances": serializer.data})


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
    failure_message = ""
    if 'id' in data:
        failure_message += "Don't include id when adding an instance. "

    serializer = ITInstanceSerializer(data=data)
    if not serializer.is_valid(raise_exception=False):
        failure_message += str(serializer.errors)

    if failure_message == "":
        try:
            serializer.save()
            return HttpResponse(status=HTTPStatus.CREATED)
        except Exception as error:
            failure_message += str(error)

    failure_message = "Request was invalid. " + failure_message
    return JsonResponse(
        {"failure_message": failure_message},
        status=HTTPStatus.NOT_ACCEPTABLE,
    )
