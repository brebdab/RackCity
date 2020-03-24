from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
from functools import wraps
from rackcity.models import Asset
from rackcity.permissions.permissions import PermissionPath
from rest_framework.parsers import JSONParser


def user_passes_asset_test(test_func):
    """
    Decorator adopted from Django decorator, checks that the user passes the
    given test, raising a PermissionDenied error if they do not. The test
    should be a callable that takes the user object and returns True if the
    user passes.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            data = JSONParser().parse(request)
            id = data['id']  # TODO add checks
            asset = Asset.objects.get(id=id)  # TODO add checks
            if test_func(request.user, asset):
                return view_func(request, *args, **kwargs)
            else:
                raise PermissionDenied
        return _wrapped_view
    return decorator


def asest_permission_required():
    def check_asset_perm(user: User, asset: Asset) -> bool:
        if user.has_perms(PermissionPath.ASSET_WRITE.value):
            return True
        raise PermissionDenied
    return user_passes_asset_test(check_asset_perm)


def power_permission_required():
    def check_power_perm(user: User, asset: Asset) -> bool:
        if user.has_perms(PermissionPath.POWER_WRITE.value):
            return True
        raise PermissionDenied
    return user_passes_asset_test(check_power_perm)
