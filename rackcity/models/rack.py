from django.core.exceptions import ValidationError
from django.db import models
import re


def validate_row_letter(value):
    letter_pattern = re.compile("[A-Z]")
    if letter_pattern.fullmatch(value) is None:
        raise ValidationError(value + " is not a valid row letter")


class Rack(models.Model):
    row_letter = models.CharField(
        max_length=1,
        validators=[validate_row_letter],
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

    def save(self, *args, **kwargs):
        try:
            validate_row_letter(self.row_letter)
        except ValidationError as valid_error:
            raise valid_error
        else:
            super(Rack, self).save(*args, **kwargs)
