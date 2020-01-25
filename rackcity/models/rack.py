from django.db import models


class Rack(models.Model):
    rack_id = models.CharField(max_length=120)
    row_letter = models.CharField(max_length=1)
    rack_num = models.CharField(max_length=120)
    height = models.IntegerField(default=42)
