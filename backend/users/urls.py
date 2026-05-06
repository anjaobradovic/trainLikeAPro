from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterClientView,
    RegisterTrainerView,
    CustomLoginView,
    MeView,
    AllUsersView
)

urlpatterns = [
    path(
        'register/client/',
        RegisterClientView.as_view(),
        name='register-client'
    ),

    path(
        'register/trainer/',
        RegisterTrainerView.as_view(),
        name='register-trainer'
    ),

    path(
        'login/',
        CustomLoginView.as_view(),
        name='login'
    ),

    path(
        'token/refresh/',
        TokenRefreshView.as_view(),
        name='token-refresh'
    ),

    path(
        'me/',
        MeView.as_view(),
        name='me'
    ),

    path(
        'all/',
        AllUsersView.as_view(),
        name='all-users'
    ),
]