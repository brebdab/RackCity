from .change_plan import ChangePlan
from .decommissioned_asset import DecommissionedAsset
from .it_model import ITModel
from .rack import Rack
from .site import Site
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from rackcity.models.model_utils import validate_display_color
from rackcity.models.fields import RCPositiveIntegerField
import re


def get_next_available_asset_number():
    for asset_number in range(100000, 999999):
        try:
            Asset.objects.get(asset_number=asset_number)
        except ObjectDoesNotExist:
            return asset_number


def get_assets_for_cp(change_plan, show_decommissioned=False):
    """
    If a change plan is specified, returns Asset query and AssetCP query,
    where any assets modified in the change plan are in the AssetCP query but
    removed from the Asset query. If no change plan is specified, returns
    Asset query of all assets on master. Does not return decomissioned AssetCPs
    """
    assets = Asset.objects.all()
    if change_plan is None:
        return (assets, None)
    assetsCP = AssetCP.objects.filter(change_plan=change_plan)
    for assetCP in assetsCP:
        if (assetCP.related_asset) and (assetCP.related_asset) in assets:
            assets = assets.filter(~Q(id=assetCP.related_asset.id))
    if not show_decommissioned:
        assetsCP = assetsCP.filter(is_decommissioned=False)
    return (assets, assetsCP)


def validate_hostname(value):
    hostname_pattern = re.compile("[A-Za-z]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?")
    if value and hostname_pattern.fullmatch(value) is None:
        raise ValidationError(
            "'"
            + value
            + "' is not a valid hostname as "
            + "it is not compliant with RFC 1034."
        )


def validate_hostname_uniqueness(value, asset_id, change_plan, related_asset):
    assets, assets_cp = get_assets_for_cp(change_plan.id)
    matching_assets = assets_cp.filter(hostname=value, change_plan=change_plan)
    if (
        len(matching_assets) > 0
        and matching_assets[0].id != asset_id
        and not matching_assets[0].is_decommissioned
    ):
        raise ValidationError(
            "'"
            + value
            + "'is not a unique hostname. \
            An existing asset on this change plan exists with this hostname."
        )
    related_asset_id = None
    if related_asset:
        related_asset_id = related_asset.id

    matching_assets = assets.filter(hostname=value)
    if len(matching_assets) > 0 and not (
        related_asset and matching_assets[0].id == related_asset_id
    ):
        raise ValidationError(
            "'"
            + value
            + "'is not a unique hostname. \
            An existing asset exists with this hostname."
        )


def validate_asset_number_uniqueness(value, asset_id, change_plan, related_asset):
    assets, assets_cp = get_assets_for_cp(change_plan.id)
    matching_assets = assets_cp.filter(asset_number=value, change_plan=change_plan)
    if value is None:
        return
    if (
        len(matching_assets) > 0
        and matching_assets[0].id != asset_id
        and not matching_assets[0].is_decommissioned
    ):
        raise ValidationError(
            "'"
            + str(value)
            + "'is not a unique asset number. \
            An existing asset on this change plan exists with this asset number."
        )
    related_asset_id = None

    if related_asset:
        related_asset_id = related_asset.id
    matching_assets = assets.filter(asset_number=value)
    if (len(matching_assets) > 0) and (
        not (related_asset and matching_assets[0].id == related_asset_id)
    ):
        raise ValidationError(
            "'"
            + str(value)
            + "'is not a unique asset number. \
            An existing asset exists with this asset number."
        )


def validate_owner(value):
    if value and value not in [obj.username for obj in User.objects.all()]:
        raise ValidationError(
            "There is no existing user with the username '" + value + "'."
        )


def validate_location_type(
    model, rack, rack_position, chassis, chassis_slot, offline_storage_site,
):
    if model.is_rackmount():
        if offline_storage_site and (rack or rack_position):
            raise ValidationError(
                "Rackmount assets in storage must not have a rack or rack position. "
            )
        if (not offline_storage_site) and (not rack or not rack_position):
            raise ValidationError(
                "Rackmount assets not in storage must have a rack and rack position. "
            )
        if chassis or chassis_slot:
            raise ValidationError(
                "Rackmount assets must not have a chassis or chassis slot. "
            )
    else:
        if (not offline_storage_site) and (not chassis or not chassis_slot):
            raise ValidationError(
                "Blade assets not in storage must have a chassis and chassis slot. "
            )
        if rack or rack_position:
            raise ValidationError(
                "Blade assets must not have a rack or rack position. "
            )


class AssetID(models.Model):
    id = models.AutoField(primary_key=True)


class AbstractAsset(AssetID):
    rack_position = RCPositiveIntegerField(null=True, blank=True,)
    chassis_slot = RCPositiveIntegerField(null=True, blank=True,)
    owner = models.CharField(
        max_length=150, null=True, blank=True, validators=[validate_owner]
    )
    comment = models.TextField(null=True, blank=True)
    cpu = models.CharField(max_length=150, default="", blank=True)
    display_color = models.CharField(
        max_length=7, validators=[validate_display_color], default="", blank=True
    )
    storage = models.CharField(max_length=150, blank=True, default="")
    memory_gb = RCPositiveIntegerField(null=True, blank=True)
    offline_storage_site = models.ForeignKey(
        Site,
        on_delete=models.PROTECT,
        verbose_name="offline storage site",
        null=True,
        blank=True,
    )

    class Meta:
        abstract = True


class Asset(AbstractAsset):
    hostname = models.CharField(
        max_length=150,
        unique=True,
        validators=[validate_hostname],
        null=True,
        blank=True,
    )
    asset_number = models.IntegerField(
        unique=True,
        validators=[MinValueValidator(100000), MaxValueValidator(999999)],
        blank=True,
    )
    model = models.ForeignKey(
        ITModel, on_delete=models.CASCADE, verbose_name="related model",
    )
    rack = models.ForeignKey(
        Rack,
        on_delete=models.CASCADE,
        verbose_name="related rack",
        null=True,
        blank=True,
    )
    chassis = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        verbose_name="blade chassis",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["asset_number"]
        verbose_name = "asset"

    def save(self, *args, **kwargs):
        try:
            self.full_clean()
            validate_hostname(self.hostname)
            validate_owner(self.owner)
            validate_location_type(
                model=self.model,
                rack=self.rack,
                rack_position=self.rack_position,
                chassis=self.chassis,
                chassis_slot=self.chassis_slot,
                offline_storage_site=self.offline_storage_site,
            )
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
                network_port = NetworkPort(asset=self, port_name=network_port_name,)
                network_port.save()

    def add_power_ports(self):
        from rackcity.models import PowerPort

        if len(PowerPort.objects.filter(asset=self.id)) == 0:
            model = self.model
            if model.num_power_ports:
                for port_index in range(model.num_power_ports):
                    port_name = str(port_index + 1)
                    power_port = PowerPort(asset=self, port_name=port_name,)
                    power_port.save()

    def is_in_offline_storage(self):
        return self.offline_storage_site is not None


class AssetCP(AbstractAsset):
    related_asset = models.ForeignKey(
        Asset, on_delete=models.SET_NULL, null=True, blank=True,
    )
    hostname = models.CharField(
        max_length=150, null=True, blank=True, validators=[validate_hostname],
    )
    related_decommissioned_asset = models.ForeignKey(
        DecommissionedAsset, on_delete=models.SET_NULL, null=True, blank=True,
    )
    is_conflict = models.BooleanField(default=False, blank=True,)
    asset_conflict_hostname = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hostname_conflict",
    )
    asset_conflict_asset_number = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="asset_number_conflict",
    )
    asset_conflict_location = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="location_conflict",
    )
    change_plan = models.ForeignKey(ChangePlan, on_delete=models.CASCADE,)
    is_decommissioned = models.BooleanField(default=False, blank=True)
    asset_number = models.IntegerField(
        validators=[MinValueValidator(100000), MaxValueValidator(999999)],
        blank=True,
        # If blank, Asset numbers will be assigned on execution
        null=True,
    )

    model = models.ForeignKey(
        ITModel, on_delete=models.SET_NULL, null=True, verbose_name="related model",
    )
    rack = models.ForeignKey(
        Rack,
        on_delete=models.SET_NULL,
        verbose_name="related rack",
        null=True,
        blank=True,
    )
    chassis = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        verbose_name="blade chassis",
        null=True,
        blank=True,
    )
    differs_from_live = models.BooleanField(default=False,blank=True)

    class Meta:
        ordering = ["asset_number"]
        verbose_name = "Asset on Change Plan"

    def add_network_ports(self):
        from rackcity.models import NetworkPortCP

        model = self.model
        if (
            len(NetworkPortCP.objects.filter(asset=self.id))
            == 0  # only new assets (new to change planner)
            and model.network_ports  # only if the model has ports
        ):
            for network_port_name in model.network_ports:
                network_port = NetworkPortCP(
                    asset=self,
                    port_name=network_port_name,
                    change_plan=self.change_plan,
                )
                network_port.save()

    def add_power_ports(self):
        from rackcity.models import PowerPortCP

        if len(PowerPortCP.objects.filter(asset=self.id)) == 0:
            model = self.model
            if model.num_power_ports:
                for port_index in range(model.num_power_ports):
                    port_name = str(port_index + 1)
                    power_port = PowerPortCP(
                        asset=self, port_name=port_name, change_plan=self.change_plan
                    )
                    power_port.save()

    def save(self, *args, **kwargs):
        try:
            self.full_clean()
            if not self.is_decommissioned:
                validate_hostname(self.hostname)
                validate_hostname_uniqueness(
                    self.hostname, self.id, self.change_plan, self.related_asset
                )
                validate_asset_number_uniqueness(
                    self.asset_number, self.id, self.change_plan, self.related_asset
                )
                validate_owner(self.owner)
                validate_location_type(
                    model=self.model,
                    rack=self.rack,
                    rack_position=self.rack_position,
                    chassis=self.chassis,
                    chassis_slot=self.chassis_slot,
                    offline_storage_site=self.offline_storage_site,
                )
        except ValidationError as valid_error:
            raise valid_error
        else:
            super(AssetCP, self).save(*args, **kwargs)
            self.add_network_ports()

            self.add_power_ports()

    def is_in_offline_storage(self):
        return self.offline_storage_site is not None
