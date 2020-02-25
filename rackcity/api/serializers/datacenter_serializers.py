from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rackcity.models import Datacenter


class DatacenterSerializer(serializers.ModelSerializer):

    abbreviation = serializers.CharField(validators=[
        UniqueValidator(
            queryset=Datacenter.objects.all(), lookup='iexact'
        )
    ])
    name = serializers.CharField(validators=[
        UniqueValidator(
            queryset=Datacenter.objects.all(), lookup='iexact'
        )
    ])

    class Meta:
        model = Datacenter
        fields = (
            'id',
            'abbreviation',
            'name',
        )
