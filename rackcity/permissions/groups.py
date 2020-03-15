from django.contrib.auth.models import Group, User
from enum import Enum
from rackcity.permissions.permissions import PermissionName, get_permission


class GroupName(Enum):
    MODEL = 'model_management'
    ASSET = 'asset_management'
    POWER = 'power_control'
    AUDIT = 'audit_read'
    ADMIN = 'admin'


def set_group_permissions(group: Group, group_name: GroupName):
    """
    Adds correct permissions to a newly created Django Group.
    """
    if (group_name == GroupName.MODEL):
        group.permissions.add(get_permission(PermissionName.MODEL_WRITE))
    elif (group_name == GroupName.ASSET):
        group.permissions.add(get_permission(PermissionName.ASSET_WRITE))
    elif (group_name == GroupName.POWER):
        group.permissions.add(get_permission(PermissionName.POWER_WRITE))
    elif (group_name == GroupName.AUDIT):
        group.permissions.add(get_permission(PermissionName.AUDIT_READ))
    elif (group_name == GroupName.ADMIN):
        group.permissions.add(get_permission(PermissionName.MODEL_WRITE))
        group.permissions.add(get_permission(PermissionName.ASSET_WRITE))
        group.permissions.add(get_permission(PermissionName.POWER_WRITE))
        group.permissions.add(get_permission(PermissionName.AUDIT_READ))
        group.permissions.add(get_permission(PermissionName.USER_WRITE))


def get_group(group_name: GroupName) -> Tuple[Group, bool]:
    """
    Returns Django Group belonging to this name. If Group does not yet exist,
    it is created with the correct permissions.
    """
    group, created = Group.objects.get_or_create(name=group_name.value)
    if created:
        set_group_permissions(group, group_name)
    return group, created


def add_user_to_group(user: User, group_name: GroupName) -> bool:
    group, created = get_group(group_name)
    added = (created or not user.groups.filter(name=group.name).exists())
    if added:
        user.groups.add(group)
    return added


def remove_user_from_group(user: User, group_name: GroupName) -> bool:
    group, _ = get_group(group_name)
    removed = (user.groups.filter(name=group.name).exists())
    if removed:
        user.groups.remove(group)
    return removed
