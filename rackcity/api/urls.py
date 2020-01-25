from django.urls import path
from rackcity import views

urlpatterns = [
    path('models', views.model_list),
    path('models/<int:pk>', views.model_detail),
    path('models/test-auth', views.model_auth),
    path('models/test-admin', views.model_admin),
    path('instances', views.instance_list),
    path('instances/<int:pk>', views.instance_detail),
    path('racks', views.rack_list),
    path('racks/<int:pk>', views.rack_detail),
]
