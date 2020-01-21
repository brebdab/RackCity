from django.db import models

class ITModel(models.Model): 
    model_id = models.CharField(max_length=120)
    vendor = models.CharField(max_length=120)
    model_number = models.CharField(max_length=120)
    height = models.IntegerField()
    display_color = models.CharField(max_length=120)
    num_ethernet_ports = models.IntegerField()
    num_power_ports = models.IntegerField()
    cpu = models.CharField(max_length=120)
    memory_gb = models.IntegerField()
    storage = models.CharField(max_length=120)
    comment = models.TextField()

    class Meta: 
        ordering = [model_id]

        def __str__(self):
            return self.model_id