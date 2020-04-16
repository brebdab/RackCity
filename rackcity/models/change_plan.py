from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class ChangePlan(models.Model):
    name = models.CharField(max_length=150)
    execution_time = models.DateTimeField(blank=True, null=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "owner"], name="unique change planner name"
            )
        ]
        verbose_name = "change planner"

    def save(self, *args, **kwargs):
        try:
            self.full_clean()
        except ValidationError as validation_eror:
            raise validation_eror
        else:
            super(ChangePlan, self).save(*args, **kwargs)
