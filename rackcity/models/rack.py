from django.core.exceptions import ValidationError
from django.db import models
import re


def validate_rack_letter(value):
    letter_pattern = re.compile("[A-Za-z]")
    if letter_pattern.fullmatch(value) is None:
        raise ValidationError(value + " is not a valid row letter")


class Rack(models.Model):
    row_letter = models.CharField(
        max_length=1,
        validators=[validate_rack_letter],
    )
    rack_num = models.PositiveIntegerField()
    height = models.PositiveIntegerField(default=42)

    class Meta:
        ordering = ['row_letter', 'rack_num']
        constraints = [
            models.UniqueConstraint(
                fields=['row_letter', 'rack_num'],
                name='unique rack letter and number'),
        ]
