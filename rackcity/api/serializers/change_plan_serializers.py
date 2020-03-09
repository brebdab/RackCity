from rest_framework import serializers
from rackcity.models import ChangePlan


class AddChangePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChangePlan
        fields = (
            'name',
            'execution_time',
            'owner'
        )


class GetChangePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChangePlan
        fields = (
            'name',
            'execution_time',
        )
