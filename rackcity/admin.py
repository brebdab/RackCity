from django.contrib import admin
from .models import (
    Asset,
    AssetCP,
    ITModel,
    Rack,
    PowerPort,
    PDUPort,
    NetworkPort,
    Log
)

admin.site.register(Asset)
admin.site.register(AssetCP)
admin.site.register(Log)
admin.site.register(ITModel)
admin.site.register(Rack)
admin.site.register(PowerPort)
admin.site.register(PDUPort)
admin.site.register(NetworkPort)
