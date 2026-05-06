from datetime import date

from rest_framework import serializers

from users.models import ClientProfile

from .models import (
    ClientTrainerRequest,
    Exercise,
    Training,
    TrainingExercise,
    TrainingPlan,
    TrainingReview
)


class RequestClientProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    age = serializers.SerializerMethodField()
    goals = serializers.SerializerMethodField()
    home_accessories = serializers.SerializerMethodField()
    workout_location_display = serializers.CharField(
        source='get_workout_location_display',
        read_only=True
    )
    gender_display = serializers.CharField(
        source='get_gender_display',
        read_only=True
    )

    class Meta:
        model = ClientProfile
        fields = [
            'full_name',
            'username',
            'email',
            'age',
            'gender',
            'gender_display',
            'date_of_birth',
            'height',
            'weight',
            'circumference',
            'weekly_workouts',
            'workout_location',
            'workout_location_display',
            'description',
            'health_status',
            'goals',
            'home_accessories',
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_age(self, obj):
        if not obj.date_of_birth:
            return None
        today = date.today()
        return today.year - obj.date_of_birth.year - (
            (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
        )

    def get_goals(self, obj):
        return [{'id': g.id, 'name': g.name} for g in obj.goals.all()]

    def get_home_accessories(self, obj):
        return [{'id': a.id, 'name': a.name} for a in obj.home_accessories.all()]


class ClientTrainerRequestSerializer(serializers.ModelSerializer):
    client_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ClientTrainerRequest
        fields = '__all__'
        read_only_fields = ['client']

    def get_client_detail(self, obj):
        profile = getattr(obj.client, 'client_profile', None)
        if profile is None:
            return {
                'full_name': obj.client.get_full_name() or obj.client.username,
                'username': obj.client.username,
                'email': obj.client.email,
            }
        return RequestClientProfileSerializer(profile).data


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = '__all__'
        read_only_fields = ['trainer']


class TrainingExerciseSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(
        source='exercise.name',
        read_only=True
    )

    class Meta:
        model = TrainingExercise
        fields = [
            'id',
            'exercise',
            'exercise_name',
            'sets',
            'reps',
            'duration_minutes',
            'order',
        ]


class TrainingReviewSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TrainingReview
        fields = [
            'id',
            'training',
            'client',
            'client_name',
            'rating',
            'feedback',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['client', 'created_at', 'updated_at']

    def get_client_name(self, obj):
        return obj.client.get_full_name() or obj.client.username

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value


class TrainingSerializer(serializers.ModelSerializer):
    training_exercises = TrainingExerciseSerializer(
        many=True,
        read_only=True
    )

    review = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Training
        fields = '__all__'
        read_only_fields = ['trainer']

    def get_review(self, obj):
        try:
            review = obj.review
        except TrainingReview.DoesNotExist:
            return None
        except Exception:
            return None
        return TrainingReviewSerializer(review).data


class TrainingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingPlan
        fields = '__all__'
        read_only_fields = ['trainer']