from django.urls import path
from .views import RegisterClientView, RegisterTrainerView, CustomLoginView, MeView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/client/', RegisterClientView.as_view(), name='register-client'),
    path('register/trainer/', RegisterTrainerView.as_view(), name='register-trainer'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', MeView.as_view(), name='me'),
]