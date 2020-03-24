# Generated by Django 3.0.2 on 2020-03-24 01:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0023_decommissionedasset'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='decommissionedasset',
            options={'ordering': ['asset_number'], 'verbose_name': 'decommissioned asset'},
        ),
        migrations.AddField(
            model_name='decommissionedasset',
            name='comment',
            field=models.TextField(blank=True, null=True),
        ),
    ]
