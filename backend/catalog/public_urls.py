from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PublicEquipmentViewSet, PublicAccessoryViewSet, PublicTrainingGoalViewSet

router = DefaultRouter()
router.register(r'equipment', PublicEquipmentViewSet, basename='equipment')
router.register(r'accessories', PublicAccessoryViewSet, basename='accessories')
router.register(r'goals', PublicTrainingGoalViewSet, basename='goals')

urlpatterns = [
    path('', include(router.urls)),
]
