from rest_framework import serializers
from rackcity.models import ChangePlan


class AddChangePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChangePlan
        fields = ("name", "execution_time", "owner")


class GetChangePlanSerializer(serializers.ModelSerializer):
    execution_time = serializers.DateTimeField(format="%m/%d/%Y %I:%M:%S %p")

    class Meta:
        model = ChangePlan
        fields = ("name", "execution_time", "id")
