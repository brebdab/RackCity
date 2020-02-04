from django.db.models import PositiveIntegerField


class RCPositiveIntegerField(PositiveIntegerField):
    def get_prep_value(self, value):
        if value == '':
            return None
        return super().get_prep_value(value)
