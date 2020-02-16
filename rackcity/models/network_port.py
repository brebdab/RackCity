from django.db import models
from .asset import Asset


class NetworkPort(models.Model):
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        verbose_name="asset",
    )
    port_name = models.CharField(
        max_length=150
        # electing not to validate this as it is not user entered
    )
    mac_address = models.CharField(
        max_length=17,
        unique=True,
        null=True,
        blank=True,
        # force this to lowercase and make delimeters :
    )
    network_connection = models.OneToOneField(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['asset', 'port_name'],
                name='unique port names on assets'),
        ]
