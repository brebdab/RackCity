from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.core.exceptions import ObjectDoesNotExist
from rackcity.models import (
    Asset,
    AssetCP,
    PowerPort,
    PowerPortCP,
    NetworkPort,
    NetworkPortCP,
)
from .it_model_serializers import ITModelSerializer
from .rack_serializers import RackSerializer
from .change_plan_serializers import GetChangePlanSerializer
import copy


class AssetCPSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on Asset model, where model and rack fields are
    defined by their pk only.
    """

    class Meta:
        model = AssetCP
        fields = (
            "id",
            "asset_number",
            "hostname",
            "model",
            "rack",
            "rack_position",
            "owner",
            "comment",
            "change_plan",
            "cpu",
            "storage",
            "display_color",
            "memory_gb",
        )


class AssetSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on Asset model, where model and rack fields are
    defined by their pk only.
    """

    hostname = serializers.CharField(
        validators=[UniqueValidator(queryset=Asset.objects.all(), lookup="iexact")],
        required=False,
    )

    class Meta:
        model = Asset
        fields = (
            "id",
            "asset_number",
            "hostname",
            "model",
            "rack",
            "rack_position",
            "owner",
            "comment",
            "cpu",
            "storage",
            "display_color",
            "memory_gb",
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
            "id",
            "asset_number",
            "hostname",
            "model",
            "rack",
            "rack_position",
            "owner",
            "comment",
            "mac_addresses",
            "network_connections",
            "network_graph",
            "power_connections",
            "cpu",
            "storage",
            "display_color",
            "memory_gb",
        )

    def get_mac_addresses(self, asset):
        return serialize_mac_addresses(NetworkPort, asset)

    def get_network_graph(self, asset):
        return generate_network_graph(asset)

    def get_power_connections(self, asset):
        return serialize_power_connections(PowerPort, asset)

    def get_network_connections(self, asset):
        return serialize_network_connections(NetworkPort, asset)


class BulkAssetSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on Asset model according to the format required
    for bulk export.
    """

    datacenter = serializers.SlugRelatedField(
        source="rack.datacenter", slug_field="abbreviation", many=False, read_only=True,
    )
    vendor = serializers.SlugRelatedField(
        source="model", slug_field="vendor", many=False, read_only=True,
    )
    model_number = serializers.SlugRelatedField(
        source="model", slug_field="model_number", many=False, read_only=True,
    )
    # by default, calls get_<field> - in this case, get_rack
    rack = serializers.SerializerMethodField()
    power_port_connection_1 = serializers.SerializerMethodField()
    power_port_connection_2 = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = (
            "asset_number",
            "hostname",
            "datacenter",
            "rack",
            "rack_position",
            "vendor",
            "model_number",
            "owner",
            "comment",
            "power_port_connection_1",
            "power_port_connection_2",
        )

    def get_rack(self, asset):
        return asset.rack.row_letter + str(asset.rack.rack_num)

    def get_power_port_connection_1(self, asset):
        return self.power_port_connection(asset, port_number=1)

    def get_power_port_connection_2(self, asset):
        return self.power_port_connection(asset, port_number=2)

    def power_port_connection(self, asset, port_number):
        power_ports = PowerPort.objects.filter(asset=asset.id)
        if not power_ports or len(power_ports) < port_number:
            return None
        power_port = power_ports.get(port_name=str(port_number))
        if not power_port.power_connection:
            return None
        pdu_port = power_port.power_connection
        if not pdu_port.left_right or not pdu_port.port_number:
            return None
        return pdu_port.left_right + str(pdu_port.port_number)


class RecursiveAssetCPSerializer(serializers.ModelSerializer):
    """
    Recursively serializes all fields on AssetCP model, where model and
    rack fields are defined recursively (by all of their respective fields).
    """

    model = ITModelSerializer()
    rack = RackSerializer()
    asset_conflict_hostname = AssetSerializer()
    asset_conflict_location = AssetSerializer()
    asset_conflict_asset_number = AssetSerializer()
    change_plan = GetChangePlanSerializer()
    mac_addresses = serializers.SerializerMethodField()
    power_connections = serializers.SerializerMethodField()
    network_connections = serializers.SerializerMethodField()
    network_graph = serializers.SerializerMethodField()
    related_asset = AssetSerializer()

    class Meta:
        model = AssetCP
        fields = (
            "id",
            "asset_number",
            "hostname",
            "model",
            "rack",
            "rack_position",
            "owner",
            "comment",
            "mac_addresses",
            "network_connections",
            "network_graph",
            "power_connections",
            "change_plan",
            "is_decommissioned",
            "is_conflict",
            "asset_conflict_hostname",
            "asset_conflict_location",
            "asset_conflict_asset_number",
            "related_asset",
            "cpu",
            "storage",
            "display_color",
            "memory_gb",
        )

    def get_mac_addresses(self, assetCP):
        return serialize_mac_addresses(NetworkPortCP, assetCP)

    def get_network_graph(self, assetCP):
        return generate_network_graph(assetCP)

    def get_power_connections(self, assetCP):
        return serialize_power_connections(PowerPortCP, assetCP)

    def get_network_connections(self, assetCP):
        return serialize_network_connections(NetworkPortCP, assetCP)


def normalize_bulk_asset_data(bulk_asset_data):
    power_connections = {}
    if bulk_asset_data["power_port_connection_1"]:
        power_connections["1"] = {
            "left_right": bulk_asset_data["power_port_connection_1"][:1],
            "port_number": int(bulk_asset_data["power_port_connection_1"][1:]),
        }
    if bulk_asset_data["power_port_connection_2"]:
        power_connections["2"] = {
            "left_right": bulk_asset_data["power_port_connection_2"][:1],
            "port_number": int(bulk_asset_data["power_port_connection_2"][1:]),
        }
    bulk_asset_data["power_connections"] = power_connections
    del bulk_asset_data["power_port_connection_1"]
    del bulk_asset_data["power_port_connection_2"]
    if not bulk_asset_data["asset_number"]:
        del bulk_asset_data["asset_number"]
    if not bulk_asset_data["hostname"]:
        del bulk_asset_data["hostname"]
    return bulk_asset_data


def serialize_mac_addresses(network_port_model, asset):
    try:
        ports = network_port_model.objects.filter(
            asset=asset.id, change_plan=asset.change_plan.id
        )
    except AttributeError:
        ports = network_port_model.objects.filter(asset=asset.id)
    mac_addresses = {}
    for port in ports:
        if port.mac_address:
            mac_addresses[port.port_name] = port.mac_address
    return mac_addresses


def serialize_network_connections(network_port_model, asset):

    try:
        source_ports = network_port_model.objects.filter(
            asset=asset.id, change_plan=asset.change_plan.id
        )
    except AttributeError:
        source_ports = network_port_model.objects.filter(asset=asset.id)
    network_connections = []
    for source_port in source_ports:
        if source_port.connected_port:
            destination_port = source_port.connected_port
            network_connection_serialized = {
                "source_port": source_port.port_name,
                "destination_hostname": destination_port.asset.hostname,
                "destination_port": destination_port.port_name,
            }
            network_connections.append(network_connection_serialized)
    return network_connections


def serialize_power_connections(power_port_model, asset):
    try:
        ports = power_port_model.objects.filter(
            asset=asset.id, change_plan=asset.change_plan.id
        )
    except AttributeError:
        ports = power_port_model.objects.filter(asset=asset.id)
    power_connections = {}
    for port in ports:
        if port.power_connection:
            power_connections[port.port_name] = {
                "left_right": port.power_connection.left_right,
                "port_number": port.power_connection.port_number,
            }
    return power_connections


def generate_network_graph(asset):
    try:
        nodes = []
        nodes.append({"id": asset.id, "label": asset.hostname})
        edges = []
        # neighbors of distance one
        change_plan = None

        try:
            change_plan = asset.change_plan
        except AttributeError:
            change_plan = None
        [nodes, edges] = get_neighbor_assets(
            asset.hostname, asset.id, nodes, edges, change_plan
        )
        # neighbors of distance two
        nodes_copy = copy.deepcopy(nodes)
        for node in nodes_copy:
            # ignore current asset, already found neighbors
            if node["label"] != asset.hostname:
                [nodes, edges] = get_neighbor_assets(
                    node["label"], node["id"], nodes, edges, change_plan
                )
        return {"nodes": nodes, "edges": edges}
    except ObjectDoesNotExist:
        return


def get_neighbor_assets(hostname, id, nodes, edges, change_plan=None):
    try:
        source_ports = NetworkPort.objects.filter(asset=id)
        if change_plan:
            if AssetCP.objects.filter(change_plan=change_plan, id=id).exists():
                source_ports = NetworkPortCP.objects.filter(
                    asset=id, change_plan=change_plan.id
                )
        for source_port in source_ports:
            if source_port.connected_port:
                destination_port_asset = source_port.connected_port.asset
                node = {
                    "id": destination_port_asset.id,
                    "label": destination_port_asset.hostname,
                }
                if node not in nodes:
                    nodes.append(node)
                edges.append(
                    {"from": source_port.asset.id, "to": destination_port_asset.id}
                )
        return nodes, edges
    except ObjectDoesNotExist:
        return
