from rest_framework import serializers
from rackcity.models import Rack
from .datacenter_serializers import DatacenterSerializer


class RackSerializer(serializers.ModelSerializer):
    datacenter = DatacenterSerializer()

    class Meta:
        model = Rack
        fields = (
            "id",
            "datacenter",
            "row_letter",
            "rack_num",
            "height",
            "is_network_controlled",
        )
