from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


def _default_reset_expires_at():
    return timezone.now() + timedelta(minutes=30)

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        TRAINER = 'trainer', 'Trainer'
        CLIENT = 'client', 'Client'
    
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CLIENT)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.role})"


class TrainerProfile(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        REMOVED = 'REMOVED', 'Removed'

    class Gender(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'
        OTHER = 'O', 'Other'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='trainer_profile')
    biography = models.TextField(blank=True)
    specialty = models.CharField(max_length=200, blank=True)
    license_number = models.CharField(max_length=100)
    qualifications = models.TextField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices, blank=True)
    average_rating = models.FloatField(default=0.0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    rejection_reason = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Trainer: {self.user.get_full_name()}"


class ClientProfile(models.Model):
    class Gender(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'
        OTHER = 'O', 'Other'

    class WorkoutLocation(models.TextChoices):
        GYM = 'gym', 'Gym'
        HOME = 'home', 'Home'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices, blank=True)
    weight = models.FloatField(null=True, blank=True)   # kg
    height = models.FloatField(null=True, blank=True)   # cm
    circumference = models.FloatField(null=True, blank=True)  # cm (waist)
    description = models.TextField(blank=True)
    health_status = models.TextField(blank=True)
    workout_location = models.CharField(max_length=4, choices=WorkoutLocation.choices, default=WorkoutLocation.GYM)
    weekly_workouts = models.IntegerField(default=3)
    home_accessories = models.ManyToManyField(
        'catalog.Accessory', blank=True, related_name='clients_owning',
    )
    goals = models.ManyToManyField(
        'catalog.TrainingGoal', blank=True, related_name='clients_pursuing',
    )
    trainer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')

    REQUIRED_FOR_COMPLETE = ('date_of_birth', 'gender', 'height', 'weight', 'weekly_workouts', 'workout_location')

    @property
    def is_complete(self):
        for field in self.REQUIRED_FOR_COMPLETE:
            value = getattr(self, field, None)
            if value in (None, ''):
                return False
        return True

    def __str__(self):
        return f"Client: {self.user.get_full_name()}"


class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
    code = models.CharField(max_length=6, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_reset_expires_at)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'used_at']),
        ]

    def is_expired(self):
        return timezone.now() >= self.expires_at

    def is_active(self):
        return self.used_at is None and not self.is_expired()

    def mark_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=['used_at'])

    def __str__(self):
        return f"ResetCode user={self.user_id} expires_at={self.expires_at:%Y-%m-%d %H:%M}"