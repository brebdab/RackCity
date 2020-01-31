from django.urls import path
from rackcity import views

urlpatterns = [
    path('models', views.model_list),
    path('models/add', views.model_add),
    path('models/modify', views.model_modify),
    path('models/delete', views.model_delete),
    path('models/get-many', views.model_page),
    path('models/<int:id>', views.model_detail),
    path('models/vendors', views.model_vendors),
    path('models/bulk-upload', views.model_bulk_upload),
    path('models/bulk-approve', views.model_bulk_approve),
    path('models/pages', views.model_page_count),
    path('models/test-auth', views.model_auth),
    path('models/test-admin', views.model_admin),
    path('instances', views.instance_list),
    path('instances/get-many', views.instance_page),
    path('instances/<int:id>', views.instance_detail),
    path('instances/add', views.instance_add),
    path('instances/modify', views.instance_modify),
    path('instances/delete', views.instance_delete),
    path('instances/bulk-upload', views.instance_bulk_upload),
    path('instances/pages', views.instance_page_count),
    path('racks/get', views.rack_get),
    path('racks/create', views.rack_create),
    path('racks/delete', views.rack_delete),
    path('racks/summary', views.rack_summary),
    path('iamadmin', views.i_am_admin)
]
