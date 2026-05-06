from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import ClientProfile, User

from .models import (
    ClientTrainerRequest,
    Exercise,
    Training,
    TrainingExercise,
    TrainingPlan
)

from .serializers import (
    ClientTrainerRequestSerializer,
    ExerciseSerializer,
    TrainingSerializer,
    TrainingExerciseSerializer,
    TrainingPlanSerializer
)


class ClientTrainerRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ClientTrainerRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'trainer':
            return ClientTrainerRequest.objects.filter(trainer=user)

        return ClientTrainerRequest.objects.filter(client=user)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()

        if request.user != instance.trainer:
            return Response(
                {'detail': 'Not allowed'},
                status=status.HTTP_403_FORBIDDEN
            )

        new_status = request.data.get('status')

        if new_status in ['ACCEPTED', 'REJECTED']:
            instance.status = new_status
            instance.save()

            if new_status == 'ACCEPTED':
                client_profile = ClientProfile.objects.get(
                    user=instance.client
                )

                client_profile.trainer = instance.trainer
                client_profile.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class ExerciseViewSet(viewsets.ModelViewSet):
    serializer_class = ExerciseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Exercise.objects.filter(
            trainer=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(
            trainer=self.request.user
        )


class TrainingViewSet(viewsets.ModelViewSet):
    serializer_class = TrainingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'trainer':
            return Training.objects.filter(
                trainer=user
            )

        return Training.objects.filter(
            client=user
        )

    def create(self, request, *args, **kwargs):
        data = request.data

        training = Training.objects.create(
            trainer=request.user,
            client_id=data.get('client'),
            title=data.get('title'),
            description=data.get('description', '')
        )

        exercises = data.get('exercises', [])

        for index, item in enumerate(exercises):
            TrainingExercise.objects.create(
                training=training,
                exercise_id=item.get('exercise'),
                sets=item.get('sets'),
                reps=item.get('reps'),
                duration_minutes=item.get('duration_minutes'),
                order=index
            )

        serializer = self.get_serializer(training)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


class TrainingExerciseViewSet(viewsets.ModelViewSet):
    queryset = TrainingExercise.objects.all()
    serializer_class = TrainingExerciseSerializer
    permission_classes = [IsAuthenticated]


class TrainingPlanViewSet(viewsets.ModelViewSet):
    serializer_class = TrainingPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'trainer':
            return TrainingPlan.objects.filter(
                trainer=user
            )

        return TrainingPlan.objects.filter(
            client=user
        )

    def perform_create(self, serializer):
        serializer.save(
            trainer=self.request.user
        )