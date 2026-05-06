from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('trainings', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TrainingReview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])),
                ('feedback', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='training_reviews', to=settings.AUTH_USER_MODEL)),
                ('training', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='review', to='trainings.training')),
            ],
        ),
    ]
