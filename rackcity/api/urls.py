from django.urls import path
from rackcity import views

urlpatterns = [
    path('logs/get-many', views.log_many),
    path('models', views.model_list),
    path('models/add', views.model_add),
    path('models/modify', views.model_modify),
    path('models/delete', views.model_delete),
    path('models/get-many', views.model_many),
    path('models/<int:id>', views.model_detail),
    path('models/vendors', views.model_vendors),
    path('models/bulk-upload', views.model_bulk_upload),
    path('models/bulk-approve', views.model_bulk_approve),
    path('models/bulk-export', views.model_bulk_export),
    path('models/pages', views.model_page_count),
    path('models/fields', views.model_fields),
    path('models/test-auth', views.model_auth),
    path('models/test-admin', views.model_admin),
    path('assets', views.asset_list),
    path('assets/get-many', views.asset_many),
    path('assets/<int:id>', views.asset_detail),
    path('assets/add', views.asset_add),
    path('assets/modify', views.asset_modify),
    path('assets/delete', views.asset_delete),
    path('assets/bulk-upload', views.asset_bulk_upload),
    path('assets/bulk-approve', views.asset_bulk_approve),
    path('assets/bulk-export', views.asset_bulk_export),
    path('assets/network-bulk-export', views.network_bulk_export),
    path('assets/pages', views.asset_page_count),
    path('assets/fields', views.asset_fields),
    path('racks/get', views.rack_get),
    path('racks/get-all', views.rack_get_all),
    path('racks/create', views.rack_create),
    path('racks/delete', views.rack_delete),
    path('racks/summary', views.rack_summary),
    path('iamadmin', views.i_am_admin),
    path('report', views.report_rack_usage),
    path('usernames', views.usernames),
    path('datacenters/get-many', views.datacenter_all),
    path('datacenters/add', views.datacenter_create),
    path('datacenters/delete', views.datacenter_delete),
    path('datacenters/pages', views.datacenter_page_count),
    path('datacenters/modify', views.datacenter_modify),
    path('users/who-am-i', views.who_am_i),
    path('users/get-many', views.user_list),
    path('users/add', views.RegisterNameView.as_view()),
    path('users/delete', views.user_delete),
    path('users/netid-login', views.netid_login),
    path('users/pages', views.user_page_count),
    path('users/grant-admin', views.user_grant_admin),
    path('users/revoke-admin', views.user_revoke_admin),
    path('power/get-state/<int:id>', views.power_status)
]
