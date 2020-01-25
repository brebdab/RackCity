from django.db import models


class Rack(models.Model):
    row_letter = models.CharField(max_length=1)
    rack_num = models.IntegerField()
    height = models.IntegerField(default=42)
