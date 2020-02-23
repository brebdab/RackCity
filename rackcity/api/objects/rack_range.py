from rest_framework import serializers
from rackcity.models.rack import validate_row_letter
from rackcity.models import Datacenter


class RackRangeSerializer(serializers.Serializer):
    datacenter = serializers.PrimaryKeyRelatedField(
        label='datacenter',
        queryset=Datacenter.objects.all()
    )
    letter_start = serializers.CharField(required=True, max_length=1)
    letter_end = serializers.CharField(required=False, max_length=1)
    num_start = serializers.IntegerField(required=True)
    num_end = serializers.IntegerField(required=False)

    def validate(self, data):
        if ('letter_start' in data):
            data['letter_start'] = data['letter_start'].upper()
            validate_row_letter(data['letter_start'])

        if ('letter_end' in data):
            data['letter_end'] = data['letter_end'].upper()
            validate_row_letter(data['letter_end'])

        if data['num_start'] <= 0:
            message = "invalid rack number less than or equal to 0"
            raise serializers.ValidationError(message)

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

    def get_num_racks_in_range(self):
        """
        Returns int total number racks within rack range
        """
        if 'letter_end' in self.validated_data:
            num_row = 1 + \
                ord(self.validated_data['letter_end']) - \
                ord(self.validated_data['letter_start'])
        else:
            num_row = 1
        if 'num_end' in self.validated_data:
            num_col = 1 + \
                self.validated_data['num_end'] - \
                self.validated_data['num_start']
        else:
            num_col = 1
        return num_row * num_col

    def get_range_as_string(self):
        return "{" + self.get_row_range_as_string() + "}{" + \
            self.get_number_range_as_string() + "}"

    def get_row_range(self):
        """
        Returns str tuple specifying rack row range
        """
        if 'letter_end' in self.validated_data:
            return (
                self.validated_data['letter_start'],
                self.validated_data['letter_end']
            )
        else:
            return (
                self.validated_data['letter_start'],
                self.validated_data['letter_start']
            )

    def get_row_list(self):
        """
        Returns str list specifying all rack rows
        """
        if 'letter_end' not in self.validated_data:
            return [self.validated_data['letter_start']]
        else:
            return [
                chr(ch_ord) for ch_ord in range(
                    ord(self.validated_data['letter_start']),
                    ord(self.validated_data['letter_end']) + 1,
                )
            ]

    def get_row_range_as_string(self):
        row_range = self.get_row_range()
        return row_range[0] + "-" + row_range[1]

    def get_number_range(self):
        """
        Returns int tuple specifying rack number range
        """
        if 'num_end' in self.validated_data:
            return (
                self.validated_data['num_start'],
                self.validated_data['num_end']
            )
        else:
            return (
                self.validated_data['num_start'],
                self.validated_data['num_start']
            )

    def get_number_list(self):
        """
        Returns int list specifying all rack numbers
        """
        if 'num_end' not in self.validated_data:
            return [self.validated_data['num_start']]
        else:
            return [
                i for i in range(
                    self.validated_data['num_start'],
                    self.validated_data['num_end'] + 1,
                )
            ]

    def get_number_range_as_string(self):
        number_range = self.get_number_range()
        return str(number_range[0]) + "-" + str(number_range[1])

    def get_datacenter(self):
        return self.validated_data['datacenter']
