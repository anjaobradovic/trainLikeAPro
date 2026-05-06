from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import ClientProfile, User

from .models import (
    ClientTrainerRequest,
    Exercise,
    Training,
    TrainingExercise,
    TrainingPlan,
    TrainingReview
)

from .serializers import (
    ClientTrainerRequestSerializer,
    ExerciseSerializer,
    TrainingSerializer,
    TrainingExerciseSerializer,
    TrainingPlanSerializer,
    TrainingReviewSerializer
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


class TrainingReviewViewSet(viewsets.ModelViewSet):
    serializer_class = TrainingReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'trainer':
            return TrainingReview.objects.filter(training__trainer=user)

        return TrainingReview.objects.filter(client=user)

    def create(self, request, *args, **kwargs):
        training_id = request.data.get('training')

        try:
            training = Training.objects.get(pk=training_id)
        except Training.DoesNotExist:
            return Response(
                {'detail': 'Training not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if training.client_id != request.user.id:
            return Response(
                {'detail': 'You can only review your own trainings.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if hasattr(training, 'review'):
            return Response(
                {'detail': 'You have already reviewed this training.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(client=request.user, training=training)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.client_id != request.user.id:
            return Response(
                {'detail': 'You can only edit your own review.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.client_id != request.user.id:
            return Response(
                {'detail': 'You can only delete your own review.'},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().destroy(request, *args, **kwargs)


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