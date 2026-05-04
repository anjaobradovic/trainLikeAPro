from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from .models import Equipment, Accessory, TrainingGoal


class CatalogAdminTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_cat', password='p', role=User.Role.ADMIN,
            is_staff=True, is_superuser=True,
        )
        self.client.force_authenticate(self.admin)
        self.barbell = Equipment.objects.create(name='Barbell', description='Olympic')
        self.dumbbell = Equipment.objects.create(name='Dumbbell', description='Pair')
        self.mat = Accessory.objects.create(name='Yoga Mat', description='Standard mat')

    def test_create_equipment(self):
        res = self.client.post(
            reverse('admin-equipment-list'),
            {'name': 'Kettlebell', 'description': '16kg'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'Kettlebell')
        self.assertFalse(res.data['is_deleted'])

    def test_unique_name_enforced(self):
        res = self.client.post(
            reverse('admin-equipment-list'),
            {'name': 'Barbell'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_equipment(self):
        res = self.client.patch(
            reverse('admin-equipment-detail', args=[self.barbell.pk]),
            {'description': 'Updated'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.barbell.refresh_from_db()
        self.assertEqual(self.barbell.description, 'Updated')

    def test_delete_is_soft_and_excluded_by_default(self):
        url = reverse('admin-equipment-detail', args=[self.barbell.pk])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.barbell.refresh_from_db()
        self.assertTrue(self.barbell.is_deleted)
        self.assertTrue(Equipment.objects.filter(pk=self.barbell.pk).exists())

        list_res = self.client.get(reverse('admin-equipment-list'))
        names = [e['name'] for e in list_res.data]
        self.assertNotIn('Barbell', names)
        self.assertIn('Dumbbell', names)

        with_deleted = self.client.get(reverse('admin-equipment-list'), {'include_deleted': 'true'})
        names_all = [e['name'] for e in with_deleted.data]
        self.assertIn('Barbell', names_all)

    def test_search_filters_by_name(self):
        res = self.client.get(reverse('admin-equipment-list'), {'search': 'bell'})
        names = [e['name'] for e in res.data]
        self.assertCountEqual(names, ['Barbell', 'Dumbbell'])

    def test_accessory_soft_delete(self):
        url = reverse('admin-accessories-detail', args=[self.mat.pk])
        self.client.delete(url)
        self.mat.refresh_from_db()
        self.assertTrue(self.mat.is_deleted)


class CatalogPublicTests(APITestCase):
    def setUp(self):
        self.trainer = User.objects.create_user(
            username='trainer_cat', password='p', role=User.Role.TRAINER,
        )
        self.bench = Equipment.objects.create(name='Bench')
        self.deleted = Equipment.objects.create(name='Old', is_deleted=True)
        self.client.force_authenticate(self.trainer)

    def test_authenticated_non_admin_can_read(self):
        res = self.client.get(reverse('equipment-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [e['name'] for e in res.data]
        self.assertIn('Bench', names)
        self.assertNotIn('Old', names)

    def test_non_admin_cannot_create(self):
        res = self.client.post(reverse('equipment-list'), {'name': 'Hax'}, format='json')
        # POST is not even routed (read-only viewset) -> 405 or 403; both prove they can't write.
        self.assertIn(res.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED))

    def test_anonymous_blocked(self):
        self.client.force_authenticate(None)
        res = self.client.get(reverse('equipment-list'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class TrainingGoalAdminTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_g', password='p', role=User.Role.ADMIN,
            is_staff=True, is_superuser=True,
        )
        self.client.force_authenticate(self.admin)
        self.weight = TrainingGoal.objects.create(name='Weight loss', description='Burn fat')
        self.muscle = TrainingGoal.objects.create(name='Muscle gain', description='Hypertrophy')

    def test_create(self):
        res = self.client.post(
            reverse('admin-goals-list'),
            {'name': 'Endurance', 'description': 'Cardio'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['is_active'])
        self.assertFalse(res.data['is_deleted'])

    def test_toggle_active_flips_flag(self):
        url = reverse('admin-goals-toggle-active', args=[self.weight.pk])

        first = self.client.patch(url)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.weight.refresh_from_db()
        self.assertFalse(self.weight.is_active)
        self.assertFalse(first.data['is_active'])

        second = self.client.patch(url)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.weight.refresh_from_db()
        self.assertTrue(self.weight.is_active)

    def test_toggle_rejected_on_deleted_goal(self):
        self.weight.is_deleted = True
        self.weight.save()
        url = reverse('admin-goals-toggle-active', args=[self.weight.pk])
        res = self.client.patch(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soft_delete_excludes_from_default_list(self):
        url = reverse('admin-goals-detail', args=[self.muscle.pk])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.muscle.refresh_from_db()
        self.assertTrue(self.muscle.is_deleted)
        self.assertTrue(TrainingGoal.objects.filter(pk=self.muscle.pk).exists())

        list_res = self.client.get(reverse('admin-goals-list'))
        names = [g['name'] for g in list_res.data]
        self.assertNotIn('Muscle gain', names)
        self.assertIn('Weight loss', names)

        with_deleted = self.client.get(reverse('admin-goals-list'), {'include_deleted': 'true'})
        self.assertIn('Muscle gain', [g['name'] for g in with_deleted.data])


class TrainingGoalPublicTests(APITestCase):
    def setUp(self):
        self.client_user = User.objects.create_user(
            username='client_g', password='p', role=User.Role.CLIENT,
        )
        TrainingGoal.objects.create(name='Active goal', is_active=True)
        TrainingGoal.objects.create(name='Inactive goal', is_active=False)
        TrainingGoal.objects.create(name='Deleted goal', is_active=True, is_deleted=True)
        self.client.force_authenticate(self.client_user)

    def test_only_active_and_not_deleted_returned(self):
        res = self.client.get(reverse('goals-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [g['name'] for g in res.data]
        self.assertEqual(names, ['Active goal'])

    def test_anonymous_blocked(self):
        self.client.force_authenticate(None)
        res = self.client.get(reverse('goals-list'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
