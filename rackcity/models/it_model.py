from django.db import models


class ITModel(models.Model):
    model_id = models.CharField(max_length=120)
    vendor = models.CharField(max_length=120)
    model_number = models.CharField(max_length=120)
    height = models.IntegerField()
    comment = models.TextField()
    display_color = models.CharField(max_length=120, null=True, blank=True)
    num_ethernet_ports = models.IntegerField(null=True, blank=True)
    num_power_ports = models.IntegerField(null=True, blank=True)
    cpu = models.CharField(max_length=120, null=True, blank=True)
    memory_gb = models.IntegerField(null=True, blank=True)
    storage = models.CharField(max_length=120, null=True, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
