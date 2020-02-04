from django.db.models import PositiveIntegerField


class RCPositiveIntegerField(PositiveIntegerField):
    def get_prep_value(self, value):
        print("running custom get_prep_value")
        if value == '':
            return None
        return value  # call super?
