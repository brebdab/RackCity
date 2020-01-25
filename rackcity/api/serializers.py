from rest_framework import serializers
from rackcity.models import (
    ITInstance,
    ITModel,
    Rack,
)


class ITInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITInstance
        fields = ('hostname', 'height', 'model', 'rack', 'owner', 'comment')


class ITModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITModel
        fields = (
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


class RackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rack
        fields = ('row_letter', 'rack_num', 'height')
