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
    network_graph = serializers.SerializerMethodField()

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
            'network_graph',
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

    def get_network_graph(self,asset):
        return generate_network_graph(asset)
        
    def get_power_connections(self, asset):
        return serialize_power_connections(asset)

    def get_network_connections(self, asset):
        try:
            source_ports = NetworkPort.objects.filter(asset=asset.id)
        except ObjectDoesNotExist:
            return
        network_connections = []
        for source_port in source_ports:
            if source_port.connected_port:
                destination_port = source_port.connected_port
                network_connection_serialized = {
                    "source_port": source_port.port_name,
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


def serialize_power_connections(asset):
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


def generate_network_graph(asset):
    try:
        nodes = {}
        nodes[asset.hostname] = asset.id
        links = []
        # neighbors of distance one 
        [nodes, links] = get_neighbor_assets(
            asset.hostname,
            asset.id,
            nodes,
            links)
        # neighbors of distance two 
        for hostname in nodes.keys():
            # ignore current asset, already found neighbors
            if(hostname != asset.hostname):
                [nodes, links] = get_neighbor_assets(
                    hostname,
                    nodes[hostname],
                    nodes,
                    links)
        return {"nodes": nodes,"links": links }
    except ObjectDoesNotExist:
        return


def get_neighbor_assets(hostname, id, nodes, links):
    try: 
        source_ports = NetworkPort.objects.filter(asset=id)
        for source_port in source_ports:
            if source_port.connected_port:
                destination_port_asset = source_port.connected_port.asset
                if destination_port_asset.hostname not in nodes:
                    nodes[destination_port_asset.hostname] = destination_port_asset.id
                links.append(
                    {"source":source_port.asset.hostname,
                        "target":destination_port_asset.hostname}
                    )
        return nodes, links
    except ObjectDoesNotExist:
        return




