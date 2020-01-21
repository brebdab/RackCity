from django.db import models
from .it_model import ITModel

class ITInstance(models.Model): 
    instance_id = models.CharField(max_length=120)
    model_id = models.CharField(max_length=120) # id to specify model
    model = models.ForeignKey(
        ITModel, 
        on_delete=models.CASCADE,
        verbose_name="related model",
    ) # links to the actual ITModel model
    owner_used_id = models.CharField(max_length=120)
    comment = models.TextField()
    unique_id = models.CharField(max_length=120)

    def save(self, *args, **kwargs): 
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs): 
        super().delete(*args, **kwargs)

    class Meta: 
        ordering = [unique_id]

        def __str__(self):
            return self.instance_id