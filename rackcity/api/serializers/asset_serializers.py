from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rackcity.models import Asset
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
