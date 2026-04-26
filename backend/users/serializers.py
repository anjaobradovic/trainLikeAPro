from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, TrainerProfile, ClientProfile


class RegisterClientSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            **validated_data,
            role=User.Role.CLIENT
        )
        ClientProfile.objects.create(user=user)
        return user


class RegisterTrainerSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    license_number = serializers.CharField(write_only=True)
    specialty = serializers.CharField(write_only=True, required=False, allow_blank=True)
    biography = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 'password2',
                  'license_number', 'specialty', 'biography']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        license_number = validated_data.pop('license_number')
        specialty = validated_data.pop('specialty', '')
        biography = validated_data.pop('biography', '')
        user = User.objects.create_user(
            **validated_data,
            role=User.Role.TRAINER
        )
        TrainerProfile.objects.create(
            user=user,
            license_number=license_number,
            specialty=specialty,
            biography=biography,
            is_approved=False
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role']