from rest_framework import serializers
from rackcity.models import Rack


class RackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rack
        fields = (
            'id',
            'datacenter',
            'row_letter',
            'rack_num',
            'height',
            'is_network_controlled'
        )
