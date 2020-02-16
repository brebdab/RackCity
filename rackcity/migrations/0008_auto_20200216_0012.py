# Generated by Django 3.0.2 on 2020-02-16 00:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0007_auto_20200215_2250'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='networkport',
            constraint=models.UniqueConstraint(fields=('asset', 'port_name'), name='unique port names on assets'),
        ),
    ]