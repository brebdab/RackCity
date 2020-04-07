from rest_framework import serializers
from rackcity.models import NetworkPort


class BulkNetworkPortSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on NetworkPort model according to the format required
    for bulk export.
    """

    src_hostname = serializers.SlugRelatedField(
        source="asset", slug_field="hostname", many=False, read_only=True,
    )
    src_port = serializers.CharField(source="port_name")
    src_mac = serializers.CharField(source="mac_address")
    dest_hostname = serializers.SlugRelatedField(
        source="connected_port.asset",
        slug_field="hostname",
        many=False,
        read_only=True,
    )
    dest_port = serializers.SlugRelatedField(
        source="connected_port", slug_field="port_name", many=False, read_only=True,
    )

    class Meta:
        model = NetworkPort
        fields = (
            "src_hostname",
            "src_port",
            "src_mac",
            "dest_hostname",
            "dest_port",
        )


def normalize_bulk_network_data(bulk_network_data):
    mac_address = {bulk_network_data["src_port"]: bulk_network_data["src_mac"]}
    network_connection = [
        {
            "source_port": bulk_network_data["src_port"],
            "destination_hostname": bulk_network_data["dest_hostname"],
            "destination_port": bulk_network_data["dest_port"],
        }
    ]
    return mac_address, network_connection
