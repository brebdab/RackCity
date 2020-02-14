from rest_framework import serializers
from rackcity.models import Datacenter


class RackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Datacenter
        fields = (
            'id',
            'abbreviation',
            'name',
        )
