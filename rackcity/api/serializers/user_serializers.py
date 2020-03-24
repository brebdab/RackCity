from django.contrib.auth.models import User
from rackcity.api.serializers import DatacenterSerializer
from rest_auth.registration.serializers import RegisterSerializer
from rest_auth.serializers import UserDetailsSerializer
from rest_framework import serializers


class RegisterNameSerializer(RegisterSerializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)

    def custom_signup(self, request, user):
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.save(update_fields=['first_name', 'last_name'])


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(source='is_staff')

    class Meta:
        model = User
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_admin'
        )


class RackCityUserSerializer(UserDetailsSerializer):
    datacenter_permissions = DatacenterSerializer(
        many=True,
        source='rackcityuser.datacenter_permissions',
    )

    class Meta(UserDetailsSerializer.Meta):
        fields = UserDetailsSerializer.Meta.fields + \
            ('datacenter_permissions',)

    def update(self, instance, validated_data):
        rackcityuser_data = validated_data.pop('rackcityuser', {})
        datacenter_permissions = rackcityuser_data.get(
            'datacenter_permissions'
        )
        instance = super(RackCityUserSerializer, self).update(
            instance,
            validated_data,
        )
        rackcityuser = instance.rackcityuser
        if rackcityuser_data and datacenter_permissions:
            rackcityuser.datacenter_permissions = datacenter_permissions
            rackcityuser.save()
        return instance
