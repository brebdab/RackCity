from django.contrib import admin
from .models import Asset, ITModel, Rack, PowerPort, NetworkPort, Log

admin.site.register(Asset)
admin.site.register(Log)
admin.site.register(ITModel)
admin.site.register(Rack)
admin.site.register(PowerPort)
admin.site.register(NetworkPort)
