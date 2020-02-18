from datetime import datetime
from django.contrib.auth.models import User
from enum import Enum
from rackcity.models import Log, Asset, ITModel, Datacenter


class Action(Enum):
    CREATE = "created"
    MODIFY = "modified"
    DELETE = "deleted"


class PowerAction(Enum):
    ON = "turned on"
    OFF = "turned off"
    CYCLE = "cycled"


class ElementType(Enum):
    ASSET = "asset"
    DATACENTER = "datacenter"
    MODEL = "model"
    USER = "user"


def datetime_to_string(date):
    return "[" + str(date) + "]"


def log_action(user, element, action):
    """
    Specified action should be Action enum.
    """
    date = datetime.now()
    related_model = None
    related_asset = None
    if isinstance(element, Asset):
        element_type = ElementType.ASSET.value
        element_name = element.asset_number
        related_asset = element
    elif isinstance(element, ITModel):
        element_type = ElementType.MODEL.value
        element_name = element.vendor + " " + element.model_number
        related_model = element
    elif isinstance(element, User):
        element_type = ElementType.USER.value
        element_name = element.username
    elif isinstance(element, Datacenter):
        element_type = ElementType.DATACENTER.value
        element_name = element.abbreviation
    log_content = " ".join([
        datetime_to_string(date),
        element_type,
        element_name + ":",
        user.username,
        action.value,
        element_type,
        element_name
    ])
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
    Specified action should be Action enum, element_type should be ElementType
    enum.
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        element_type.value,
        element_name + ":",
        user.username,
        Action.DELETE.value,
        element_type,
        element_name
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()


def log_rack_action(user, action, related_racks):
    """
    Specified action should be Action enum, related_racks should be list of
    rack strings such as ['A1','A2',...]
    """
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        user.username,
        action.value,
        "the following racks:",
        ",".join(related_racks),
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
        related_asset.asset_number + ":",
        user.username,
        power_action.value,
        "for asset",
        related_asset.asset_number,
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_asset=related_asset,
    )
    log.save()


def log_network_action(user, action, asset_0, asset_1):
    """
    Specified action should be Action enum.
    """
    date = datetime.now()
    log_single_network_action(date, user, action, asset_0, asset_1)
    log_single_network_action(date, user, action, asset_1, asset_0)


def log_single_network_action(date, user, action, related_asset, other_asset):
    """
    Specified action should be Action enum.
    """
    log_content = " ".join([
        datetime_to_string(date),
        ElementType.ASSET.value,
        related_asset.asset_number + ":",
        "a network connection from asset",
        related_asset.asset_number,
        "to asset",
        other_asset.asset_number,
        "has been",
        action.value
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_asset=related_asset,
    )
    log.save()


def log_bulk_import(user, element_type):
    date = datetime.now()
    log_content = " ".join([
        datetime_to_string(date),
        user.username,
        "uploaded",
        element_type.value,
        "by bulk import",
    ])
