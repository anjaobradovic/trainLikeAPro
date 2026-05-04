from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .admin_views import AdminTrainerViewSet, AdminUserViewSet
from .stats import overview, signups_timeseries, recent_activity

router = DefaultRouter()
router.register(r'trainers', AdminTrainerViewSet, basename='admin-trainers')
router.register(r'users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/overview/', overview, name='admin-stats-overview'),
    path('stats/signups-timeseries/', signups_timeseries, name='admin-stats-signups-timeseries'),
    path('stats/recent-activity/', recent_activity, name='admin-stats-recent-activity'),
]
