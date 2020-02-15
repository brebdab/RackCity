from .it_model import ITModel
from django.contrib.auth.models import User
from django.db import models
from .asset import Asset


class Log(models.Model):
    date = models.DateTimeField(
        auto_now=True,
        blank=True,
        editable=False,
    )
    log_content = models.TextField()
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        verbose_name="related user",
    )
    related_assets = models.ManyToManyField(
        Asset,
        verbose_name="related assets",
        null=True,
        blank=True,
    )
    related_model = models.ForeignKey(
        ITModel,
        on_delete=models.CASCADE,
        verbose_name="related model",
        null=True,
        blank=True,
    )
