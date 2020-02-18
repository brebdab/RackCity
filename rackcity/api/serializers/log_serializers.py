from rest_framework import serializers
from rackcity.models import Log


class LogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Log
        fields = (
            'id',
            'date',
            'log_content',
            'user',
            'related_asset',
            'related_model',
        )
