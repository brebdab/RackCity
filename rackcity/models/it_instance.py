from django.core.exceptions import ValidationError
from django.db import models
from .it_model import ITModel
from .rack import Rack


class ITInstance(models.Model):
    hostname = models.CharField(
        max_length=150, unique=True, validators=[validate_hostname])
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
        ordering = ['hostname']
        verbose_name = 'instance'


def validate_hostname(value):
    if value % 2 != 0:
        raise ValidationError(
            _('%(value)s is not an even number'),
            params={'value': value},
        )
