from rest_framework import serializers
from rackcity.models import DecommissionedAsset


class GetDecommissionedAssetSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="live_id")
    decommissioned_id = serializers.IntegerField(source="id")
    time_decommissioned = serializers.DateTimeField(format="%m/%d/%Y %I:%M:%S %p")

    class Meta:
        model = DecommissionedAsset
        fields = (
            "decommissioned_id",
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
            "offline_storage_site",
            "owner",
            "comment",
            "power_connections",
            "network_connections",
            "network_graph",
            "blades",
        )


class AddDecommissionedAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecommissionedAsset
        fields = (
            "live_id",
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
            "offline_storage_site",
            "owner",
            "comment",
            "power_connections",
            "network_connections",
            "network_graph",
            "blades",
        )



