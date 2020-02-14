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
    i_am_admin,
    model_list,
    model_auth,
    model_admin,
)
from .it_instance_views import (
    instance_detail,
    instance_list,
    instance_add,
    instance_modify,
    instance_delete,
    instance_many,
    instance_bulk_upload,
    instance_bulk_approve,
    instance_bulk_export,
    instance_page_count,
    instance_fields,
)
from .rack_views import (
    rack_get,
    rack_create,
    rack_delete,
    rack_summary,
)
from .report_views import report_rack_usage
<<<<<<< HEAD
from .user_views import usernames, who_am_i
=======
from .user_views import usernames, RegisterNameView, netid_login
>>>>>>> a2acfaf7fd0db324d4c6c8a84b56839b00a53d37
