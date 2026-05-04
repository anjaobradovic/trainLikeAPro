from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AdminEquipmentViewSet, AdminAccessoryViewSet, AdminTrainingGoalViewSet

router = DefaultRouter()
router.register(r'equipment', AdminEquipmentViewSet, basename='admin-equipment')
router.register(r'accessories', AdminAccessoryViewSet, basename='admin-accessories')
router.register(r'goals', AdminTrainingGoalViewSet, basename='admin-goals')

urlpatterns = [
    path('', include(router.urls)),
]
