from rest_framework.serializers import IntegerField
from rest_framework.fields import (
    lazy_format,
    MaxValueValidator,
    MinValueValidator
)


class RCIntegerField(IntegerField):

    def __init__(self, **kwargs):
        self.max_value = kwargs.pop('max_value', None)
        self.min_value = kwargs.pop('min_value', None)
        super().__init__(**kwargs)
        if self.max_value is not None and self.max_value != "":
            message = lazy_format(
                self.error_messages['max_value'], max_value=self.max_value)
            self.validators.append(
                MaxValueValidator(self.max_value, message=message))
        if self.min_value is not None and self.min_value != "":
            message = lazy_format(
                self.error_messages['min_value'], min_value=self.min_value)
            self.validators.append(
                MinValueValidator(self.min_value, message=message))

    def to_internal_value(self, data):
        if isinstance(data, str) and len(data) > self.MAX_STRING_LENGTH:
            self.fail('max_string_length')
        if isinstance(data, str) and data == "":
            return None
        try:
            data = int(self.re_decimal.sub('', str(data)))
        except (ValueError, TypeError):
            self.fail('invalid')
        return data
