from django.db import models
from .asset import Rack
from django.core.validators import MaxValueValidator, MinValueValidator
from .change_plan import ChangePlan


class AbstractPDUPort(models.Model):
    rack = models.ForeignKey(Rack, on_delete=models.CASCADE, verbose_name="rack")
    LEFT_RIGHT_CHOICES = [
        ("L", "L"),
        ("R", "R"),
    ]
    left_right = models.CharField(max_length=1, choices=LEFT_RIGHT_CHOICES)
    port_number = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(24)],
    )

    class Meta:
        abstract = True


class PDUPort(AbstractPDUPort):
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["rack", "left_right", "port_number"], name="unique port per pdu"
            ),
        ]


class PDUPortCP(AbstractPDUPort):

    change_plan = models.ForeignKey(ChangePlan, on_delete=models.CASCADE,)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["rack", "left_right", "port_number", "change_plan"],
                name="unique port per pdu for each change plan",
            ),
        ]
