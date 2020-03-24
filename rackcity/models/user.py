from django.contrib.auth.models import User
from django.db import models
from rackcity.models import Datacenter


class RackCityUser(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    datacenter_permissions = models.ManyToManyField(Datacenter)
