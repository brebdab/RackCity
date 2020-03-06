
from django.db import models
from django.contrib.auth.models import User


class ChangePlan(models.Model):
    name = models.CharField(max_length=150)
    execution_time = models.DateTimeField(blank=True, null=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'owner'],
                name='unique change planner name'
            )
        ]
        verbose_name = 'change planner'
