from rest_framework.decorators import permission_classes, api_view
from rest_framework.permissions import IsAdminUser
from rest_auth.registration.views import RegisterView
from django.views.decorators.debug import sensitive_post_parameters


@api_view(['POST'])
@permission_classes([IsAdminUser])
@sensitive_post_parameters('password1', 'password2')
def registration_wrapper_view(request):
    """
    Add wrapper permission class so that only admin users can call it.
    """
    return RegisterView.as_view()(request)
