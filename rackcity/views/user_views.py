from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from http import HTTPStatus
import math
from rackcity.api.serializers import RegisterNameSerializer, UserSerializer
import requests
from rest_framework.authtoken.models import Token
from rest_framework.decorators import permission_classes, api_view
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_auth.registration.views import RegisterView


class RegisterNameView(RegisterView):
    serializer_class = RegisterNameSerializer
    permission_classes = [IsAdminUser]


@api_view(['POST'])
def netid_login(request):
    """
    Validate user's OAuth2 access token and return API user token.
    """
    failure_message = "The Duke NetID login credentials you have provided " + \
        "are invalid."
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
        {"key": token.key},
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def user_list(request):
    """
    List many users. If page is not specified as a query parameter, all
    instances are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of users will be returned.
    """

    failure_message = ""

    should_paginate = not(
        request.query_params.get('page') is None
        and request.query_params.get('page_size') is None
    )

    if should_paginate:
        if not request.query_params.get('page'):
            failure_message += "Must specify field 'page' on " + \
                "paginated requests. "
        elif not request.query_params.get('page_size'):
            failure_message += "Must specify field 'page_size' on " + \
                "paginated requests. "
        elif int(request.query_params.get('page_size')) <= 0:
            failure_message += "Field 'page_size' must be an integer " + \
                "greater than 0. "

    if failure_message != "":
        return JsonResponse(
            {"failure_message": failure_message},
            status=HTTPStatus.BAD_REQUEST,
        )

    users = User.objects.all()

    if should_paginate:
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size')
        try:
            page_of_users = paginator.paginate_queryset(users, request)
        except Exception as error:
            failure_message += "Invalid page requested: " + str(error)
            return JsonResponse(
                {"failure_message": failure_message},
                status=HTTPStatus.BAD_REQUEST,
            )
        users_to_serialize = page_of_users
    else:
        users_to_serialize = users

    serializer = UserSerializer(
        users_to_serialize,
        many=True,
    )
    return JsonResponse(
        {"users": serializer.data},
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def user_delete(request):
    """
    Delete an existing user. Any assets owned by this user will be updated to
    have no owner.
    """
    delete_error_message = \
        "User cannot be deleted because an error has occurred."
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message": delete_error_message,
                "errors": "Must include user id when deleting a user.",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        existing_user = User.objects.get(id=data['id'])
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message": "User does not exist.",
                "errors": "No existing user with id="+str(data['id'])+".",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    username = existing_user.username
    if username == 'admin':
        return JsonResponse(
            {
                "failure_message": "User admin cannot be deleted.",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        existing_user.delete()
    except Exception as error:
        return JsonResponse(
            {
                "failure_message": delete_error_message,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        return JsonResponse(
            {
                "success_message":
                "User " + username + " successfully deleted."
            },
            status=HTTPStatus.OK,
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def user_page_count(request):
    """
    Return total number of pages according to page size, which must be
    specified as query parameter.
    """
    if (
        not request.query_params.get('page_size')
        or int(request.query_params.get('page_size')) <= 0
    ):
        return JsonResponse(
            {"failure_message": "Must specify positive integer page_size."},
            status=HTTPStatus.BAD_REQUEST,
        )
    page_size = int(request.query_params.get('page_size'))
    user_count = User.objects.all().count()
    page_count = math.ceil(user_count / page_size)
    return JsonResponse({"page_count": page_count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def who_am_i(request):
    """
    Get all information about the logged in user.
    """
    user = request.user
    serializer = UserSerializer(user)
    return JsonResponse(serializer.data, status=HTTPStatus.OK)


@api_view(['GET'])
def i_am_admin(request):
    """
    Returns whether logged in user is an admin user.
    """
    return JsonResponse(
        {"is_admin": request.user.is_staff},
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def user_grant_admin(request):
    """
    Grants admin permission to the specified user.
    """
    failure_message = "Grant admin permission failed: "
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                failure_message + "Internal error",
                "errors": "Must specify user id on grant admin permission"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        user = User.objects.get(id=data['id'])
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                failure_message + "User does not exist",
                "errors": "No existing user with id=" + data['id']
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if user.is_staff:
        return JsonResponse(
            {
                "failure_message":
                failure_message +
                "User " +
                user.username +
                " already has admin permission"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        user.is_staff = True
        user.save()
        return JsonResponse(
            {
                "success_message":
                "Admin permission has been granted to user " +
                user.username
            },
            status=HTTPStatus.OK,
        )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def user_revoke_admin(request):
    """
    Revokes admin permission from the specified user.
    """
    failure_message = "Revoke admin permission failed: "
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                failure_message + "Internal error",
                "errors": "Must specify user id on admin permission revoke"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        user = User.objects.get(id=data['id'])
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                failure_message + "User does not exist",
                "errors": "No existing user with id=" + data['id']
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if (user.is_superuser) or (user.username == 'admin'):
        return JsonResponse(
            {
                "failure_message":
                failure_message +
                "Admin permission cannot be revoked from superuser " +
                user.username
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    elif (not user.is_staff) and (not user.is_superuser):
        return JsonResponse(
            {
                "failure_message":
                failure_message +
                "User " +
                user.username +
                " does not have admin permission to revoke"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        user.is_staff = False
        user.save()
        return JsonResponse(
            {
                "success_message":
                "Admin permission has been revoked from user " +
                user.username
            },
            status=HTTPStatus.OK,
        )


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
