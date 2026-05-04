"""Self-service password reset by email + 6-digit code.

Flow:
  1. User submits email at /api/auth/password-reset/request/.
     - Email not in DB -> 404 with explicit message.
     - Email found    -> generate a 6-digit code, send via SMTP (MailHog in dev),
       invalidate any prior active codes, return 202.
  2. User submits {email, code, new_password} at /api/auth/password-reset/confirm/.
     - Validates the code (matches user, not used, not expired), sets the new
       password, marks code used, returns 204.
"""
import secrets

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import PasswordResetCode, User


def _generate_code():
    """Cryptographically random 6-digit numeric code."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_code_email(user, code, ttl_minutes):
    subject = 'Your LikeAPro password reset code'
    body = (
        f"Hi {user.get_full_name() or user.username},\n\n"
        f"Use this code to reset your password:\n\n"
        f"    {code}\n\n"
        f"This code expires in {ttl_minutes} minutes.\n"
        f"If you didn't request this, you can ignore this email — "
        f"your password won't change unless someone enters this code along with a new password.\n"
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


# ---------------------------------------------------------------- request --

class _RequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


@api_view(['POST'])
@permission_classes([AllowAny])
def submit_request(request):
    serializer = _RequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email'].strip()

    user = User.objects.filter(email__iexact=email, is_deleted=False).first()
    if user is None:
        return Response(
            {'detail': 'No account is registered with this email.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    now = timezone.now()
    PasswordResetCode.objects.filter(
        user=user, used_at__isnull=True, expires_at__gt=now,
    ).update(used_at=now)

    code = _generate_code()
    PasswordResetCode.objects.create(user=user, code=code)
    _send_code_email(user, code, settings.PASSWORD_RESET_CODE_TTL_MINUTES)
    return Response(
        {'detail': 'A code has been sent to your email.'},
        status=status.HTTP_202_ACCEPTED,
    )


# ---------------------------------------------------------------- confirm --

_INVALID = {'detail': 'Invalid or expired code.'}


class _ConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.RegexField(r'^\d{6}$')
    new_password = serializers.CharField(min_length=6, max_length=128, write_only=True)

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


@api_view(['POST'])
@permission_classes([AllowAny])
def confirm_reset(request):
    serializer = _ConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email'].strip()
    code = serializer.validated_data['code']
    new_password = serializer.validated_data['new_password']

    user = User.objects.filter(email__iexact=email, is_deleted=False).first()
    if user is None:
        return Response(_INVALID, status=status.HTTP_400_BAD_REQUEST)

    reset = (
        PasswordResetCode.objects
        .filter(user=user, code=code, used_at__isnull=True, expires_at__gt=timezone.now())
        .order_by('-created_at')
        .first()
    )
    if reset is None:
        return Response(_INVALID, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=['password'])
    reset.mark_used()
    return Response(status=status.HTTP_204_NO_CONTENT)
