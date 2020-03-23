from django.db import models
from .asset import Asset, AssetCP
from .pdu_port import PDUPort


class AbstractPowerPort(models.Model):
    port_name = models.CharField(
        max_length=150
        # electing not to validate this as it is not user entered
    )
    power_connection = models.OneToOneField(
        PDUPort,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )


class PowerPort(AbstractPowerPort):
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        verbose_name="asset",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['asset', 'port_name'],
                name='unique power port names on assets'),
        ]


class PowerPortCP(AbstractPowerPort):
    asset = models.ForeignKey(
        AssetCP,
        on_delete=models.CASCADE,
        verbose_name="asset",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['asset', 'port_name'],
                name='unique power port names on assets'),
        ]
