# Generated by Django 3.0.2 on 2020-03-28 00:52

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0035_auto_20200328_0005'),
    ]

    operations = [
        migrations.AddField(
            model_name='assetcp',
            name='asset_conflict_asset_number',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='asset_number_conflict', to='rackcity.Asset'),
        ),
        migrations.AddField(
            model_name='assetcp',
            name='asset_conflict_hostname',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='hostname_conflict', to='rackcity.Asset'),
        ),
        migrations.AddField(
            model_name='assetcp',
            name='asset_conflict_location',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='location_conflict', to='rackcity.Asset'),
        ),
        migrations.AlterField(
            model_name='assetcp',
            name='related_asset',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='related_asset', to='rackcity.Asset'),
        ),
    ]
