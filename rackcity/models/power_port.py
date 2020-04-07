from django.db import models
from .asset import Asset, AssetCP
from .pdu_port import PDUPort, PDUPortCP
from .change_plan import ChangePlan


class AbstractPowerPort(models.Model):
    port_name = models.CharField(
        max_length=150
        # electing not to validate this as it is not user entered
    )

    class Meta:
        abstract = True


class PowerPort(AbstractPowerPort):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, verbose_name="asset")
    power_connection = models.OneToOneField(
        PDUPort, on_delete=models.CASCADE, null=True, blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["asset", "port_name"], name="unique power port names on assets"
            ),
        ]


class PowerPortCP(AbstractPowerPort):
    asset = models.ForeignKey(AssetCP, on_delete=models.CASCADE, verbose_name="asset")
    change_plan = models.ForeignKey(ChangePlan, on_delete=models.CASCADE,)
    power_connection = models.OneToOneField(
        PDUPortCP, on_delete=models.CASCADE, null=True, blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["asset", "port_name", "change_plan"],
                name="unique power port names on change plan assets",
            ),
        ]
