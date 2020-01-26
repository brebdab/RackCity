from rest_framework import serializers


class RackRangeSerializer(serializers.Serializer):
    letter_start = serializers.CharField(required=True, max_length=1)
    letter_end = serializers.CharField(required=False, max_length=1)
    num_start = serializers.IntegerField(required=True)
    num_end = serializers.IntegerField(required=False)
