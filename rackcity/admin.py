from django.contrib import admin

from .models import ITInstance, ITModel, Rack

admin.site.register(ITInstance)
admin.site.register(ITModel)
admin.site.register(Rack)
