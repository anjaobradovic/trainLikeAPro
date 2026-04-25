from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Naš custom User model koji nasljeđuje Django-ov AbstractUser.
    Django već ima: username, password, first_name, last_name, email.
    Mi dodajemo: role i ostale podatke.
    """
    
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrator'
        TRAINER = 'trainer', 'Trener'
        CLIENT = 'client', 'Klijent'
    
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.CLIENT
    )
    is_deleted = models.BooleanField(default=False)  # logičko brisanje
    
    def __str__(self):
        return f"{self.username} ({self.role})"


class TrainerProfile(models.Model):
    """Dodatni podaci za trenera"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='trainer_profile')
    biography = models.TextField(blank=True)
    specialty = models.CharField(max_length=200, blank=True)
    license_number = models.CharField(max_length=100)
    average_rating = models.FloatField(default=0.0)
    is_approved = models.BooleanField(default=False)  # admin mora odobriti
    
    def __str__(self):
        return f"Trener: {self.user.get_full_name()}"


class ClientProfile(models.Model):
    """Dodatni podaci za klijenta"""
    
    class Gender(models.TextChoices):
        MALE = 'M', 'Muški'
        FEMALE = 'F', 'Ženski'
        OTHER = 'O', 'Ostalo'
    
    class WorkoutLocation(models.TextChoices):
        GYM = 'gym', 'Teretana'
        HOME = 'home', 'Kuća'
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices, blank=True)
    weight = models.FloatField(null=True, blank=True)  # kg
    height = models.FloatField(null=True, blank=True)  # cm
    health_status = models.TextField(blank=True)
    workout_location = models.CharField(
        max_length=4,
        choices=WorkoutLocation.choices,
        default=WorkoutLocation.GYM
    )
    weekly_workouts = models.IntegerField(default=3)
    trainer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clients'
    )
    
    def __str__(self):
        return f"Klijent: {self.user.get_full_name()}"