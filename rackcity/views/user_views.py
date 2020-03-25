from django.contrib.auth.decorators import permission_required
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import RegisterNameSerializer, UserSerializer
from rackcity.models import Asset
from rackcity.permissions.permissions import PermissionPath
from rackcity.utils.query_utils import (
    get_sort_arguments,
    get_filter_arguments,
    get_page_count_response,
    get_many_response,
)
from rackcity.utils.errors_utils import UserFailure, GenericFailure, Status
from rackcity.utils.user_utils import is_netid_user
from rackcity.utils.log_utils import (
    log_delete,
    log_user_permission_action,
    ElementType,
    PermissionAction,
)
import requests
from rest_framework.authtoken.models import Token
from rest_framework.decorators import permission_classes, api_view
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_auth.registration.views import RegisterView
from rackcity.permissions.groups import (
    add_user_to_group,
    remove_user_from_group,
    GroupName,
)


class RegisterNameView(RegisterView):
    serializer_class = RegisterNameSerializer
    permission_classes = [IsAdminUser]


@api_view(['POST'])
def netid_login(request):
    """
    Validate user's OAuth2 access token and return API user token.
    """
    if 'access_token' not in request.data:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + UserFailure.NETID_LOGIN.value,
                "errors": "Must include token on login"
            },
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
            {
                "failure_message":
                    Status.ERROR.value + UserFailure.NETID_LOGIN.value,
                "errors": "Request to Duke colab failed"},
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
@permission_required(PermissionPath.USER_WRITE.value, raise_exception=True)
def user_many(request):
    """
    List many users. If page is not specified as a query parameter, all
    instances are returned. If page is specified as a query parameter, page
    size must also be specified, and a page of users will be returned.
    """
    return get_many_response(
        User,
        UserSerializer,
        "users",
        request,
        default_order='username',
    )


@api_view(['POST'])
@permission_required(PermissionPath.USER_WRITE.value, raise_exception=True)
def user_delete(request):
    """
    Delete an existing user. Any assets owned by this user will be updated to
    have no owner.
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value + GenericFailure.INTERNAL.value,
                "errors": "Must include user id when deleting a user",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        existing_user = User.objects.get(id=data['id'])
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "User" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing user with id="+str(data['id']),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if is_netid_user(existing_user):
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Duke SSO authenticated users cannot be deleted"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    username = existing_user.username
    if username == 'admin':
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "Not allowed to delete user 'admin'",
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        existing_user.delete()
        log_delete(request.user, ElementType.USER, username)
    except Exception as error:
        return JsonResponse(
            {
                "failure_message":
                    Status.DELETE_ERROR.value +
                    "User" +
                    GenericFailure.ON_DELETE.value,
                "errors": str(error),
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        deleted_user_assets = Asset.objects.filter(owner=username)
        for asset in deleted_user_assets:
            asset.owner = None
            asset.save()
        return JsonResponse(
            {
                "success_message":
                    Status.SUCCESS.value + "User " + username + " deleted."
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
    return get_page_count_response(User, request.query_params)


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
@permission_classes([IsAuthenticated])
def i_am_admin(request):
    """
    Returns whether logged in user is an admin user.
    """
    return JsonResponse(
        {"is_admin": request.user.is_staff},
        status=HTTPStatus.OK
    )


@api_view(['POST'])
@permission_required(PermissionPath.USER_WRITE.value, raise_exception=True)
def user_grant_admin(request):
    """
    Grants admin permission to the specified user.
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    GenericFailure.INTERNAL.value,
                "errors":
                    "Must specify user id on grant admin permission"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    try:
        user = User.objects.get(id=data['id'])
    except ObjectDoesNotExist:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "User" + GenericFailure.DOES_NOT_EXIST.value,
                "errors":
                    "No existing user with id=" + data['id']
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if user.is_staff:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "User " + user.username +
                    "already has admin permission"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        user.is_staff = True
        user.save()
        log_user_permission_action(
            request.user,
            PermissionAction.GRANT,
            user.username
        )
        return JsonResponse(
            {
                "success_message":
                    Status.SUCCESS.value +
                    "Admin permission granted to user " +
                    user.username
            },
            status=HTTPStatus.OK,
        )


@api_view(['POST'])
@permission_required(PermissionPath.USER_WRITE.value, raise_exception=True)
def user_revoke_admin(request):
    """
    Revokes admin permission from the specified user.
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    GenericFailure.INTERNAL.value,
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
                    Status.MODIFY_ERROR.value +
                    "User" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing user with id=" + data['id']
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    if (user.is_superuser) or (user.username == 'admin'):
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Not allowed to revoke admin permission from superuser " +
                    user.username
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    elif (not user.is_staff) and (not user.is_superuser):
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Cannot revoke admin permission because user " +
                    user.username +
                    " does not have it"
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    else:
        user.is_staff = False
        user.save()
        log_user_permission_action(
            request.user,
            PermissionAction.REVOKE,
            user.username
        )
        return JsonResponse(
            {
                "success_message":
                    Status.SUCCESS.value + "Admin permission revoked from user " +
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


@api_view(['POST'])
@permission_required(PermissionPath.USER_WRITE.value, raise_exception=True)
def user_set_groups(request):
    """
    Set groups for a user.
    """
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    GenericFailure.INTERNAL.value,
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
                    Status.MODIFY_ERROR.value +
                    "User" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing user with id=" + data['id']
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    groups_added = []
    groups_removed = []
    for group in GroupName:
        group_key = group.value
        if group_key in data:
            if data[group_key]:
                added = add_user_to_group(user, group)
                if added:
                    groups_added.append(group_key)
            else:
                removed = remove_user_from_group(user, group)
                if removed:
                    groups_removed.append(group_key)
    current_groups = [group.name for group in user.groups.all()]
    success_message = ""
    if len(groups_added) > 0:
        success_message += \
            ("User added to group(s): " + ", ".join(groups_added) + ". ")
    if len(groups_removed) > 0:
        success_message += \
            ("User removed from group(s): " + ", ".join(groups_removed) + ". ")
    if len(groups_added) == 0 and len(groups_removed) == 0:
        success_message += \
            "User's groups were not changed. "
    if len(current_groups) > 0:
        success_message += \
            "User is now in group(s): " + ", ".join(current_groups) + "."
    else:
        success_message += \
            "User is now in no groups."
    return JsonResponse(
        {"success_message": Status.SUCCESS.value + success_message},
        status=HTTPStatus.OK,
    )


@api_view(['POST'])
@permission_required(PermissionPath.USER_WRITE.value, raise_exception=True)
def user_get_groups(request):
    data = JSONParser().parse(request)
    if 'id' not in data:
        return JsonResponse(
            {
                "failure_message":
                    Status.MODIFY_ERROR.value +
                    GenericFailure.INTERNAL.value,
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
                    Status.MODIFY_ERROR.value +
                    "User" + GenericFailure.DOES_NOT_EXIST.value,
                "errors": "No existing user with id=" + data['id']
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    group_list = []
    for group in user.groups.all():
        group_list.append(group.name)
    return JsonResponse(
        {"user_groups": group_list},
        status=HTTPStatus.OK,
    )


@api_view(['GET'])
@permission_required(PermissionPath.USER_WRITE.value, raise_exception=True)
def all_user_groups(request):
    group_list = []
    for group in GroupName:
        group_list.append(group.value)
    return JsonResponse(
        {"groups": group_list},
        status=HTTPStatus.OK,
    )
