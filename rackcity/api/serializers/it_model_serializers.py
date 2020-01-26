from rest_framework import serializers
from rackcity.models import ITModel


class ITModelSerializer(serializers.ModelSerializer):
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
