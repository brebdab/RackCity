from django.core.exceptions import ValidationError
from django.db import models
from .site import Site
import re


def validate_row_letter(value):
    letter_pattern = re.compile("[A-Z]")
    if letter_pattern.fullmatch(value) is None:
        raise ValidationError(value + " is not a valid row letter")


class Rack(models.Model):
    datacenter = models.ForeignKey(
        Site, on_delete=models.CASCADE, verbose_name="datacenter",
    )
    row_letter = models.CharField(max_length=1, validators=[validate_row_letter])
    rack_num = models.PositiveIntegerField()
    height = models.PositiveIntegerField(default=42)
    is_network_controlled = models.BooleanField(default=False)

    class Meta:
        ordering = ["datacenter", "row_letter", "rack_num"]
        constraints = [
            models.UniqueConstraint(
                fields=["datacenter", "row_letter", "rack_num"],
                name="unique rack letter and number per datacenter",
            ),
        ]

    def char_range(self, c1, c2):
        """Generates the characters from `c1` to `c2`, inclusive."""
        for c in range(ord(c1), ord(c2) + 1):
            yield chr(c)

    def save(self, *args, **kwargs):
        my_dc = self.datacenter
        correct_dc = my_dc.abbreviation.lower() == "rtp1"
        correct_row = self.row_letter.lower() in self.char_range("a", "e")
        correct_rack_num = int(self.rack_num) > 0 and int(self.rack_num) < 20
        self.is_network_controlled = correct_dc and correct_row and correct_rack_num
        try:
            validate_row_letter(self.row_letter)
        except ValidationError as valid_error:
            raise valid_error
        else:
            super(Rack, self).save(*args, **kwargs)
            self.add_pdu_ports()

    def add_pdu_ports(self):
        from rackcity.models import PDUPort

        if len(PDUPort.objects.filter(rack=self.id)) == 0:
            for left_right in ["L", "R"]:
                for port_number in range(1, 25):  # 1 through 24 inclusive
                    pdu_port = PDUPort(
                        rack=self, left_right=left_right, port_number=port_number,
                    )
                    pdu_port.save()
