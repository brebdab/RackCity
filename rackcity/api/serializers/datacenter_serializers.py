from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from rackcity.models import Site


class DatacenterSerializer(serializers.ModelSerializer):
    abbreviation = serializers.CharField(
        validators=[UniqueValidator(queryset=Site.objects.all(), lookup="iexact")]
    )
    name = serializers.CharField(
        validators=[UniqueValidator(queryset=Site.objects.all(), lookup="iexact")]
    )

    class Meta:
        model = Site
        fields = (
            "id",
            "abbreviation",
            "name",
        )
