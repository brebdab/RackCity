from django.core.exceptions import ValidationError
from django.db import IntegrityError
from enum import Enum


class Status(Enum):
    SUCCESS = "SUCCESS: "
    ERROR = "ERROR: "
    CREATE_ERROR = "CREATE ERROR: "
    DELETE_ERROR = "DELETE ERROR: "
    MODIFY_ERROR = "MODIFY ERROR: "
    INVALID_INPUT = "INVALID INPUT: "
    IMPORT_ERROR = "IMPORT ERROR: "
    EXPORT_ERROR = "EXPORT ERROR: "
    CONNECTION = "CONNECTION ERROR: "


class GenericFailure(Enum):
    INTERNAL = "Internal error."
    DOES_NOT_EXIST = " does not exist."
    FILTER = "Invalid filter applied."
    SORT = "Invalid sort applied."
    INVALID_DATA = "Required values are missing or invalid."
    ON_SAVE = " failed to save. Please ensure all input values are valid."
    ON_DELETE = " failed to delete due to internal error."
    PAGE_ERROR = "Failed to load this page of data. Please try again."


class UserFailure(Enum):
    DELETE = "Cannot delete user"
    NETID_LOGIN = \
        "The Duke NetID login credentials you have provided are invalid."


class BulkFailure(Enum):
    IMPORT = \
        "File import failed. " + \
        "See in-app documentation for format specifications."
    IMPORT_COLUMNS = \
        "Please provide exactly the expected columns. " + \
        "See in-app documentation for reference."
    MODEL_INVALID = "At least one provided model was not valid: "
    ASSET_INVALID = "At least one provided asset was not valid: "


class PowerFailure(Enum):
    CONNECTION = "Unable to contact PDU controller. Please try again later."


def get_rack_failure_message(range_serializer, action):
    failure_message = \
        "Racks " + \
        range_serializer.get_range_as_string() + \
        " cannot be " + action + " in datacenter " + \
        range_serializer.get_datacenter().abbreviation
    return failure_message


def get_rack_exist_failure(racks):
    if len(racks) < 5:
        failure_message = \
            " because the following racks already exist: " + \
            get_rack_list(racks)
    else:
        failure_message = \
            " because at least the following racks already exist: " + \
            get_rack_list(racks[0:5]) + ", ..."
    return failure_message


def get_rack_do_not_exist_failure(rack_names):
    if len(rack_names) < 5:
        failure_message = \
            " because the following racks do not exist: " + \
            ", ".join(rack_names)
    else:
        failure_message = \
            " because at least the following racks do not exist: " + \
            ", ".join(rack_names[0:5]) + ", ..."
    return failure_message


def get_rack_with_asset_failure(racks):
    if len(racks) < 5:
        failure_message = \
            " because the following racks contain assets: "
        failure_message += get_rack_list(racks)
    else:
        failure_message = \
            " because at least the following racks contain assets: "
        failure_message += get_rack_list(racks[0:5]) + ", ..."
    return failure_message


def get_rack_list(racks):
    return ", ".join(
        [str(rack.row_letter) + str(rack.rack_num) for rack in racks]
    )


def get_user_permission_success(
    groups_added,
    groups_removed,
    current_groups,
    current_datacenters,
):
    success_message = ""
    if len(groups_added) > 0:
        success_message += \
            ("User added to group(s): " + ", ".join(groups_added) + ". ")
    if len(groups_removed) > 0:
        success_message += \
            ("User removed from group(s): " + ", ".join(groups_removed) + ". ")
    if len(groups_added) == 0 and len(groups_removed) == 0:
        success_message += \
            "User's groups were not changed. "
    if len(current_groups) > 0:
        success_message += \
            "User is now in group(s): " + ", ".join(current_groups) + ". "
    else:
        success_message += \
            "User is now in no groups. "
    if len(current_datacenters) > 0:
        success_message += \
            "User now has write access to assets in datacenter(s): " + \
            ", ".join(current_datacenters) + "."
    return success_message


def parse_serializer_errors(errors):
    failure_messages = []
    error_num = 0
    for field in errors:
        error_num += 1
        field_errors = [str(error) for error in errors[field]]
        failure_messages.append(
            "(" + str(error_num) + ") " + field + ": " + " ".join(field_errors)
        )
    return " ".join(failure_messages)


def parse_save_validation_error(error, object_name):
    failure_detail = ""
    if isinstance(error, ValidationError):
        for err in error:
            failure_detail += err
    elif isinstance(error, IntegrityError):
        for err in error.args:
            failure_detail += err
    else:
        failure_detail = object_name + GenericFailure.ON_SAVE.value
    return failure_detail
