from django.db import models


class Rack(models.Model):
    row_letter = models.CharField(max_length=1)
    rack_num = models.IntegerField()
    height = models.PositiveIntegerField(default=42)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['row_letter', 'rack_num'],
                name='unique rack letter and number'),
        ]
