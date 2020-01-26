from rest_framework import serializers
from rackcity.models import ITInstance
from .it_model_serializers import ITModelSerializer
from .rack_serializers import RackSerializer


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


class ITInstanceSerializerRecursive(serializers.ModelSerializer):
    model = ITModelSerializer()
    rack = RackSerializer()

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
