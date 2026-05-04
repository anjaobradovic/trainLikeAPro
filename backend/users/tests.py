from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import User, TrainerProfile


class AdminTrainerAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_test', password='adminpass123',
            role=User.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        self.trainer_user = User.objects.create_user(
            username='trainer_x', password='tpass123',
            email='tx@test.com', first_name='Tina', last_name='Trainer',
            role=User.Role.TRAINER,
        )
        self.profile = TrainerProfile.objects.create(
            user=self.trainer_user,
            license_number='LIC-1',
            specialty='HIIT',
            biography='bio',
            status=TrainerProfile.Status.PENDING,
        )
        self.client.force_authenticate(self.admin)

    def test_approve_sets_status_and_clears_reason(self):
        self.profile.rejection_reason = 'old reason'
        self.profile.save()

        url = reverse('admin-trainers-approve', args=[self.profile.pk])
        res = self.client.post(url)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, TrainerProfile.Status.APPROVED)
        self.assertEqual(self.profile.rejection_reason, '')
        self.assertEqual(res.data['status'], TrainerProfile.Status.APPROVED)

    def test_reject_requires_reason_and_stores_it(self):
        url = reverse('admin-trainers-reject', args=[self.profile.pk])

        bad = self.client.post(url, {}, format='json')
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

        ok = self.client.post(url, {'reason': 'License unverified'}, format='json')
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.status, TrainerProfile.Status.REJECTED)
        self.assertEqual(self.profile.rejection_reason, 'License unverified')

    def test_destroy_is_soft_delete(self):
        url = reverse('admin-trainers-detail', args=[self.profile.pk])
        res = self.client.delete(url)

        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.is_deleted)
        self.assertEqual(self.profile.status, TrainerProfile.Status.REMOVED)
        self.assertTrue(TrainerProfile.objects.filter(pk=self.profile.pk).exists())

    def test_list_excludes_deleted_by_default_and_filters_by_status(self):
        deleted_user = User.objects.create_user(
            username='trainer_del', password='p', role=User.Role.TRAINER,
        )
        TrainerProfile.objects.create(
            user=deleted_user, license_number='LIC-2',
            status=TrainerProfile.Status.REMOVED, is_deleted=True,
        )
        approved_user = User.objects.create_user(
            username='trainer_ok', password='p', role=User.Role.TRAINER,
        )
        TrainerProfile.objects.create(
            user=approved_user, license_number='LIC-3',
            status=TrainerProfile.Status.APPROVED,
        )

        list_url = reverse('admin-trainers-list')

        res = self.client.get(list_url)
        ids = [t['user_id'] for t in res.data['results']]
        self.assertIn(approved_user.id, ids)
        self.assertIn(self.trainer_user.id, ids)
        self.assertNotIn(deleted_user.id, ids)

        res2 = self.client.get(list_url, {'status': 'PENDING'})
        ids2 = [t['user_id'] for t in res2.data['results']]
        self.assertEqual(ids2, [self.trainer_user.id])

        res3 = self.client.get(list_url, {'include_deleted': 'true'})
        ids3 = [t['user_id'] for t in res3.data['results']]
        self.assertIn(deleted_user.id, ids3)

    def test_non_admin_cannot_access(self):
        client_user = User.objects.create_user(
            username='c', password='p', role=User.Role.CLIENT,
        )
        self.client.force_authenticate(client_user)
        res = self.client.get(reverse('admin-trainers-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class TrainerLoginGatingTests(APITestCase):
    def test_pending_trainer_cannot_login(self):
        user = User.objects.create_user(
            username='pending_t', password='pw12345', role=User.Role.TRAINER,
        )
        TrainerProfile.objects.create(
            user=user, license_number='L', status=TrainerProfile.Status.PENDING,
        )
        res = self.client.post(
            reverse('login'),
            {'username': 'pending_t', 'password': 'pw12345'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approved_trainer_can_login(self):
        user = User.objects.create_user(
            username='ok_t', password='pw12345', role=User.Role.TRAINER,
        )
        TrainerProfile.objects.create(
            user=user, license_number='L', status=TrainerProfile.Status.APPROVED,
        )
        res = self.client.post(
            reverse('login'),
            {'username': 'ok_t', 'password': 'pw12345'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['role'], User.Role.TRAINER)
