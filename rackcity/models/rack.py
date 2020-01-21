from django.db import models

class Rack(models.Model): 
    rack_id = models.CharField(max_length=120)
    row_letter = models.CharField(max_length=1)
    rack_num = models.CharField(max_length=120)

    def save(self, *args, **kwargs): 
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs): 
        super().delete(*args, **kwargs)

    class Meta: 
        def __str__(self):
            return self.rack_id