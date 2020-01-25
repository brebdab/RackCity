from django.db import models
from .it_model import ITModel
from .rack import Rack
from .user import User


class ITInstance(models.Model):
    hostname = models.CharField(max_length=120)
    height = models.IntegerField()
    model = models.ForeignKey(
        ITModel,
        on_delete=models.CASCADE,
        verbose_name="related model",
    )
    rack = models.ForeignKey(
        Rack,
        on_delete=models.CASCADE,
        verbose_name="related rack",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name="related user",
        null=True,
        blank=True,
    )
    comment = models.TextField(null=True, blank=True)
