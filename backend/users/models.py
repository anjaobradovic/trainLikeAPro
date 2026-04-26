from django.contrib.auth.models import AbstractUser
from django.db import models

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
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='trainer_profile')
    biography = models.TextField(blank=True)
    specialty = models.CharField(max_length=200, blank=True)
    license_number = models.CharField(max_length=100)
    average_rating = models.FloatField(default=0.0)
    is_approved = models.BooleanField(default=False)

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
    weight = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    health_status = models.TextField(blank=True)
    workout_location = models.CharField(max_length=4, choices=WorkoutLocation.choices, default=WorkoutLocation.GYM)
    weekly_workouts = models.IntegerField(default=3)
    trainer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='clients')

    def __str__(self):
        return f"Client: {self.user.get_full_name()}"