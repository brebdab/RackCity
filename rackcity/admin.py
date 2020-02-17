from django.contrib import admin

from .models import Asset, ITModel, Rack, PowerPort, NetworkPort

admin.site.register(Asset)
admin.site.register(ITModel)
admin.site.register(Rack)
admin.site.register(PowerPort)
admin.site.register(NetworkPort)
