# Generated by Django 3.0.2 on 2020-03-24 18:45

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0025_auto_20200324_0358'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='AbstractID',
            new_name='AssetID',
        ),
        migrations.RenameField(
            model_name='asset',
            old_name='abstractid_ptr',
            new_name='assetid_ptr',
        ),
        migrations.RenameField(
            model_name='assetcp',
            old_name='abstractid_ptr',
            new_name='assetid_ptr',
        ),
    ]
