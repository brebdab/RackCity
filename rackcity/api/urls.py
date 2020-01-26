from django.urls import path
from rackcity import views

urlpatterns = [
    path('models', views.model_list),
    path('models/add', views.model_add),
    path('models/<int:id>', views.model_detail),
    path('models/vendors', views.model_vendors),
    path('models/test-auth', views.model_auth),
    path('models/test-admin', views.model_admin),
    path('instances', views.instance_list),
    path('instances/get-many', views.instance_page),
    path('instances/<int:id>', views.instance_detail),
    path('instances/add', views.instance_add),
    path('instances/pages', views.instance_page_count),
    path('racks', views.rack_list),
    path('racks/<int:pk>', views.rack_detail),
    path('racks/get', views.rack_get),
    path('racks/create', views.rack_create),
    path('racks/delete', views.rack_delete),
    path('iamadmin', views.i_am_admin)
]
