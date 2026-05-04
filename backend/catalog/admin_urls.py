from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AdminEquipmentViewSet, AdminAccessoryViewSet

router = DefaultRouter()
router.register(r'equipment', AdminEquipmentViewSet, basename='admin-equipment')
router.register(r'accessories', AdminAccessoryViewSet, basename='admin-accessories')

urlpatterns = [
    path('', include(router.urls)),
]
