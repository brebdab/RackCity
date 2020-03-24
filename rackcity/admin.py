from django.contrib import admin
from .models import (
    AbstractAsset,
    Asset,
    AssetCP,
    ITModel,
    Rack,
    PowerPort,
    PDUPort,
    NetworkPort,
    Log,
    Datacenter,
    ChangePlan,
    RackCityPermission,
)

admin.site.register(AbstractAsset)
admin.site.register(Asset)
admin.site.register(AssetCP)
admin.site.register(ITModel)
admin.site.register(Rack)
admin.site.register(PowerPort)
admin.site.register(PDUPort)
admin.site.register(NetworkPort)
admin.site.register(Log)
admin.site.register(Datacenter)
admin.site.register(ChangePlan)
admin.site.register(RackCityPermission)
