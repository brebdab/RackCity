from rest_framework import serializers
from rackcity.models import Datacenter


class DatacenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Datacenter
        fields = (
            'id',
            'abbreviation',
            'name',
        )
