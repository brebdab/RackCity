from rest_framework import serializers
from rackcity.models import ITModel
from rackcity.api.serializers.fields import RCIntegerField


class ITModelSerializer(serializers.ModelSerializer):

    num_power_ports = RCIntegerField(
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False
    )
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
            'num_power_ports',
            'network_ports',
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
 
    ethernet_ports = RCIntegerField(
        source='num_ethernet_ports',
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False
    )
    power_ports = RCIntegerField(
        source='num_power_ports',
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False
    )
    memory = RCIntegerField(
        source='memory_gb',
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False
    )

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
