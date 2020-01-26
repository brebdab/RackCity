from rest_framework import serializers


class ResponseMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = None
        fields = (
            'success',
            'failure_message',
        )
