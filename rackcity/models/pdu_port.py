from django.db import models
from .asset import Rack
from django.core.validators import MaxValueValidator, MinValueValidator


class PDUPort(models.Model):
    rack = models.ForeignKey(
        Rack,
        on_delete=models.CASCADE,
        verbose_name="rack",
    )
    LEFT_RIGHT_CHOICES = [
        ('L', 'L'),
        ('R', 'R'),
    ]
    left_right = models.CharField(
        max_length=1,
        choices=LEFT_RIGHT_CHOICES,
    )
    port_number = models.IntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(24)
        ],
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['rack', 'left_right', 'port_number'],
                name='unique port per pdu'),
        ]
