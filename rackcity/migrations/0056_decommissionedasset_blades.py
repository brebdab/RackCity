# Generated by Django 3.0.3 on 2020-04-19 05:56

import django.contrib.postgres.fields.jsonb
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0055_merge_20200418_2219'),
    ]

    operations = [
        migrations.AddField(
            model_name='decommissionedasset',
            name='blades',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True),
        ),
    ]
