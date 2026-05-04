from rest_framework.permissions import BasePermission
from .models import User


class IsAdmin(BasePermission):
    message = 'Administrator access required.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and not user.is_deleted
            and user.role == User.Role.ADMIN
        )


class IsClient(BasePermission):
    message = 'Client access required.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and not user.is_deleted
            and user.role == User.Role.CLIENT
        )
