# Generated by Django 3.0.3 on 2020-04-11 06:53

import django.contrib.postgres.fields
from django.db import migrations, models
import rackcity.models.model_utils


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0047_auto_20200409_1701'),
    ]

    operations = [
        migrations.AlterField(
            model_name='itmodel',
            name='network_ports',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=150, validators=[rackcity.models.model_utils.validate_portname]), blank=True, null=True, size=None),
        ),
    ]
