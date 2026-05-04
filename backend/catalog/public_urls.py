from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import PublicEquipmentViewSet, PublicAccessoryViewSet

router = DefaultRouter()
router.register(r'equipment', PublicEquipmentViewSet, basename='equipment')
router.register(r'accessories', PublicAccessoryViewSet, basename='accessories')

urlpatterns = [
    path('', include(router.urls)),
]
