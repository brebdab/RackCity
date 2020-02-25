import re
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from .it_model import ITModel
from .rack import Rack


def get_next_available_asset_number():
    for asset_number in range(100000, 999999):
        try:
            Asset.objects.get(asset_number=asset_number)
        except ObjectDoesNotExist:
            return asset_number
            
def validate_hostname(value):
    hostname_pattern = re.compile("[A-Za-z]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?")
    if value and hostname_pattern.fullmatch(value) is None:
        raise ValidationError("'" + value + "' is not a valid hostname as " +
                              "it is not compliant with RFC 1034.")


def validate_owner(value):
    if (
        value != ""
        and value not in [obj.username for obj in User.objects.all()]
    ):
        raise ValidationError(
            "There is no existing user with the username '" + value + "'."
        )


class Asset(models.Model):
    asset_number = models.IntegerField(
        unique=True,
        validators=[
            MinValueValidator(100000),
            MaxValueValidator(999999)
        ],
        blank=True
    )
    hostname = models.CharField(
        max_length=150,
        unique=True,
        validators=[validate_hostname],
        null=True,
        blank=True,
    )
    rack_position = models.PositiveIntegerField()
    model = models.ForeignKey(
        ITModel,
        on_delete=models.CASCADE,
        verbose_name="related model",
    )
    rack = models.ForeignKey(
        Rack,
        on_delete=models.CASCADE,
        verbose_name="related rack",
    )
    owner = models.CharField(
        max_length=150,
        null=True,
        blank=True,
        validators=[validate_owner]
    )
    comment = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['asset_number']
        verbose_name = 'asset'

    def save(self, *args, **kwargs):
        try:
            validate_hostname(self.hostname)
            if self.owner is not None:
                validate_owner(self.owner)
        except ValidationError as valid_error:
            raise valid_error
        else:
            if self.asset_number is None:
                self.asset_number = get_next_available_asset_number()
            super(Asset, self).save(*args, **kwargs)
            self.add_network_ports()
            self.add_power_ports()

    def add_network_ports(self):
        from rackcity.models import NetworkPort
        model = self.model
        if (
            len(NetworkPort.objects.filter(asset=self.id)) == 0  # only new assets
            and model.network_ports  # only if the model has ports
        ):
            for network_port_name in model.network_ports:
                network_port = NetworkPort(
                    asset=self,
                    port_name=network_port_name,
                )
                network_port.save()

    def add_power_ports(self):
        from rackcity.models import PowerPort
        if len(PowerPort.objects.filter(asset=self.id)) == 0:
            model = self.model
            for port_index in range(model.num_power_ports):
                port_name = str(port_index+1)
                power_port = PowerPort(
                    asset=self,
                    port_name=port_name,
                )
                power_port.save()
