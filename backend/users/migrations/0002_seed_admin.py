from django.db import migrations
from django.contrib.auth.hashers import make_password


def seed_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    if User.objects.filter(username='admin').exists():
        return
    User.objects.create(
        username='admin',
        email='admin@likeapro.local',
        first_name='Admin',
        last_name='User',
        password=make_password('123'),
        role='admin',
        is_staff=True,
        is_superuser=True,
        is_active=True,
    )


def remove_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(username='admin', role='admin').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_admin, remove_admin),
    ]
