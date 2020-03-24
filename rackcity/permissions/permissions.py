from django.contrib.auth.models import Permission, User
from django.contrib.contenttypes.models import ContentType
from enum import Enum
from rackcity.models import ITModel, Asset, Log
from typing import Tuple


class PermissionName(Enum):
    MODEL_WRITE = 'User can create, modify, delete models'
    ASSET_WRITE = 'User can create, modify, delete assets'
    POWER_WRITE = 'User can control asset power'
    AUDIT_READ = 'User can read audit log'
    USER_WRITE = 'User can create, modify, delete other users'


class PermissionCodename(Enum):
    MODEL_WRITE = 'model_write'
    ASSET_WRITE = 'asset_write'
    POWER_WRITE = 'power_write'
    AUDIT_READ = 'audit_read'
    USER_WRITE = 'user_write'


def get_metadata_for_permission(
    permission_name: PermissionName
) -> Tuple[PermissionCodename, ContentType]:
    if (permission_name == PermissionName.MODEL_WRITE):
        content_type = ContentType.objects.get_for_model(ITModel)
        return PermissionCodename.MODEL_WRITE, content_type
    elif (permission_name == PermissionName.ASSET_WRITE):
        content_type = ContentType.objects.get_for_model(Asset)
        return PermissionCodename.ASSET_WRITE, content_type
    elif (permission_name == PermissionName.POWER_WRITE):
        content_type = ContentType.objects.get_for_model(Asset)
        return PermissionCodename.POWER_WRITE, content_type
    elif (permission_name == PermissionName.AUDIT_READ):
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
        codename=codename,
        name=permission_name.value,
        content_type=content_type,
    )
    return permission
