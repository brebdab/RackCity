# Generated by Django 3.0.2 on 2020-02-17 05:43

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('rackcity', '0012_merge_20200217_0543'),
    ]

    operations = [
        migrations.AlterField(
            model_name='log',
            name='related_assets',
            field=models.ManyToManyField(blank=True, to='rackcity.Asset', verbose_name='related assets'),
        ),
        migrations.AlterField(
            model_name='log',
            name='related_model',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='rackcity.ITModel', verbose_name='related model'),
        ),
        migrations.AlterField(
            model_name='log',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='related user'),
        ),
    ]