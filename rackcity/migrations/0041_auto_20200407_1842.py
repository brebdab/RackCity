# Generated by Django 3.0.3 on 2020-04-07 22:42

from django.db import migrations, models
import rackcity.models.fields.rackcity_model_fields
import rackcity.models.model_utils


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0040_auto_20200329_1844'),
    ]

    operations = [
        migrations.AddField(
            model_name='asset',
            name='cpu',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='asset',
            name='display_color',
            field=models.CharField(default='#394B59', max_length=7, validators=[rackcity.models.model_utils.validate_display_color]),
        ),
        migrations.AddField(
            model_name='asset',
            name='memory_gb',
            field=rackcity.models.fields.rackcity_model_fields.RCPositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='asset',
            name='storage',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='assetcp',
            name='cpu',
            field=models.CharField(blank=True, max_length=150),
        ),
        migrations.AddField(
            model_name='assetcp',
            name='display_color',
            field=models.CharField(default='#394B59', max_length=7, validators=[rackcity.models.model_utils.validate_display_color]),
        ),
        migrations.AddField(
            model_name='assetcp',
            name='memory_gb',
            field=rackcity.models.fields.rackcity_model_fields.RCPositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='assetcp',
            name='storage',
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
