from django.core.exceptions import PermissionDenied, ObjectDoesNotExist
from functools import wraps
from rackcity.models import Asset, Rack, RackCityPermission
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
            if 'id' in data:  # modifying asset
                asset_id = data['id']
                asset = Asset.objects.get(id=asset_id)  # TODO catch error
                datacenter = asset.rack.datacenter
            elif 'rack' in data:  # creating asset
                asset = None
                rack_id = data['rack']
                rack = Rack.objects.get(id=rack_id)  # TODO catch error
                datacenter = rack.datacenter
            else:
                # TODO the data is bad, it will be caught in view func
                return view_func(request, *args, **kwargs)
            if test_func(request.user, asset, datacenter):
                return view_func(request, *args, **kwargs)
            else:
                raise PermissionDenied
        return _wrapped_view
    return decorator


def asset_permission_required():
    """
    Decorator for views that checks whether the user is able to create, modify,
    decomission, or delete an asset. User must either have global asset
    permission or have per-datacenter permission for the datacenter the asset
    is located in.
    """
    def check_asset_perm(user, asset, datacenter):
        if user.has_perm(PermissionPath.ASSET_WRITE.value):
            return True
        try:
            permission = RackCityPermission.objects.get(user=user.id)
        except ObjectDoesNotExist:
            raise PermissionDenied
        else:
            if datacenter in permission.datacenter_permissions.all():
                return True
        raise PermissionDenied
    return user_passes_asset_test(check_asset_perm)


def power_permission_required():
    """
    Decorator for views that checks whether the user is able to control the
    power of an asset. User must either have power permission or be the owner
    of the asset.
    """
    def check_power_perm(user, asset, datacenter):
        if user.has_perm(PermissionPath.POWER_WRITE.value):
            return True
        elif user.username == asset.owner:
            return True
        raise PermissionDenied
    return user_passes_asset_test(check_power_perm)
