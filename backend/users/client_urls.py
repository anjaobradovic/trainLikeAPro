from django.urls import path

from .client_views import MyClientProfileView

urlpatterns = [
    path('me/profile/', MyClientProfileView.as_view(), name='client-me-profile'),
]
