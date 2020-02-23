from enum import Enum


class Status(Enum):
    SUCCESS = "SUCCESS: "
    ERROR = "ERROR: "
    DELETE_ERROR = "DELETE ERROR: "
    MODIFY_ERROR = "MODIFY ERROR: "


class GenericFailure(Enum):
    UNKNOWN = "Unknown internal error"
    DOES_NOT_EXIST = " does not exist"
    FILTER = "Invalid filter applied"
    SORT = "Invalid sort applied"


class UserFailure(Enum):
    REVOKE_ADMIN = "ERROR: REVOKE ADMIN PERMISSION\n"
    GRANT_ADMIN = "ERROR: GRANT ADMIN PERMISSION\n"
    DELETE = "Cannot delete user"
    NETID_LOGIN = "The Duke NetID login credentials you have provided are invalid."
