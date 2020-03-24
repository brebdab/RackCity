import functools


def asset_permission_required(func):
    @functools.wraps(func)
    def wrapper_decorator(*args, **kwargs):
        # TODO
        value = func(*args, **kwargs)
        return value
    return wrapper_decorator
