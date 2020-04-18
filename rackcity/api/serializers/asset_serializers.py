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
from . import SiteSerializer
from .it_model_serializers import ITModelSerializer
from .rack_serializers import RackSerializer
from .change_plan_serializers import GetChangePlanSerializer
from rackcity.api.serializers.fields import RCIntegerField
import copy

from ...utils.asset_changes_utils import get_changes_on_asset


class AssetCPSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on Asset model, where model and rack fields are
    defined by their pk only.
    """

    rack_position = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )
    chassis_slot = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )
    memory_gb = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )

    class Meta:
        model = AssetCP
        fields = (
            "id",
            "asset_number",
            "hostname",
            "model",
            "rack",
            "rack_position",
            "chassis",
            "chassis_slot",
            "offline_storage_site",
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
    rack_position = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )
    chassis_slot = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )
    memory_gb = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
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
            "chassis",
            "chassis_slot",
            "offline_storage_site",
            "owner",
            "comment",
            "cpu",
            "storage",
            "display_color",
            "memory_gb",
        )


class ChassisSerializer(serializers.ModelSerializer):
    """
    Serializers the information we want for a chassis that a blade is in (only used for serializing info to be sent)
    """

    rack = RackSerializer()
    model = ITModelSerializer()
    blades = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = (
            "id",
            "hostname",
            "model",
            "rack",
            "rack_position",
            "display_color",
            "blades",
        )

    def get_blades(self, asset):
        return get_blades_in_chassis(asset)


class ChassisCPSerializer(serializers.ModelSerializer):
    """
    Serializers the information we want for a chassis that a blade is in (only used for serializing info to be sent)
    """

    rack = RackSerializer()
    model = ITModelSerializer()
    blades = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = (
            "id",
            "hostname",
            "model",
            "rack",
            "rack_position",
            "display_color",
            "blades",
        )

    def get_blades(self, asset):
        return get_blades_in_chassis_cp(asset)


class BladeSerializer(serializers.ModelSerializer):

    model = ITModelSerializer()

    class Meta:
        model = Asset
        fields = (
            "id",
            "hostname",
            "asset_number",
            "chassis_slot",
            "model",
            "display_color",
        )


class BladeCPSerializer(serializers.ModelSerializer):

    related_asset = AssetSerializer()
    model = ITModelSerializer()
    change_plan = GetChangePlanSerializer()

    class Meta:
        model = Asset
        fields = (
            "id",
            "hostname",
            "related_asset",
            "change_plan",
            "asset_number",
            "chassis_slot",
            "model",
            "display_color",
        )


class RecursiveAssetSerializer(serializers.ModelSerializer):
    """
    Recursively serializes all fields on Asset model, where model and
    rack fields are defined recursively (by all of their respective fields).
    """

    model = ITModelSerializer()
    rack = RackSerializer()
    rack_position = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )
    chassis = ChassisSerializer()
    chassis_slot = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )
    offline_storage_site = serializers.SerializerMethodField()
    mac_addresses = serializers.SerializerMethodField()
    power_connections = serializers.SerializerMethodField()
    network_connections = serializers.SerializerMethodField()
    network_graph = serializers.SerializerMethodField()
    blades = serializers.SerializerMethodField()
    datacenter = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = (
            "id",
            "asset_number",
            "hostname",
            "model",
            "datacenter",
            "rack",
            "rack_position",
            "chassis",
            "chassis_slot",
            "offline_storage_site",
            "owner",
            "comment",
            "mac_addresses",
            "network_connections",
            "network_graph",
            "power_connections",
            "blades",
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

    def get_blades(self, asset):
        return get_blades_in_chassis(asset)

    def get_datacenter(self, asset):
        return get_datacenter_of_asset(asset)

    def get_offline_storage_site(self, asset):
        return get_offline_storage_site_of_asset(asset)


class BulkAssetSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on Asset model according to the format required
    for bulk export.
    """

    datacenter = serializers.SerializerMethodField()
    offline_site = serializers.SerializerMethodField()
    vendor = serializers.SlugRelatedField(
        source="model", slug_field="vendor", many=False, read_only=True,
    )
    model_number = serializers.SlugRelatedField(
        source="model", slug_field="model_number", many=False, read_only=True,
    )
    # by default, calls get_<field> - in this case, get_rack
    rack = serializers.SerializerMethodField()
    rack_position = RCIntegerField(
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False,
    )
    chassis_number = serializers.SerializerMethodField()
    chassis_slot = RCIntegerField(
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False,
    )
    power_port_connection_1 = serializers.SerializerMethodField()
    power_port_connection_2 = serializers.SerializerMethodField()
    custom_display_color = serializers.CharField(source="display_color")
    custom_cpu = serializers.CharField(source="cpu")
    custom_storage = serializers.CharField(source="storage")
    custom_memory = RCIntegerField(
        source="memory_gb",
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False,
    )

    class Meta:
        model = Asset
        fields = (
            "asset_number",
            "hostname",
            "datacenter",
            "offline_site",
            "rack",
            "rack_position",
            "chassis_number",
            "chassis_slot",
            "vendor",
            "model_number",
            "owner",
            "comment",
            "power_port_connection_1",
            "power_port_connection_2",
            "custom_display_color",
            "custom_cpu",
            "custom_storage",
            "custom_memory",
        )

    def get_datacenter(self, asset):
        datacenter = get_datacenter_of_asset(asset)
        if datacenter:
            return datacenter["abbreviation"]

    def get_offline_site(self, asset):
        offline_storage_site = get_offline_storage_site_of_asset(asset)
        if offline_storage_site:
            return offline_storage_site["abbreviation"]

    def get_rack(self, asset):
        if asset.rack:
            return asset.rack.row_letter + str(asset.rack.rack_num)
        else:
            return None

    def get_chassis_number(self, asset):
        if asset.chassis:
            return asset.chassis.asset_number
        else:
            return None

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
    offline_storage_site = serializers.SerializerMethodField()
    chassis = ChassisCPSerializer()
    asset_conflict_hostname = AssetSerializer()
    asset_conflict_location = AssetSerializer()
    asset_conflict_asset_number = AssetSerializer()
    change_plan = GetChangePlanSerializer()
    mac_addresses = serializers.SerializerMethodField()
    power_connections = serializers.SerializerMethodField()
    network_connections = serializers.SerializerMethodField()
    network_graph = serializers.SerializerMethodField()
    related_asset = AssetSerializer()
    blades = serializers.SerializerMethodField()
    datacenter = serializers.SerializerMethodField()
    mark_as_cp = serializers.SerializerMethodField()

    class Meta:
        model = AssetCP
        fields = (
            "id",
            "asset_number",
            "hostname",
            "model",
            "datacenter",
            "rack",
            "rack_position",
            "chassis",
            "chassis_slot",
            "offline_storage_site",
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
            "blades",
            "mark_as_cp",
        )

    def get_mac_addresses(self, assetCP):
        return serialize_mac_addresses(NetworkPortCP, assetCP)

    def get_network_graph(self, assetCP):
        return generate_network_graph(assetCP)

    def get_power_connections(self, assetCP):
        return serialize_power_connections(PowerPortCP, assetCP)

    def get_network_connections(self, assetCP):
        return serialize_network_connections(NetworkPortCP, assetCP)

    def get_blades(self, assetCP):
        return get_blades_in_chassis_cp(assetCP)

    def get_datacenter(self, assetCP):
        return get_datacenter_of_asset(assetCP)

    def get_offline_storage_site(self, assetCP):
        return get_offline_storage_site_of_asset(assetCP)

    def get_mark_as_cp(self, assetCP):
        if assetCP.related_asset:
            return (
                len(get_changes_on_asset(assetCP.related_asset, assetCP)) > 0
                or assetCP.is_decommissioned
            )
        return True


class GetDecommissionedAssetCPSerializer(serializers.ModelSerializer):
    decommissioning_user = serializers.SerializerMethodField()
    datacenter = serializers.SerializerMethodField()
    time_decommissioned = serializers.SerializerMethodField()
    model = ITModelSerializer()
    rack = RackSerializer()
    chassis = ChassisSerializer()
    offline_storage_site = SiteSerializer()
    change_plan = GetChangePlanSerializer()
    power_connections = serializers.SerializerMethodField()
    network_connections = serializers.SerializerMethodField()
    network_graph = serializers.SerializerMethodField()
    datacenter = serializers.SerializerMethodField()
    mark_as_cp = serializers.SerializerMethodField()

    class Meta:
        model = AssetCP
        fields = (
            "id",
            "decommissioning_user",
            "time_decommissioned",
            "asset_number",
            "hostname",
            "model",
            "rack",
            "rack_position",
            "chassis",
            "chassis_slot",
            "datacenter",
            "change_plan",
            "offline_storage_site",
            "owner",
            "comment",
            "power_connections",
            "network_connections",
            "network_graph",
            "mark_as_cp",
        )

    def get_datacenter(self, assetCP):
        return get_datacenter_of_asset(assetCP)

    def get_network_graph(self, assetCP):
        return generate_network_graph(assetCP)

    def get_decommissioning_user(self, assetCP):
        return assetCP.change_plan.owner.username

    def get_time_decommissioned(self, assetCP):
        return "N/A"

    def get_power_connections(self, assetCP):
        return serialize_power_connections(PowerPortCP, assetCP)

    def get_network_connections(self, assetCP):
        return serialize_network_connections(NetworkPortCP, assetCP)

    def get_mark_as_cp(self, assetCP):
        if assetCP.related_asset:
            return (
                    len(get_changes_on_asset(assetCP.related_asset, assetCP)) > 0
                    or assetCP.is_decommissioned
            )
        return True

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
    bulk_asset_data["display_color"] = bulk_asset_data["custom_display_color"]
    del bulk_asset_data["custom_display_color"]
    bulk_asset_data["cpu"] = bulk_asset_data["custom_cpu"]
    del bulk_asset_data["custom_cpu"]
    bulk_asset_data["storage"] = bulk_asset_data["custom_storage"]
    del bulk_asset_data["custom_storage"]
    bulk_asset_data["memory_gb"] = bulk_asset_data["custom_memory"]
    del bulk_asset_data["custom_memory"]
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


def get_blades_in_chassis(asset):
    if not asset.model.is_blade_chassis():
        return []

    blades = Asset.objects.filter(chassis=asset.id)
    serializer = BladeSerializer(blades, many=True,)
    return serializer.data


def get_blades_in_chassis_cp(asset_cp):
    if not asset_cp.model.is_blade_chassis():
        return []
    blades_cp = AssetCP.objects.filter(
        chassis=asset_cp.id, change_plan=asset_cp.change_plan
    )
    serializer = BladeCPSerializer(blades_cp, many=True)
    return serializer.data


def generate_network_graph(asset):
    try:
        nodes = []
        if hasattr(asset, "related_asset") and asset.related_asset:

            route_id = asset.related_asset.id
        else:
            route_id = asset.id
        nodes.append({"id": asset.id, "route_id": route_id, "label": asset.hostname})
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


def get_neighbor_assets(hostname, asset_id, nodes, edges, change_plan=None):
    try:
        source_ports = NetworkPort.objects.filter(asset=asset_id)
        if change_plan:
            if AssetCP.objects.filter(change_plan=change_plan, id=asset_id).exists():
                source_ports = NetworkPortCP.objects.filter(
                    asset=asset_id, change_plan=change_plan.id
                )
        for source_port in source_ports:
            if source_port.connected_port:
                destination_port_asset = source_port.connected_port.asset
                if (
                    hasattr(destination_port_asset, "related_asset")
                    and destination_port_asset.related_asset
                ):
                    route_id = destination_port_asset.related_asset.id
                else:
                    route_id = destination_port_asset.id
                node = {
                    "id": destination_port_asset.id,
                    "route_id": route_id,
                    "label": destination_port_asset.hostname,
                }
                if node not in nodes:
                    nodes.append(node)
                edges.append(
                    {"from": source_port.asset.id, "to": destination_port_asset.id}
                )

        nodes, edges = add_chassis_to_graph(asset_id, nodes, edges, change_plan)
        nodes, edges = add_blades_to_graph(asset_id, nodes, edges, change_plan)
        return nodes, edges
    except ObjectDoesNotExist:
        return


def add_blades_to_graph(chassis_id, nodes, edges, change_plan=None):
    if change_plan:
        blades = AssetCP.objects.filter(chassis=chassis_id, change_plan=change_plan)
    else:
        blades = Asset.objects.filter(chassis=chassis_id)
    for blade in blades:
        if hasattr(blade, "related_asset") and blade.related_asset:
            route_id = blade.related_asset.id
        else:
            route_id = blade.id
        node = {
            "id": blade.id,
            "route_id": route_id,
            "label": blade.hostname,
        }
        if node not in nodes:
            nodes.append(node)
        edges.append({"from": chassis_id, "to": blade.id})
    return nodes, edges


def add_chassis_to_graph(blade_id, nodes, edges, change_plan=None):
    if change_plan:
        chassis = AssetCP.objects.get(id=blade_id).chassis
    else:
        chassis = Asset.objects.get(id=blade_id).chassis
    if not chassis:
        return nodes, edges
    if hasattr(chassis, "related_asset") and chassis.related_asset:
        route_id = chassis.related_asset.id
    else:
        route_id = chassis.id
    node = {
        "id": chassis.id,
        "route_id": route_id,
        "label": chassis.hostname,
    }
    if node not in nodes:
        nodes.append(node)
    edges.append({"from": blade_id, "to": chassis.id})
    return nodes, edges


def get_datacenter_of_asset(asset):
    datacenter = None
    if asset.rack:
        datacenter = asset.rack.datacenter
    if asset.chassis and asset.chassis.rack:
        datacenter = asset.chassis.rack.datacenter
    if datacenter:
        return SiteSerializer(datacenter).data
    else:
        return None

def get_offline_storage_site_of_asset(asset):
    offline_storage_site = None
    if asset.offline_storage_site:
        offline_storage_site = asset.offline_storage_site
    if asset.chassis and asset.chassis.offline_storage_site:
        offline_storage_site = asset.chassis.offline_storage_site
    if offline_storage_site:
        return SiteSerializer(offline_storage_site).data
    else:
        return None
