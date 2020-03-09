from rest_framework import serializers
from rackcity.models import ChangePlan


class ChangePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChangePlan
        fields = (
            'name',
            'execution_time'
        )
