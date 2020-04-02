from django.contrib.auth.models import Permission, User
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from enum import Enum
from http import HTTPStatus
from rackcity.models import (
    Asset,
    ITModel,
    Log,
    Rack,
    RackCityPermission,
)
from rackcity.utils.exceptions import UserAssetPermissionException
from typing import Tuple
from rackcity.utils.errors_utils import (
    Status,
    GenericFailure,
    AuthFailure,
)


class PermissionName(Enum):
    MODEL_WRITE = "User can create, modify, delete models"
    ASSET_WRITE = "User can create, modify, delete assets"
    POWER_WRITE = "User can control asset power"
    AUDIT_READ = "User can read audit log"
    USER_WRITE = "User can create, modify, delete other users"


class PermissionCodename(Enum):
    MODEL_WRITE = "model_write"
    ASSET_WRITE = "asset_write"
    POWER_WRITE = "power_write"
    AUDIT_READ = "audit_read"
    USER_WRITE = "user_write"


class PermissionPath(Enum):
    MODEL_WRITE = "rackcity." + PermissionCodename.MODEL_WRITE.value
    ASSET_WRITE = "rackcity." + PermissionCodename.ASSET_WRITE.value
    POWER_WRITE = "rackcity." + PermissionCodename.POWER_WRITE.value
    AUDIT_READ = "rackcity." + PermissionCodename.AUDIT_READ.value
    USER_WRITE = "auth." + PermissionCodename.USER_WRITE.value


def get_metadata_for_permission(
    permission_name: PermissionName,
) -> Tuple[PermissionCodename, ContentType]:
    if permission_name == PermissionName.MODEL_WRITE:
        content_type = ContentType.objects.get_for_model(ITModel)
        return PermissionCodename.MODEL_WRITE, content_type
    elif permission_name == PermissionName.ASSET_WRITE:
        content_type = ContentType.objects.get_for_model(Asset)
        return PermissionCodename.ASSET_WRITE, content_type
    elif permission_name == PermissionName.POWER_WRITE:
        content_type = ContentType.objects.get_for_model(Asset)
        return PermissionCodename.POWER_WRITE, content_type
    elif permission_name == PermissionName.AUDIT_READ:
        content_type = ContentType.objects.get_for_model(Log)
        return PermissionCodename.AUDIT_READ, content_type
    # elif (permission_name == PermissionName.USER_WRITE):
    # TODO Python should recognize this is an exhaustive switch case ^
    else:
        content_type = ContentType.objects.get_for_model(User)
        return PermissionCodename.USER_WRITE, content_type


def get_permission(permission_name: PermissionName) -> Permission:
    codename, content_type = get_metadata_for_permission(permission_name)
    permission, _ = Permission.objects.get_or_create(
        codename=codename.value, name=permission_name.value, content_type=content_type,
    )
    return permission


def user_has_asset_permission(user, datacenter=None):
    if user.has_perm(PermissionPath.ASSET_WRITE.value):
        return True
    if datacenter:
        try:
            permission = RackCityPermission.objects.get(user=user.id)
        except ObjectDoesNotExist:
            return False
        else:
            if datacenter in permission.datacenter_permissions.all():
                return True
    return False


def validate_user_asset_permission_to_add(user, validated_data):
    rack_id = validated_data["rack"].id
    try:
        rack = Rack.objects.get(id=rack_id)
    except ObjectDoesNotExist:
        raise Exception("Rack '" + str(rack_id) + "' does not exist")
    if not user_has_asset_permission(user, rack.datacenter):
        raise UserAssetPermissionException(
            "User '"
            + user.username
            + "' does not have asset permission in datacenter '"
            + rack.datacenter.abbreviation
            + "'."
        )


def validate_user_asset_permission_to_modify_or_delete(user, asset):
    if asset.rack and not user_has_asset_permission(user, asset.rack.datacenter):
        raise UserAssetPermissionException(
            "User '"
            + user.username
            + "' does not have asset permission in datacenter '"
            + asset.rack.datacenter.abbreviation
            + "'."
        )


def user_has_power_permission(user, asset=None):
    return user.has_perm(PermissionPath.POWER_WRITE.value) or (
        asset and (user.username == asset.owner)
    )
