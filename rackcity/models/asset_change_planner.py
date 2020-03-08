from django.db import models
from .asset import validate_hostname, validate_owner
from django.core.validators import MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from .it_model import ITModel
from .rack import Rack
from .asset import Asset
from .change_plan import ChangePlan


class AssetCP(models.Model):
    related_asset = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    ## TODO: related_decomissioned_asset
    is_conflict = models.BooleanField(
        default=False,
        blank=True,
    )
    change_plan = models.ForeignKey(
        ChangePlan,
        on_delete=models.CASCADE,
    )
    asset_number = models.IntegerField(
        unique=True,
        validators=[
            MinValueValidator(100000),
            MaxValueValidator(999999)
        ],
        blank=True,
        # If blank, Asset numbers will be assigned on execution
        null=True,
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
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="related model",
    )
    rack = models.ForeignKey(
        Rack,
        on_delete=models.SET_NULL,
        null=True,
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
            validate_owner(self.owner)
        except ValidationError as valid_error:
            raise valid_error
        else:
            super(AssetCP, self).save(*args, **kwargs)
            ##TODO: Network ports and power ports 




