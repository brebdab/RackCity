from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from enum import Enum
from http import HTTPStatus


class Status(Enum):
    SUCCESS = "SUCCESS: "
    ERROR = "ERROR: "
    CREATE_ERROR = "CREATE ERROR: "
    DECOMMISSION_ERROR = "DECOMMISSION ERROR: "
    DELETE_ERROR = "DELETE ERROR: "
    MODIFY_ERROR = "MODIFY ERROR: "
    INVALID_INPUT = "INVALID INPUT: "
    IMPORT_ERROR = "IMPORT ERROR: "
    EXPORT_ERROR = "EXPORT ERROR: "
    CONNECTION = "CONNECTION ERROR: "
    AUTH_ERROR = "AUTHORIZATION ERROR: "


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


class AuthFailure(Enum):
    POWER = "You do not have power permission on this asset."
    ASSET = "You do not have asset permission in this datacenter."
    DATACENTER = "You do not have global asset permission required to " + \
        "create, modify, or delete datacenters."
    RACK = "You do not have the asset permission required to create or " + \
        "delete racks in this datacenter."


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


def get_invalid_paginated_request_response(query_params):
    errors = []
    if not query_params.get('page'):
        errors.append("Must specify field 'page' on " +
                      "paginated requests.")
    elif not query_params.get('page_size'):
        errors.append("Must specify field 'page_size' on " +
                      "paginated requests.")
    else:
        try:
            page_size = int(query_params.get('page_size'))
        except ValueError:
            errors.append("Must specify integer 'page_size' on " +
                          "paginated requests.")
        if (page_size <= 0):
            errors.append("Field 'page_size' must be an integer " +
                          "greater than 0.")
    if len(errors) > 0:
        return JsonResponse(
            {
                "failure_message":
                    Status.ERROR.value + GenericFailure.PAGE_ERROR.value,
                "errors": " ".join(errors)
            },
            status=HTTPStatus.BAD_REQUEST,
        )
    return None
