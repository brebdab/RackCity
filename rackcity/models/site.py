from django.db import models


class Site(models.Model):
    abbreviation = models.CharField(max_length=6, unique=True)
    name = models.CharField(max_length=150, unique=True)
    is_storage = models.BooleanField(default=False)

    @staticmethod
    def get_datacenters():
        return Site.objects.filter(is_storage=False)

    @staticmethod
    def get_offline_storage_sites():
        return Site.objects.filter(is_storage=True)
