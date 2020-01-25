from django.db import models


class ITModel(models.Model):
    vendor = models.CharField(max_length=120)
    model_number = models.CharField(max_length=120)
    height = models.IntegerField()
    display_color = models.CharField(max_length=120, null=True, blank=True)
    num_ethernet_ports = models.IntegerField(null=True, blank=True)
    num_power_ports = models.IntegerField(null=True, blank=True)
    cpu = models.CharField(max_length=120, null=True, blank=True)
    memory_gb = models.IntegerField(null=True, blank=True)
    storage = models.CharField(max_length=120, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['vendor', 'model_number'],
                name='unique vendor model number'),
        ]
