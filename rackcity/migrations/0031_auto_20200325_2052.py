# Generated by Django 3.0.2 on 2020-03-25 20:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0030_auto_20200325_2049'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assetcp',
            name='hostname',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
    ]
