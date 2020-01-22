from django.db import models


class User(models.Model):
    user_id = models.CharField(max_length=120)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
