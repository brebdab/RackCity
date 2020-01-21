from django.db import models
from .it_model import ITModel
from .user import User

class ITInstance(models.Model): 
    instance_id = models.CharField(max_length=120)
    model = models.ForeignKey(
        ITModel, 
        on_delete=models.CASCADE,
        verbose_name="related model",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE, 
        verbose_name="related user",
        null=True, 
        blank=True,
    )
    comment = models.TextField(null=True, blank=True)
    unique_id = models.CharField(max_length=120)

    def save(self, *args, **kwargs): 
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs): 
        super().delete(*args, **kwargs)

    class Meta: 
        def __str__(self):
            return self.instance_id