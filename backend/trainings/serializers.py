from rest_framework import serializers

from .models import (
    ClientTrainerRequest,
    Exercise,
    Training,
    TrainingExercise,
    TrainingPlan
)


class ClientTrainerRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientTrainerRequest
        fields = '__all__'
        read_only_fields = ['client']


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


class TrainingSerializer(serializers.ModelSerializer):
    training_exercises = TrainingExerciseSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Training
        fields = '__all__'
        read_only_fields = ['trainer']


class TrainingPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingPlan
        fields = '__all__'
        read_only_fields = ['trainer']