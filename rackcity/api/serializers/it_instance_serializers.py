from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rackcity.models import ITInstance
from .it_model_serializers import ITModelSerializer
from .rack_serializers import RackSerializer


class ITInstanceSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on ITInstance model, where model and rack fields are
    defined by their pk only.
    """
    hostname = serializers.CharField(validators=[
        UniqueValidator(
            queryset=ITInstance.objects.all(), lookup='iexact'
        )])

    class Meta:
        model = ITInstance
        fields = (
            'id',
            'hostname',
            'model',
            'rack',
            'elevation',
            'owner',
            'comment',
        )


class RecursiveITInstanceSerializer(serializers.ModelSerializer):
    """
    Recursively serializes all fields on ITInstance model, where model and
    rack fields are defined recursively (by all of their respective fields).
    """
    hostname = serializers.CharField(validators=[
        UniqueValidator(
            queryset=ITInstance.objects.all(), lookup='iexact'
        )])
    model = ITModelSerializer()
    rack = RackSerializer()

    class Meta:
        model = ITInstance
        fields = (
            'id',
            'hostname',
            'model',
            'rack',
            'elevation',
            'owner',
            'comment',
        )


class BulkITInstanceSerializer(serializers.ModelSerializer):
    """
    Serializes all fields on ITInstance model according to the format required
    for bulk export.
    """
    hostname = serializers.CharField(validators=[
        UniqueValidator(
            queryset=ITInstance.objects.all(), lookup='iexact'
        )])
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
    row_letter = serializers.SlugRelatedField(
        source='rack',
        slug_field='row_letter',
        many=False,
        read_only=True,
    )
    rack_num = serializers.SlugRelatedField(
        source='rack',
        slug_field='rack_num',
        many=False,
        read_only=True,
    )

    class Meta:
        model = ITInstance
        fields = (
            'hostname',
            'vendor',
            'model_number',
            'row_letter',
            'rack_num',
            'elevation',
            'owner',
            'comment'
        )
