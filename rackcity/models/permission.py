from django.contrib.auth.models import User
from django.db import models
from rackcity.models import Site


class RackCityPermission(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    site_permissions = models.ManyToManyField(Site)
