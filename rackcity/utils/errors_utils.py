from enum import Enum


SUCCESS = "SUCCESS: "


class GenericFailure(Enum):
    UNKNOWN = "Unknown internal error"
    DOES_NOT_EXIST = " does not exist"
    FILTER = "Invalid filter applied"
    SORT = "Invalid sort applied"


class UserFailure(Enum):
    GET = "ERROR: VIEW USERS"
    REVOKE_ADMIN = "ERROR: REVOKE ADMIN PERMISSION\n"
    GRANT_ADMIN = "ERROR: GRANT ADMIN PERMISSION\n"
    DELETE = "ERROR: DELETE USER\n"
    NETID = "The Duke NetID login credentials you have provided are invalid."
    LOGIN = "ERROR: LOGIN\n"
