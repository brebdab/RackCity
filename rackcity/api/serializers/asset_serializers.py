from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.core.exceptions import ObjectDoesNotExist
from rackcity.models import Asset, PowerPort, NetworkPort
from .it_model_serializers import ITModelSerializer
from .rack_serializers import RackSerializer


class AssetSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on Asset model, where model and rack fields are
    defined by their pk only.
    """
    hostname = serializers.CharField(validators=[
        UniqueValidator(
            queryset=Asset.objects.all(), lookup='iexact'
        )],
        required=False
    )

    class Meta:
        model = Asset
        fields = (
            'id',
            'asset_number',
            'hostname',
            'model',
            'rack',
            'rack_position',
            'owner',
            'comment',
        )


class RecursiveAssetSerializer(serializers.ModelSerializer):
    """
    Recursively serializes all fields on Asset model, where model and
    rack fields are defined recursively (by all of their respective fields).
    """
    model = ITModelSerializer()
    rack = RackSerializer()
    mac_addresses = serializers.SerializerMethodField()
    power_connections = serializers.SerializerMethodField()
    network_connections = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = (
            'id',
            'asset_number',
            'hostname',
            'model',
            'rack',
            'rack_position',
            'owner',
            'comment',
            'mac_addresses',
            'network_connections',
            'power_connections',
        )

    def get_mac_addresses(self, asset):
        try:
            ports = NetworkPort.objects.filter(asset=asset.id)
        except ObjectDoesNotExist:
            return
        mac_addresses = {}
        for port in ports:
            if port.mac_address:
                mac_addresses[port.port_name] = port.mac_address
        return mac_addresses

    def get_power_connections(self, asset):
        try:
            ports = PowerPort.objects.filter(asset=asset.id)
        except ObjectDoesNotExist:
            return
        power_connections = {}
        for port in ports:
            if port.power_connection:
                power_connections[port.port_name] = {
                    "left_right": port.power_connection.left_right,
                    "port_number": port.power_connection.port_number
                }
        return power_connections

    def get_network_connections(self, asset):
        try:
            ports = NetworkPort.objects.filter(asset=asset.id)
        except ObjectDoesNotExist:
            return
        network_connections = []
        for port in ports:
            if port.network_connection:
                destination_port = port.network_connection
                network_connection_serialized = {
                    "source_port": port.port_name,
                    "destination_hostname": destination_port.asset.hostname,
                    "destination_port": destination_port.port_name
                }
                network_connections.append(network_connection_serialized)
        return network_connections


class BulkAssetSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on Asset model according to the format required
    for bulk export.
    """
    vendor = serializers.SlugRelatedField(
        source='model',
        slug_field='vendor',
        many=False,
        read_only=True,
    )
    model_number = serializers.SlugRelatedField(
        source='model',
        slug_field='model_number',
        many=False,
        read_only=True,
    )
    # by default, calls get_<field> - in this case, get_rack
    rack = serializers.SerializerMethodField()
    rack_position = serializers.IntegerField(source='rack_position')

    class Meta:
        model = Asset
        fields = (
            'asset_number',
            'hostname',
            'rack',
            'rack_position',
            'vendor',
            'model_number',
            'owner',
            'comment'
        )

    def get_rack(self, asset):
        return asset.rack.row_letter + str(asset.rack.rack_num)
