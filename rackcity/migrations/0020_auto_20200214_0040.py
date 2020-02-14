# Generated by Django 3.0.2 on 2020-02-14 00:40

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('rackcity', '0019_datacenter'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='rack',
            options={'ordering': ['datacenter', 'row_letter', 'rack_num']},
        ),
        migrations.RemoveConstraint(
            model_name='rack',
            name='unique rack letter and number',
        ),
        migrations.AddField(
            model_name='rack',
            name='datacenter',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='rackcity.Datacenter', verbose_name='datacenter'),
            preserve_default=False,
        ),
        migrations.AddConstraint(
            model_name='rack',
            constraint=models.UniqueConstraint(fields=('datacenter', 'row_letter', 'rack_num'), name='unique rack letter and number per datacenter'),
        ),
    ]