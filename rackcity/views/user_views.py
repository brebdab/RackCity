from django.contrib.auth.models import User
from django.http import JsonResponse
from http import HTTPStatus
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usernames(request):
    """
    Get all existing usernames.
    """
    usernames = [obj.username for obj in User.objects.all()]
    return JsonResponse(
        {"usernames": usernames},
        status=HTTPStatus.OK,
    )
