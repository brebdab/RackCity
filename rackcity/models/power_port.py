from django.db import models
from .asset import Asset
from .pdu_port import PDUPort


class PowerPort(models.Model):
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        verbose_name="asset",
    )
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

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['asset', 'port_name'],
                name='unique power port names on assets'),
        ]
