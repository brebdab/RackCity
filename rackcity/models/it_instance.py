import re
from django.core.exceptions import ValidationError
from django.db import models
from .it_model import ITModel
from .rack import Rack


def validate_hostname(value):
    # ul = '\u00a1-\uffff'  # unicode letters range (must not be a raw string)

    hostname_re = r'[a-z' + \
        r'0-9](?:[a-z' + r'0-9-]{0,61}[a-z' + r'0-9])?'
    # Max length for domain name labels is 63 characters per RFC 1034 sec. 3.1
    domain_re = r'(?:\.(?!-)[a-z' + r'0-9-]{1,63}(?<!-))*'
    tld_re = (
        r'\.'                                # dot
        r'(?!-)'                             # can't start with a dash
        r'(?:[a-z' + '-]{2,63}'         # domain label
        r'|xn--[a-z0-9]{1,59})'              # or punycode label
        r'(?<!-)'                            # can't end with a dash
        r'\.?'                               # may have a trailing dot
    )
    host_re = '(' + hostname_re + domain_re + tld_re + '|localhost)'
    host_pattern = re.compile(host_re)
    return host_pattern
    # matches = host_pattern.match(value)
    # return matches

    # if value % 2 != 0:
    #     raise ValidationError(
    #         _('%(value)s is not an even number'),
    #         params={'value': value},
    #     )


class ITInstance(models.Model):
    hostname = models.CharField(
        max_length=150, unique=True, validators=[validate_hostname])
    elevation = models.PositiveIntegerField()
    model = models.ForeignKey(
        ITModel,
        on_delete=models.CASCADE,
        verbose_name="related model",
    )
    rack = models.ForeignKey(
        Rack,
        on_delete=models.CASCADE,
        verbose_name="related rack",
    )
    owner = models.CharField(max_length=150)
    comment = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['hostname']
        verbose_name = 'instance'
