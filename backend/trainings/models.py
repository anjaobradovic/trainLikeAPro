from django.db import models
from users.models import User


class ClientTrainerRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'

    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_requests'
    )

    trainer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='received_requests'
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.client} -> {self.trainer}"


class Exercise(models.Model):
    trainer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='exercises'
    )

    name = models.CharField(max_length=120)

    note = models.TextField()

    video = models.URLField(blank=True)

    equipment = models.ForeignKey(
        'catalog.Equipment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    accessory = models.ForeignKey(
        'catalog.Accessory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Training(models.Model):
    trainer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trainings'
    )

    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='client_trainings'
    )

    title = models.CharField(max_length=120)

    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class TrainingExercise(models.Model):
    training = models.ForeignKey(
        Training,
        on_delete=models.CASCADE,
        related_name='training_exercises'
    )

    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.CASCADE
    )

    sets = models.IntegerField()

    reps = models.IntegerField()

    duration_minutes = models.IntegerField()

    order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.training} - {self.exercise}"


class TrainingPlan(models.Model):
    trainer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='training_plans'
    )

    client = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='client_plans'
    )

    trainings = models.ManyToManyField(Training)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Plan for {self.client}"