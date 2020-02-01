import re
from django.core.exceptions import ValidationError
from django.db import models
from .it_model import ITModel
from .rack import Rack


def validate_hostname(value):
    hostname_pattern = re.compile("[a-z][a-z0-9-]{0,61}[a-z0-9]")
    if hostname_pattern.fullmatch(value) is None:
        raise ValidationError(value + " is not a valid hostname as it is " +
                              "not compliant with RFC 1034")


class ITInstance(models.Model):
    hostname = models.CharField(
        max_length=150,
        unique=True,
        validators=[validate_hostname]
    )
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
    owner = models.CharField(max_length=150, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['hostname']
        verbose_name = 'instance'

    def save(self, *args, **kwargs):
        try:
            validate_hostname(self.hostname)
        except ValidationError as valid_error:
            raise valid_error
        else:
            super(ITInstance, self).save(*args, **kwargs)
