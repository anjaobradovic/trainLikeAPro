from django.contrib import admin

from .models import (
    ClientTrainerRequest,
    Exercise,
    Training,
    TrainingExercise,
    TrainingPlan
)


admin.site.register(ClientTrainerRequest)
admin.site.register(Exercise)
admin.site.register(Training)
admin.site.register(TrainingExercise)
admin.site.register(TrainingPlan)