# Generated by Django 3.0.2 on 2020-03-09 17:59

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0019_auto_20200306_0536'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assetcp',
            name='model',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    to='rackcity.ITModel', verbose_name='related model'),
        ),
        migrations.AlterField(
            model_name='assetcp',
            name='rack',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL,
                                    to='rackcity.Rack', verbose_name='related rack'),
        ),
    ]
