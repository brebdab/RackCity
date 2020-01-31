from rest_framework import serializers
from rackcity.models import ITInstance
from .it_model_serializers import ITModelSerializer
from .rack_serializers import RackSerializer


class ITInstanceSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on ITInstance model, where model and rack fields are
    defined by their pk only.
    """
    class Meta:
        model = ITInstance
        fields = (
            'id',
            'hostname',
            'model',
            'rack',
            'elevation',
            'owner',
            'comment',
        )


class RecursiveITInstanceSerializer(serializers.ModelSerializer):
    """
    Recursively serializes all fields on ITInstance model, where model and
    rack fields are defined recursively (by all of their respective fields).
    """
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
