from rest_framework import serializers
from rackcity.models import Rack
from .site_serializers import SiteSerializer


class RackSerializer(serializers.ModelSerializer):
    datacenter = SiteSerializer()

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
