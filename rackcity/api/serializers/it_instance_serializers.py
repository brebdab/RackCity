from rest_framework import serializers
from rackcity.models import ITInstance


class ITInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITInstance
        fields = (
            'id',
            'hostname',
            'elevation',
            'model',
            'rack',
            'owner',
            'comment',
        )
