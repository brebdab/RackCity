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
