from django.db import models
from .it_model import ITModel
from .rack import Rack


class ITInstance(models.Model):
    hostname = models.CharField(max_length=150, unique=True)
    elevation = models.PositiveIntegerField()
    model = models.ForeignKey(
        ITModel,
        on_delete=models.CASCADE,
        verbose_name="related model",
    )
    rack = models.ForeignKey(
        Rack,
        on_delete=models.CASCADE,
        verbose_name="related rack",
    )
    owner = models.CharField(max_length=150)
    comment = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = 'instance'
