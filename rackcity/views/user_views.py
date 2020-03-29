from django.contrib.auth.decorators import permission_required
from django.contrib.auth.mixins import PermissionRequiredMixin
from django.contrib.auth.models import User, Group
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from http import HTTPStatus
from rackcity.api.serializers import RegisterNameSerializer, UserSerializer
from rackcity.models import Asset, RackCityPermission
from rackcity.permissions.groups import (
    GroupName,
    update_user_groups,
    update_user_datacenter_permissions,
)
from rackcity.permissions.permissions import PermissionPath
from rackcity.utils.query_utils import (
    get_page_count_response,
    get_many_response,
)
from rackcity.utils.errors_utils import (
    UserFailure,
    GenericFailure,
    Status,
    get_user_permission_success,
)
from rackcity.utils.log_utils import (
    log_delete,
    log_user_permission_action,
    ElementType,
    PermissionAction,
)
from rackcity.utils.user_utils import is_netid_user
import requests
from rest_auth.registration.views import RegisterView
from rest_framework.authtoken.models import Token
from rest_framework.decorators import permission_classes, api_view
from rest_framework.parsers import JSONParser
from rest_framework.permissions import IsAuthenticated


class RegisterNameView(PermissionRequiredMixin, RegisterView):
    serializer_class = RegisterNameSerializer
    permission_required = PermissionPath.USER_WRITE.value
    raise_exception = True


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
    Set groups and permissions for a user.
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

    groups_added, groups_removed, current_groups = \
        update_user_groups(user, data)
    if 'datacenter_permissions' in data:
        try:
            current_datacenters = \
                update_user_datacenter_permissions(
                    user,
                    data['datacenter_permissions'],
                )
        except ObjectDoesNotExist:
            return JsonResponse(
                {
                    "failure_message":
                    Status.MODIFY_ERROR.value +
                    "Datacenter" + GenericFailure.DOES_NOT_EXIST.value,
                    "errors": "No existing datacenter with id"
                },
                status=HTTPStatus.BAD_REQUEST,
            )
    else:
        current_datacenters = []

    success_message = get_user_permission_success(
        groups_added,
        groups_removed,
        current_groups,
        current_datacenters,
    )
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
                "errors": "No existing user with id="+str(data['id'])
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    permissions = get_permissions(user)
    return JsonResponse(
        permissions,
        status=HTTPStatus.OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_get_my_groups(request):
    user = request.user
    permissions = get_permissions(user)
    return JsonResponse(
        permissions,
        status=HTTPStatus.OK,
    )


def get_permissions(user):
    permissions = {}
    for group_name in GroupName:
        try:
            group = Group.objects.get(name=group_name.value)
        except ObjectDoesNotExist:
            user_in_group = False
        else:
            user_in_group = (group in user.groups.all())
        permissions[group_name.value] = user_in_group
    try:
        permission = RackCityPermission.objects.get(user=user.id)
    except ObjectDoesNotExist:
        datacenter_list = []
    else:
        datacenter_list = [
            dc.id for dc in permission.datacenter_permissions.all()
        ]
    permissions['datacenter_permissions'] = datacenter_list
    return permissions


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
