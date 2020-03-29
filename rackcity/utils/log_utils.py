from datetime import datetime
from django.contrib.auth.models import User
from enum import Enum
from rackcity.models import Log, Asset, ITModel, Datacenter


class Action(Enum):
    CREATE = "created"
    MODIFY = "modified"
    DELETE = "deleted"


class PermissionAction(Enum):
    REVOKE = "revoked admin permission from"
    GRANT = "granted admin permission to"


class PowerAction(Enum):
    ON = "turned on power"
    OFF = "turned off power"
    CYCLE = "cycled power"


class ElementType(Enum):
    ASSET = "asset"
    DATACENTER = "datacenter"
    MODEL = "model"
    USER = "user"
    NETWORK_CONNECTIONS = "network connections"


def datetime_to_string(date):
    return "[" + str(date) + "]"


def log_action(user, related_element, action, change_plan):
    """
    Specified action should be Action enum.
    """
    date = datetime.now()
    related_model = None
    related_asset = None
    if isinstance(related_element, Asset):
        element_type = ElementType.ASSET.value
        element_name = get_asset_name(related_element)
        related_asset = related_element
    elif isinstance(related_element, ITModel):
        element_type = ElementType.MODEL.value
        element_name = " ".join([
            related_element.vendor,
            related_element.model_number
        ])
        related_model = related_element
    elif isinstance(related_element, User):
        element_type = ElementType.USER.value
        element_name = related_element.username
    elif isinstance(related_element, Datacenter):
        element_type = ElementType.DATACENTER.value
        element_name = related_element.abbreviation
    log_content = " ".join([
        datetime_to_string(date),
        element_type,
        element_name + ":",
        ElementType.USER.value,
        user.username,
        action.value,
        "this",
        element_type
    ])
    if change_plan:
        log_content += \
            " in the execution of Change Plan '" + change_plan.name + "'"
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_asset=related_asset,
        related_model=related_model,
    )
    log.save()


def log_delete(user, element_type, element_name):
    """
    Specified element_type should be ElementType enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        element_type.value,
        element_name + ":",
        ElementType.USER.value,
        user.username,
        Action.DELETE.value,
        "this",
        element_type.value
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_execute_change_plan(
    user,
    change_plan_name,
    num_created,
    num_modified,
    num_decommissioned
):
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.USER.value,
        user.username,
        "executed Change Plan"
        "'" + change_plan_name + "':",
        str(num_created),
        "assets created,",
        str(num_modified),
        "assets modified,",
        str(num_decommissioned),
        "assets decommissioned."
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_rack_action(user, action, related_racks, datacenter):
    """
    Specified action should be Action enum, related_racks should be list of
    rack strings such as ['A1','A2',...]
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.USER.value,
        user.username,
        action.value,
        "the following racks:",
        related_racks,
        "in datacenter",
        datacenter
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_user_permission_action(user, permission_action, username):
    """
    Specified permission_action should be PermissionAction enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.USER.value,
        user.username,
        permission_action.value,
        ElementType.USER.value,
        username,
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_power_action(user, power_action, related_asset):
    """
    Specified power_action should be PowerAction enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.ASSET.value,
        get_asset_name(related_asset) + ":",
        ElementType.USER.value,
        user.username,
        power_action.value,
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_asset=related_asset,
    )
    log.save()


def log_network_action(user, related_asset):
    """
    Specified action should be Action enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.ASSET.value,
        get_asset_name(related_asset) + ":",
        ElementType.USER.value,
        user.username,
        Action.MODIFY.value,
        "a network connection from this asset"
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_asset=related_asset,
    )
    log.save()


def log_bulk_upload(user, element_type, num_approved, num_ignored, num_modified):
    """
    Specified element_type should be ElementType enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.USER.value,
        user.username,
        "uploaded",
        element_type.value,
        "by bulk import:",
        str(num_approved),
        "adds,",
        str(num_ignored),
        "ignores,",
        str(num_modified),
        "potential modifies"
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_bulk_approve(user, element_type, num_modified):
    """
    Specified element_type should be ElementType enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.USER.value,
        user.username,
        "approved",
        str(num_modified),
        element_type.value,
        "modifications by bulk import"
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def get_asset_name(asset):
    asset_name = str(asset.asset_number)
    if (asset.hostname):
        asset_name += \
            " (" + asset.hostname + ")"
    return asset_name
