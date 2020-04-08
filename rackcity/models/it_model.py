from django.core.exceptions import ValidationError
from django.db import models
from rackcity.models.fields import RCPositiveIntegerField
from django.contrib.postgres.fields import ArrayField
from rackcity.models.model_utils import DEFAULT_DISPLAY_COLOR, validate_display_color
from enum import Enum


DEFAULT_DISPLAY_COLOR = "#394B59"


class ModelType(Enum):
    RACKMOUNT_ASSET = "RACKMOUNT_ASSET"
    BLADE_CHASSIS = "BLADE_CHASSIS"
    BLADE_ASSET = "BLADE_ASSET"


MODEL_TYPE_CHOICES = [
    (ModelType.RACKMOUNT_ASSET.value, ModelType.RACKMOUNT_ASSET.value),
    (ModelType.BLADE_CHASSIS.value, ModelType.BLADE_CHASSIS.value),
    (ModelType.BLADE_ASSET.value, ModelType.BLADE_ASSET.value),
]


def validate_display_color(value):
    if value:
        color_pattern = re.compile("#[A-Fa-f0-9]{6}")
        if color_pattern.fullmatch(value) is None:
            raise ValidationError(value + " is not a valid hex color")


def validate_ports(model_type, num_power_ports, network_ports):
    if model_type == ModelType.BLADE_ASSET.value:
        error = ""
        if num_power_ports:
            error += "Blade assets may not have power ports. "
        if network_ports and len(network_ports) != 0:
            error += "Blade assets may not have power ports. "
        if error:
            raise ValidationError(error)
    return


def validate_height(model_type, height):
    if model_type == ModelType.BLADE_ASSET.value:
        if height:
            raise ValidationError("Blade models may not have a height. ")
    else:
        if not height:
            raise ValidationError("Rackmount models must have a height. ")
    return


class ITModel(models.Model):
    vendor = models.CharField(max_length=150)
    model_number = models.CharField(max_length=150)
    height = RCPositiveIntegerField(null=True, blank=True)
    display_color = models.CharField(
        max_length=7,
        default=DEFAULT_DISPLAY_COLOR,
        validators=[validate_display_color],
    )
    network_ports = ArrayField(models.CharField(max_length=150), null=True, blank=True)
    num_network_ports = RCPositiveIntegerField(null=True, blank=True)
    num_power_ports = RCPositiveIntegerField(null=True, blank=True)
    cpu = models.CharField(max_length=150, null=True, blank=True)
    memory_gb = RCPositiveIntegerField(null=True, blank=True)
    storage = models.CharField(max_length=150, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)
    model_type = models.CharField(max_length=150, choices=MODEL_TYPE_CHOICES)

    class Meta:
        ordering = ["vendor", "model_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["vendor", "model_number"], name="unique vendor model number"
            ),
        ]
        verbose_name = "model"

    def save(self, *args, **kwargs):
        try:
            validate_display_color(self.display_color)
        except ValidationError as validation_eror:
            raise validation_eror
        else:
            try:
                validate_ports(
                    self.model_type, self.num_power_ports, self.network_ports
                )
                validate_height(self.model_type, self.height)
            except ValidationError as validation_eror:
                raise validation_eror
            else:
                if self.network_ports:
                    self.num_network_ports = len(self.network_ports)
                super(ITModel, self).save(*args, **kwargs)

    def is_blade_chassis(self):
        return self.model_type == ModelType.BLADE_CHASSIS.value

    def is_blade_asset(self):
        return self.model_type == ModelType.BLADE_ASSET.value

    def is_rackmount(self):
        return (
            self.model_type == ModelType.BLADE_CHASSIS.value
            or self.model_type == ModelType.RACKMOUNT_ASSET.value
        )
