from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from .models import Equipment, Accessory


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
