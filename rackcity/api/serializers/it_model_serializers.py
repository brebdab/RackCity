from rest_framework import serializers
from rackcity.models import ITModel
from rackcity.models.it_model import DEFAULT_DISPLAY_COLOR
from rackcity.api.serializers.fields import RCIntegerField


class ITModelSerializer(serializers.ModelSerializer):

    num_network_ports = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )
    num_power_ports = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )
    memory_gb = RCIntegerField(
        allow_null=True, max_value=2147483647, min_value=0, required=False
    )

    class Meta:
        model = ITModel
        fields = (
            "id",
            "vendor",
            "model_number",
            "height",
            "display_color",
            "num_network_ports",
            "network_ports",
            "num_power_ports",
            "cpu",
            "memory_gb",
            "storage",
            "comment",
        )


class BulkITModelSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on ITModel model according to the format required
    for bulk export.
    """

    network_ports = RCIntegerField(
        source="num_network_ports",
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False,
    )
    power_ports = RCIntegerField(
        source="num_power_ports",
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False,
    )
    memory = RCIntegerField(
        source="memory_gb",
        allow_null=True,
        max_value=2147483647,
        min_value=0,
        required=False,
    )
    network_port_name_1 = serializers.SerializerMethodField()
    network_port_name_2 = serializers.SerializerMethodField()
    network_port_name_3 = serializers.SerializerMethodField()
    network_port_name_4 = serializers.SerializerMethodField()

    class Meta:
        model = ITModel
        fields = (
            "vendor",
            "model_number",
            "height",
            "display_color",
            "network_ports",
            "power_ports",
            "cpu",
            "memory",
            "storage",
            "comment",
            "network_port_name_1",
            "network_port_name_2",
            "network_port_name_3",
            "network_port_name_4",
        )

    def get_network_port_name_1(self, model):
        return self.network_port_name(model, port_number=1)

    def get_network_port_name_2(self, model):
        return self.network_port_name(model, port_number=2)

    def get_network_port_name_3(self, model):
        return self.network_port_name(model, port_number=3)

    def get_network_port_name_4(self, model):
        return self.network_port_name(model, port_number=4)

    def network_port_name(self, model, port_number):
        ports = model.network_ports
        if not ports or len(ports) < port_number:
            return None
        else:
            return ports[port_number - 1]


def normalize_bulk_model_data(bulk_model_data):
    bulk_model_data["num_network_ports"] = bulk_model_data["network_ports"]
    network_ports = []
    if bulk_model_data["num_network_ports"]:
        for port_number in range(1, int(bulk_model_data["num_network_ports"]) + 1):
            if port_number == 1 and bulk_model_data["network_port_name_1"]:
                network_ports.append(bulk_model_data["network_port_name_1"])
            elif port_number == 2 and bulk_model_data["network_port_name_2"]:
                network_ports.append(bulk_model_data["network_port_name_2"])
            elif port_number == 3 and bulk_model_data["network_port_name_3"]:
                network_ports.append(bulk_model_data["network_port_name_3"])
            elif port_number == 4 and bulk_model_data["network_port_name_4"]:
                network_ports.append(bulk_model_data["network_port_name_4"])
            else:
                network_ports.append(str(port_number))
    bulk_model_data["network_ports"] = network_ports
    del bulk_model_data["network_port_name_1"]
    del bulk_model_data["network_port_name_2"]
    del bulk_model_data["network_port_name_3"]
    del bulk_model_data["network_port_name_4"]
    bulk_model_data["num_power_ports"] = bulk_model_data["power_ports"]
    del bulk_model_data["power_ports"]
    bulk_model_data["memory_gb"] = bulk_model_data["memory"]
    del bulk_model_data["memory"]
    if not bulk_model_data["display_color"]:
        del bulk_model_data["display_color"]
        bulk_model_data["display_color"] = DEFAULT_DISPLAY_COLOR
    return bulk_model_data
