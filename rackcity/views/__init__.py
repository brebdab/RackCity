from .log_views import (
    log_many,
    log_page_count,
)
from .it_model_views import (
    model_add,
    model_modify,
    model_delete,
    model_many,
    model_detail,
    model_vendors,
    model_bulk_upload,
    model_bulk_approve,
    model_bulk_export,
    model_page_count,
    model_fields,
)
from .asset_views import (
    asset_detail,
    asset_add,
    asset_modify,
    asset_delete,
    asset_many,
    asset_bulk_upload,
    asset_bulk_approve,
    asset_bulk_export,
    network_bulk_upload,
    network_bulk_approve,
    network_bulk_export,
    asset_page_count,
    asset_fields,
    asset_number,
)
from .rack_views import (
    rack_get,
    rack_get_all,
    rack_create,
    rack_delete,
    rack_summary,
)
from .report_views import (
    report_rack_usage,
    rack_report_datacenter
)
from .user_views import (
    netid_login,
    RegisterNameView,
    user_delete,
    user_many,
    user_page_count,
    usernames,
    who_am_i,
    i_am_admin,
    user_grant_admin,
    user_revoke_admin,
    user_set_groups,
    user_get_groups,
    all_user_groups,
)
from .datacenter_views import (
    datacenter_all,
    datacenter_create,
    datacenter_delete,
    datacenter_page_count,
    datacenter_modify
)
from .pdu_views import (
    power_status,
    power_on,
    power_off,
    power_cycle,
    power_availability
)
