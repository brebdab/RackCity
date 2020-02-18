from django.db import models
from .asset import Asset
from django.core.exceptions import ObjectDoesNotExist


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
        print("creating connection from "+str(self.id) +
              " to  "+str(destination_port.id))
        if (
            destination_port.network_connection
            and destination_port.network_connection != self
        ):
            from rackcity.views.rackcity_utils import (
                NetworkConnectionException
            )
            raise NetworkConnectionException(
                "Destination port '" +
                destination_port.asset.hostname +
                ":" +
                destination_port.port_name +
                "' is already connected to port '" +
                destination_port.network_connection.asset.hostname +
                ":" +
                destination_port.network_connection.port_name +
                "'. "
            )
        if self.network_connection:
            self.network_connection.network_connection = None
            self.network_connection.save()
        self.network_connection = destination_port
        destination_port.network_connection = self
        self.save()
        destination_port.save()

    def delete_network_connection(self):
        try:
            destination_port = self.network_connection
        except ObjectDoesNotExist:
            return
        else:
            self.network_connection = None
            destination_port.network_connection = None
            self.save()
            destination_port.save()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['asset', 'port_name'],
                name='unique network port names on assets'),
        ]
