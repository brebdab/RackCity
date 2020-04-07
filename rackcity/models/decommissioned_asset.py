from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.contrib.postgres.fields import JSONField


class DecommissionedAsset(models.Model):
    live_id = models.IntegerField()
    decommissioning_user = models.CharField(max_length=150)  # not unique
    time_decommissioned = models.DateTimeField(auto_now_add=True, blank=True)
    asset_number = models.IntegerField(  # not unique or blank
        validators=[MinValueValidator(100000), MaxValueValidator(999999)]
    )
    hostname = models.CharField(max_length=150, null=True, blank=True)  # not unique
    rack_position = models.PositiveIntegerField()
    model = JSONField()
    rack = JSONField()
    owner = models.CharField(  # don't validate owner
        max_length=150, null=True, blank=True,
    )
    comment = models.TextField(null=True, blank=True)
    power_connections = JSONField()
    network_connections = JSONField()
    network_graph = JSONField()

    class Meta:
        ordering = ["asset_number"]
        verbose_name = "decommissioned asset"
