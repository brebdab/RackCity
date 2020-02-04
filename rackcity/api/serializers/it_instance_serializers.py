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
            'model',
            'rack',
            'elevation',
            'owner',
            'comment',
        )


class BulkITInstanceSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on ITInstance model according to the format required
    for bulk export.
    """
    vendor = serializers.SlugRelatedField(
        source='model',
        slug_field='vendor',
        many=False,
        read_only=True,
    )
    model_number = serializers.SlugRelatedField(
        source='model',
        slug_field='model_number',
        many=False,
        read_only=True,
    )
    # by default, calls get_<field> - in this case, get_rack
    rack = serializers.SerializerMethodField()
    rack_position = serializers.IntegerField(source='elevation')

    class Meta:
        model = ITInstance
        fields = (
            'hostname',
            'rack',
            'rack_position',
            'vendor',
            'model_number',
            'owner',
            'comment'
        )

    def get_rack(self, instance):
        return '{}{}'.format(instance.rack.row_letter, instance.rack.rack_num)
