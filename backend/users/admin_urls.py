from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .admin_views import AdminTrainerViewSet

router = DefaultRouter()
router.register(r'trainers', AdminTrainerViewSet, basename='admin-trainers')

urlpatterns = [
    path('', include(router.urls)),
]
