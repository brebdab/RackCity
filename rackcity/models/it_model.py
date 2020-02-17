from django.core.exceptions import ValidationError
from django.db import models
from rackcity.models.fields import RCPositiveIntegerField
import re
from django.contrib.postgres.fields import ArrayField


def validate_display_color(value):
    color_pattern = re.compile("#[A-Fa-f0-9]{6}")
    if color_pattern.fullmatch(value) is None:
        raise ValidationError(value + " is not a valid hex color")


class ITModel(models.Model):
    vendor = models.CharField(max_length=150)
    model_number = models.CharField(max_length=150)
    height = models.PositiveIntegerField()
    display_color = models.CharField(
        max_length=7,
        default='#394B59',
        validators=[validate_display_color],
    )

    network_ports = ArrayField(
        models.CharField(max_length=150),
        null=True,
        blank=True,
    )
    num_network_ports = RCPositiveIntegerField(null=False, blank=True)
    num_power_ports = RCPositiveIntegerField(null=True, blank=True)
    cpu = models.CharField(max_length=150, null=True, blank=True)
    memory_gb = RCPositiveIntegerField(null=True, blank=True)
    storage = models.CharField(max_length=150, null=True, blank=True)
    comment = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['vendor', 'model_number']
        constraints = [
            models.UniqueConstraint(
                fields=['vendor', 'model_number'],
                name='unique vendor model number'),
        ]
        verbose_name = 'model'

    def save(self, *args, **kwargs):
        try:
            validate_display_color(self.display_color)
        except ValidationError as valid_error:
            raise valid_error
        else:
            self.num_network_ports = len(self.network_ports)
            super(ITModel, self).save(*args, **kwargs)
