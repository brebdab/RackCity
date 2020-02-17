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


def get_date_as_string():
    return str(datetime.now()) + ":"


def log_action(user, element, action):
    """
    Specified action should be Action enum.
    """
    date = datetime.now()
    related_model = None
    related_asset = None
    if isinstance(element, Asset):
        element_type = ElementType.ASSET.value
        element_name = element.hostname
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
        element_name = element.name
    log_content = " ".join([
        str(date) + ":",
        user.username,
        action.value,
        element_type,
        element_name
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
        related_model=related_model,
    )
    log.save()
    if related_asset:
        log.related_assets.add(related_asset)
    log.save()


def log_rack_action(user, action, related_racks):
    """
    Specified action should be Action enum, related_racks should be list of
    rack strings such as ['A1','A2',...]
    """
    date = datetime.now()
    log_content = " ".join([
        str(date) + ":",
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
        str(date) + ":",
        user.username,
        power_action.value,
        "for asset",
        related_asset.asset_number,
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()
    log.related_assets.add(related_asset)
    log.save()


def log_network_action(user, action, related_assets):
    """
    Specified action should be Action enum.
    """
    date = datetime.now()
    log_content = " ".join([
        str(date) + ":",
        user.username,
        action.value,
        "a network connection between assets:",
        ",".join(related_assets),
    ])
    log = Log(
        date=date,
        log_content=log_content,
        user=user,
    )
    log.save()
    for asset in related_assets:
        log.related_assets.add(asset)
    log.save()
