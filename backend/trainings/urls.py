from rest_framework.routers import DefaultRouter

from .views import (
    ClientTrainerRequestViewSet,
    ExerciseViewSet,
    TrainerReviewViewSet,
    TrainingExerciseViewSet,
    TrainingPlanViewSet,
    TrainingReviewViewSet,
    TrainingViewSet
)

router = DefaultRouter()

router.register(
    r'requests',
    ClientTrainerRequestViewSet,
    basename='requests'
)

router.register(
    r'exercises',
    ExerciseViewSet,
    basename='exercises'
)

router.register(
    r'training-exercises',
    TrainingExerciseViewSet,
    basename='training-exercises'
)

router.register(
    r'training-plans',
    TrainingPlanViewSet,
    basename='training-plans'
)

router.register(
    r'trainings',
    TrainingViewSet,
    basename='trainings'
)

router.register(
    r'reviews',
    TrainingReviewViewSet,
    basename='reviews'
)

router.register(
    r'trainer-reviews',
    TrainerReviewViewSet,
    basename='trainer-reviews'
)

urlpatterns = router.urls