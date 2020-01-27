from rest_framework import serializers


class RackRangeSerializer(serializers.Serializer):
    letter_start = serializers.CharField(required=True, max_length=1)
    letter_end = serializers.CharField(required=False, max_length=1)
    num_start = serializers.IntegerField(required=True)
    num_end = serializers.IntegerField(required=False)

    def validate(self, data):
        if ('num_end' in data) and (
            data['num_end'] < data['num_start']
        ):
            message = "invalid rack number range from " + \
                str(data['num_start']) + \
                " to " + str(data['num_end'])
            raise serializers.ValidationError(message)

        if ('letter_end' in data) and (
            data['letter_end'] < data['letter_start']
        ):
            message = "invalid rack row range from " + \
                data['letter_start'] + " to " + data['letter_end']
            raise serializers.ValidationError(message)

        return data

    def get_row_range(self, data):
        """
        Returns tuple specifying rack row range
        """
        if 'letter_end' in data:
            return (data['letter_start'], data['letter_end'])
        else:
            return (data['letter_start'], data['letter_start'])

    def get_number_range(self, data):
        """
        Returns tuple specifying rack number range
        """
        if 'num_end' in data:
            return (data['num_start'], data['num_end'])
        else:
            return (data['num_start'], data['num_start'])
