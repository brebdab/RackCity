from django.db import models


class ITModel(models.Model):
    vendor = models.CharField(max_length=150)
    model_number = models.CharField(max_length=150)
    height = models.PositiveIntegerField()
    display_color = models.CharField(max_length=7, default='#ffffff')
    num_ethernet_ports = models.PositiveIntegerField(null=True, blank=True)
    num_power_ports = models.PositiveIntegerField(null=True, blank=True)
    cpu = models.CharField(max_length=150, null=True, blank=True)
    memory_gb = models.PositiveIntegerField(null=True, blank=True)
    storage = models.CharField(max_length=150, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['vendor', 'model_number'],
                name='unique vendor model number'),
        ]

        verbose_name = 'model'
