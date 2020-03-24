from django.contrib.auth.models import Group, User
from django.core.exceptions import ObjectDoesNotExist
from enum import Enum
from rackcity.models import Datacenter, RackCityPermission
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


def update_user_groups(user, data):
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
    return groups_added, groups_removed, current_groups


def update_user_datacenter_permissions(user, datacenter_permissions):
    try:
        permission = RackCityPermission.objects.get(user=user.id)
    except ObjectDoesNotExist:
        permission = RackCityPermission(user=user)
        permission.save()
    for datacenter_id in datacenter_permissions:
        try:
            datacenter = Datacenter.objects.get(id=datacenter_id)
        except ObjectDoesNotExist:
            raise ObjectDoesNotExist
        else:
            permission.datacenter_permissions.add(datacenter)
    permission.save()
    current_datacenters = [
        dc.abbreviation for dc in permission.datacenter_permissions
    ]
    return current_datacenters
