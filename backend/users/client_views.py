"""Client self-service profile."""
from rest_framework import generics, serializers, status
from rest_framework.response import Response

from catalog.models import Accessory, TrainingGoal
from .models import ClientProfile, User
from .permissions import IsClient


class _NamedRefSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['id', 'name']


class _AccessoryRef(_NamedRefSerializer):
    class Meta(_NamedRefSerializer.Meta):
        model = Accessory


class _GoalRef(_NamedRefSerializer):
    class Meta(_NamedRefSerializer.Meta):
        model = TrainingGoal


class ClientProfileSerializer(serializers.ModelSerializer):
    # Read-only nested user info; first/last name are also writable separately.
    user = serializers.SerializerMethodField()
    first_name = serializers.CharField(source='user.first_name', required=False, allow_blank=True)
    last_name = serializers.CharField(source='user.last_name', required=False, allow_blank=True)

    home_accessories = _AccessoryRef(many=True, read_only=True)
    goals = _GoalRef(many=True, read_only=True)
    home_accessory_ids = serializers.PrimaryKeyRelatedField(
        queryset=Accessory.objects.filter(is_deleted=False),
        many=True, write_only=True, required=False,
    )
    goal_ids = serializers.PrimaryKeyRelatedField(
        queryset=TrainingGoal.objects.filter(is_deleted=False, is_active=True),
        many=True, write_only=True, required=False,
    )

    is_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = ClientProfile
        fields = [
            'user', 'first_name', 'last_name',
            'date_of_birth', 'gender',
            'height', 'weight', 'circumference',
            'description', 'health_status',
            'weekly_workouts', 'workout_location',
            'home_accessories', 'goals',
            'home_accessory_ids', 'goal_ids',
            'is_complete',
        ]

    def get_user(self, obj):
        u = obj.user
        return {
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
        }

    def validate_height(self, value):
        if value is not None and not (50 < value < 260):
            raise serializers.ValidationError('Height must be between 50 and 260 cm.')
        return value

    def validate_weight(self, value):
        if value is not None and not (20 < value < 400):
            raise serializers.ValidationError('Weight must be between 20 and 400 kg.')
        return value

    def validate_circumference(self, value):
        if value is not None and not (30 < value < 250):
            raise serializers.ValidationError('Circumference must be between 30 and 250 cm.')
        return value

    def validate_weekly_workouts(self, value):
        if value is not None and not (0 <= value <= 14):
            raise serializers.ValidationError('Weekly workouts must be 0–14.')
        return value

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        accessories = validated_data.pop('home_accessory_ids', None)
        goals = validated_data.pop('goal_ids', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if accessories is not None:
            instance.home_accessories.set(accessories)
        if goals is not None:
            instance.goals.set(goals)

        if user_data:
            user = instance.user
            for attr in ('first_name', 'last_name'):
                if attr in user_data:
                    setattr(user, attr, user_data[attr])
            user.save(update_fields=['first_name', 'last_name'])

        return instance


class MyClientProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsClient]
    serializer_class = ClientProfileSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        profile, _ = ClientProfile.objects.get_or_create(user=self.request.user)
        return profile
