from rest_framework import serializers

from rackcity.models import (
    Article,
    ITInstance,
    ITModel,
    Rack,
    User,
)


class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ('id', 'title', 'content')


class ITInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITInstance
        fields = ('instance_id', 'model', 'user', 'comment', 'unique_id')


class ITModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITModel
        fields = (
            'model_id',
            'vendor',
            'model_number',
            'height',
            'comment',
            'display_color',
            'num_ethernet_ports',
            'num_power_ports',
            'cpu',
            'memory_gb',
            'storage',
        )


class RackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rack
        fields = ('rack_id', 'row_letter', 'rack_num')


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('user_id')
