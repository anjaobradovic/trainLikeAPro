from django.db import transaction
from django.db.models import Avg
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import ClientProfile, TrainerProfile, User

from .models import (
    ClientTrainerRequest,
    Exercise,
    Training,
    TrainingExercise,
    TrainingExerciseReview,
    TrainingPlan,
    TrainingReview,
    TrainerReview
)

from .serializers import (
    ClientTrainerRequestSerializer,
    ExerciseSerializer,
    TrainingSerializer,
    TrainingExerciseSerializer,
    TrainingPlanSerializer,
    TrainingReviewSerializer,
    TrainerReviewSerializer
)


def _recalc_trainer_rating(trainer):
    profile = TrainerProfile.objects.filter(user=trainer).first()
    if not profile:
        return
    avg = TrainerReview.objects.filter(trainer=trainer).aggregate(a=Avg('rating'))['a']
    profile.average_rating = round(float(avg or 0.0), 2)
    profile.save(update_fields=['average_rating'])


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

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        training = self.get_object()

        if request.user != training.client:
            return Response(
                {'detail': 'Only the assigned client can complete this training.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if training.completed_at is not None:
            return Response(
                {'detail': 'Training is already marked as completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        rating = request.data.get('rating')
        feedback = request.data.get('feedback', '') or ''
        exercise_reviews = request.data.get('exercise_reviews', []) or []

        try:
            rating_int = int(rating)
        except (TypeError, ValueError):
            return Response(
                {'rating': 'Overall rating is required (1-5).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if rating_int < 1 or rating_int > 5:
            return Response(
                {'rating': 'Rating must be between 1 and 5.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_te_ids = set(
            training.training_exercises.values_list('id', flat=True)
        )

        cleaned = []
        for item in exercise_reviews:
            te_id = item.get('training_exercise')
            if te_id is None:
                continue
            try:
                te_id_int = int(te_id)
                ex_rating = int(item.get('rating'))
            except (TypeError, ValueError):
                return Response(
                    {'exercise_reviews': 'Each exercise review needs a numeric rating.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if te_id_int not in valid_te_ids:
                return Response(
                    {'exercise_reviews': f'Exercise {te_id_int} does not belong to this training.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if ex_rating < 1 or ex_rating > 5:
                return Response(
                    {'exercise_reviews': 'Exercise ratings must be between 1 and 5.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            cleaned.append({
                'training_exercise_id': te_id_int,
                'rating': ex_rating,
                'comment': item.get('comment', '') or '',
            })

        with transaction.atomic():
            training.completed_at = timezone.now()
            training.save(update_fields=['completed_at'])

            TrainingReview.objects.update_or_create(
                training=training,
                defaults={
                    'client': request.user,
                    'rating': rating_int,
                    'feedback': feedback,
                },
            )

            for item in cleaned:
                TrainingExerciseReview.objects.update_or_create(
                    training_exercise_id=item['training_exercise_id'],
                    defaults={
                        'client': request.user,
                        'rating': item['rating'],
                        'comment': item['comment'],
                    },
                )

        serializer = self.get_serializer(training)
        return Response(serializer.data, status=status.HTTP_200_OK)


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


class TrainerReviewViewSet(viewsets.ModelViewSet):
    serializer_class = TrainerReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'trainer':
            return TrainerReview.objects.filter(trainer=user)

        return TrainerReview.objects.filter(client=user)

    def create(self, request, *args, **kwargs):
        trainer_id = request.data.get('trainer')

        if not trainer_id:
            return Response(
                {'trainer': 'Trainer is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            trainer = User.objects.get(pk=trainer_id, role='trainer')
        except User.DoesNotExist:
            return Response(
                {'trainer': 'Trainer not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        client_profile = getattr(request.user, 'client_profile', None)
        if not client_profile or client_profile.trainer_id != trainer.id:
            return Response(
                {'detail': 'You can only rate your own trainer.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if TrainerReview.objects.filter(client=request.user, trainer=trainer).exists():
            return Response(
                {'detail': 'You have already reviewed this trainer. Edit your existing review instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(client=request.user, trainer=trainer)

        _recalc_trainer_rating(trainer)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.client_id != request.user.id:
            return Response(
                {'detail': 'You can only edit your own review.'},
                status=status.HTTP_403_FORBIDDEN
            )

        response = super().update(request, *args, **kwargs)
        _recalc_trainer_rating(instance.trainer)
        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.client_id != request.user.id:
            return Response(
                {'detail': 'You can only delete your own review.'},
                status=status.HTTP_403_FORBIDDEN
            )

        trainer = instance.trainer
        response = super().destroy(request, *args, **kwargs)
        _recalc_trainer_rating(trainer)
        return response


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