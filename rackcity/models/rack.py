from django.db import models

class Rack(models.Model): 
    rack_id = models.CharField(max_length=120)
    row_letter = models.CharField(max_length=120)
    rack_num = models.CharField(max_length=120)

    class Meta: 
        ordering = [rack_id]

        def __str__(self):
            return self.rack_id