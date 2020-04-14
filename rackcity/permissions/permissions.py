from django.contrib.auth.models import Permission, User
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from enum import Enum
from rackcity.models import (
    Asset,
    ITModel,
    Log,
    Site,
)
from rackcity.utils.exceptions import UserAssetPermissionException
from rest_framework.permissions import BasePermission
from typing import Tuple


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


class RegisterUserPermission(BasePermission):
    message = "User write permission required"

    def has_permission(self, request, view):
        return request.user.has_perm(PermissionPath.USER_WRITE.value)


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


def user_has_asset_permission(user, site):
    return user.has_perm(
        PermissionPath.ASSET_WRITE.value
    ) or site.user_has_site_level_permission(user)


def validate_user_permission_on_new_asset_data(user, asset_data):
    site = None
    if "offline_storage_site" in asset_data:
        site_id = asset_data["offline_storage_site"].id
        try:
            site = Site.objects.get(id=site_id)
        except ObjectDoesNotExist:
            raise Exception("Site '" + str(site_id) + "' does not exist")
    elif "model" in asset_data:
        model_id = asset_data["model"].id
        try:
            model = ITModel.objects.get(id=model_id)
        except ObjectDoesNotExist:
            raise Exception("Model '" + str(model_id) + "' does not exist")
        if model.is_rackmount():
            site = model.rack.datacenter
        elif model.is_blade_asset():
            if "chassis" in asset_data:
                chassis_id = asset_data["chassis"].id
                try:
                    chassis = Asset.objects.get(id=chassis_id)
                except ObjectDoesNotExist:
                    raise Exception("Chassis '" + str(chassis_id) + "' does not exist")
                site = chassis.rack.datecenter
    if site:
        if not user_has_asset_permission(user, site):
            raise UserAssetPermissionException(
                "User '"
                + user.username
                + "' does not have asset permission in site '"
                + site.abbreviation
                + "'."
            )
    else:
        raise UserAssetPermissionException(
            "User '" + user.username + "' does not have asset permission."
        )


def validate_user_permission_on_existing_asset(user, asset):
    site = None
    if asset.is_in_offline_storage():
        site = asset.offline_storage_site
    elif asset.model.is_rackmount():
        site = asset.rack.datacenter
    elif asset.model.is_blade_asset():
        site = asset.chassis.rack.datacenter
    if site:
        if not user_has_asset_permission(user, site):
            raise UserAssetPermissionException(
                "User '"
                + user.username
                + "' does not have asset permission in site '"
                + site.abbreviation
                + "'."
            )
    else:
        raise UserAssetPermissionException(
            "User '" + user.username + "' does not have asset permission."
        )


def user_has_power_permission(user, asset=None):
    return user.has_perm(PermissionPath.POWER_WRITE.value) or (
        asset and (user.username == asset.owner)
    )
