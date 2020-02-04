from rest_framework import serializers
from rackcity.models import ITModel
from rackcity.api.serializers.fields import RCIntegerField


class ITModelSerializer(serializers.ModelSerializer):

    # This is the field for the serializers
    # It overrides appropriate methods to work with empty strings when you call validate
    memory_gb = RCIntegerField(
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False
    )

    class Meta:
        model = ITModel
        fields = (
            'id',
            'vendor',
            'model_number',
            'height',
            'display_color',
            'num_ethernet_ports',
            'num_power_ports',
            'cpu',
            'memory_gb',
            'storage',
            'comment',
        )


class BulkITModelSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on ITModel model according to the format required
    for bulk export.
    """
    ethernet_ports = serializers.IntegerField(source='num_ethernet_ports')
    power_ports = serializers.IntegerField(source='num_power_ports')
    memory = serializers.IntegerField(source='memory_gb')

    class Meta:
        model = ITModel
        fields = (
            'vendor',
            'model_number',
            'height',
            'display_color',
            'ethernet_ports',
            'power_ports',
            'cpu',
            'memory',
            'storage',
            'comment',
        )
