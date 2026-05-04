from django.urls import path

from .password_reset import submit_request, confirm_reset

urlpatterns = [
    path('password-reset/request/', submit_request, name='auth-password-reset-request'),
    path('password-reset/confirm/', confirm_reset, name='auth-password-reset-confirm'),
]
