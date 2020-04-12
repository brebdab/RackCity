from django.core.exceptions import ValidationError
import re
from enum import Enum

DEFAULT_DISPLAY_COLOR = "#394B59"


class ModelType(Enum):
    RACKMOUNT_ASSET = "Asset"
    BLADE_CHASSIS = "Blade Chassis"
    BLADE_ASSET = "Blade Server "


def validate_display_color(value):
    if value:
        color_pattern = re.compile("#[A-Fa-f0-9]{6}")
        if color_pattern.fullmatch(value) is None:
            raise ValidationError(value + " is not a valid hex color")

def validate_portname(value):
    whitespace = re.compile("\s")
    if whitespace.search(value) is not None:
        raise ValidationError("Port name must be whitespace free. ")

