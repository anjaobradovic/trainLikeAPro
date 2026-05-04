from rest_framework import serializers
from .models import Equipment, Accessory


class _CatalogItemSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [
            'id', 'name', 'description', 'image',
            'is_deleted', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_deleted', 'created_at', 'updated_at']


class EquipmentSerializer(_CatalogItemSerializer):
    class Meta(_CatalogItemSerializer.Meta):
        model = Equipment


class AccessorySerializer(_CatalogItemSerializer):
    class Meta(_CatalogItemSerializer.Meta):
        model = Accessory
