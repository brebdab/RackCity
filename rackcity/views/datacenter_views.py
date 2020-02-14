from django.http import HttpResponse, JsonResponse
from rackcity.models import Datacenter
from rackcity.api.serializers import DatacenterSerializer
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from http import HTTPStatus
from rest_framework.parsers import JSONParser


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def datacenter_all(request):
    """
        Return List of all datacenters.
    """
    datacenters = Datacenter.objects.all()
    serializer = DatacenterSerializer(datacenters, many=True)
    return JsonResponse(
        {"datacenters": serializer.data},
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def datacenter_create(request):
    """
    Add a datacenter.
    """
    print(request)
    data = JSONParser().parse(request)
    failure_message = ""
    if 'id' in data:
        failure_message += "Don't include id when adding a datacenter"

    serializer = DatacenterSerializer(data=data)
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
        status=HTTPStatus.BAD_REQUEST,
    )
