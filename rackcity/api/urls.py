from django.urls import path
from rackcity import views

urlpatterns = [
    path("logs/get-many", views.log_many),
    path("logs/pages", views.log_page_count),
    path("models/add", views.model_add),
    path("models/modify", views.model_modify),
    path("models/delete", views.model_delete),
    path("models/get-many", views.model_many),
    path("models/<int:id>", views.model_detail),
    path("models/vendors", views.model_vendors),
    path("models/bulk-upload", views.model_bulk_upload),
    path("models/bulk-approve", views.model_bulk_approve),
    path("models/bulk-export", views.model_bulk_export),
    path("models/pages", views.model_page_count),
    path("models/fields", views.model_fields),
    path("assets/get-many", views.asset_many),
    path("assets/get-many-decommissioned", views.decommissioned_asset_many),
    path("assets/get-many-offline-storage", views.offline_storage_asset_many),
    path("assets/<int:id>", views.asset_detail),
    path("assets/add", views.asset_add),
    path("assets/modify", views.asset_modify),
    path("assets/delete", views.asset_delete),
    path("assets/bulk-upload", views.asset_bulk_upload),
    path("assets/bulk-approve", views.asset_bulk_approve),
    path("assets/bulk-export", views.asset_bulk_export),
    path("assets/network-bulk-upload", views.network_bulk_upload),
    path("assets/network-bulk-approve", views.network_bulk_approve),
    path("assets/network-bulk-export", views.network_bulk_export),
    path("assets/pages", views.asset_page_count),
    path("assets/pages-decommissioned", views.decommissioned_asset_page_count),
    path("assets/pages-offline-storage", views.offline_storage_asset_many),
    path("assets/fields", views.asset_fields),
    path("assets/asset-number", views.asset_number),
    path("assets/decommission", views.decommission_asset),
    path("racks/get", views.rack_get),
    path("racks/get-all", views.rack_get_all),
    path("racks/create", views.rack_create),
    path("racks/delete", views.rack_delete),
    path("racks/summary", views.rack_summary),
    path("iamadmin", views.i_am_admin),
    path("report/global", views.report_rack_usage),
    path("report/datacenter/<int:id>", views.rack_report_datacenter),
    path("usernames", views.usernames),
    path("sites/add", views.site_create),
    path("sites/delete", views.site_delete),
    path("sites/modify", views.site_modify),
    path("sites/datacenters/get-many", views.datacenter_all),
    path("sites/datacenters/pages", views.datacenter_page_count),
    path("sites/offline-storage/get-many", views.offline_storage_site_all),
    path("sites/offline-storage/pages", views.offline_storage_site_page_count),
    path("users/who-am-i", views.who_am_i),
    path("users/get-many", views.user_many),
    path("users/add", views.RegisterNameView.as_view()),
    path("users/delete", views.user_delete),
    path("users/netid-login", views.netid_login),
    path("users/pages", views.user_page_count),
    path("users/grant-admin", views.user_grant_admin),
    path("users/revoke-admin", views.user_revoke_admin),
    path("users/permissions/get", views.user_get_groups),
    path("users/permissions/set", views.user_set_groups),
    path("users/groups", views.all_user_groups),
    path("users/permissions/mine", views.user_get_my_groups),
    path("rack-power/status/<int:id>", views.pdu_power_status),
    path("rack-power/on", views.pdu_power_on),
    path("rack-power/off", views.pdu_power_off),
    path("rack-power/cycle", views.pdu_power_cycle),
    path("rack-power/availability", views.pdu_port_availability),
    path("chassis-power/status", views.chassis_power_status),
    path("chassis-power/on", views.chassis_power_on),
    path("chassis-power/off", views.chassis_power_off),
    path("chassis-power/cycle", views.chassis_power_cycle),
    path("change-plans/get-many", views.change_plan_many),
    path("change-plans/add", views.change_plan_add),
    path("change-plans/modify", views.change_plan_modify),
    path("change-plans/delete", views.change_plan_delete),
    path("change-plans/pages", views.change_plan_page_count),
    path("change-plans/<int:id>", views.change_plan_detail),
    path("change-plans/<int:id>/execute", views.change_plan_execute),
    path("change-plans/<int:id>/resolve-conflict", views.change_plan_resolve_conflict),
    path("change-plans/<int:id>/remove-asset", views.change_plan_remove_asset),
]
