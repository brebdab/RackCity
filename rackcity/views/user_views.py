from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import RegisterNameSerializer
import requests
from rest_framework.authtoken.models import Token
from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_auth.registration.views import RegisterView


class RegisterNameView(RegisterView):
    serializer_class = RegisterNameSerializer
    permission_classes = [IsAdminUser]


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def who_am_i(request):
    """
    Get all information about the logged in user.
    """
    user = request.user
    return JsonResponse(
        {
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_admin": user.is_staff,
        },
        HTTPStatus.OK,
    )


@api_view(['POST'])
def netid_login(request):
    """
    Validate user's OAuth2 access token and return API user token.
    """
    failure_message = "The Duke NetID login credentials you have " + \
        "provided are invalid."
    if 'access_token' not in request.data:
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    access_token = request.data['access_token']
    url = 'https://api.colab.duke.edu/identity/v1/'
    client_id = 'hyposoft-rack-city'
    headers = {
        "x-api-key": client_id,
        "Authorization": 'Bearer ' + access_token,
    }
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )
    user_data = response.json()
    username = user_data['netid']
    first_name = user_data['firstName']
    last_name = user_data['lastName']
    email = user_data['mail']
    try:
        user = User.objects.get(username=username)
    except ObjectDoesNotExist:
        user = User(
            username=username,
            first_name=first_name,
            last_name=last_name,
            email=email,
        )
        user.save()
    token, _ = Token.objects.get_or_create(user=user)
    return JsonResponse(
        {"token": token.key},
        status=HTTPStatus.OK,
    )
