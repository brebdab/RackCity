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

    def create_network_connection(self, destination_port):
        self.network_connection = destination_port
        destination_port.network_connection = self
        self.save()
        destination_port.save()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['asset', 'port_name'],
                name='unique network port names on assets'),
        ]
