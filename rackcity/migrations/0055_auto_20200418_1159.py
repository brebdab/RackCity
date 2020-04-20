# Generated by Django 3.0.3 on 2020-04-18 15:59

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0054_merge_20200418_0122'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assetcp',
            name='chassis',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='rackcity.AssetCP', verbose_name='chassis'),
        ),
        migrations.AlterField(
            model_name='itmodel',
            name='model_type',
            field=models.CharField(choices=[('Rackmount', 'Rackmount'), ('Chassis', 'Chassis'), ('Blade', 'Blade')], max_length=150),
        ),
    ]
