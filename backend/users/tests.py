from django.contrib.auth import authenticate
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from datetime import timedelta

from django.utils import timezone

from .models import PasswordResetCode, TrainerProfile, User


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

class TrainerRegistrationFieldsTests(APITestCase):
    """Self-registration as trainer must include DOB, gender, biography, age >= 21."""

    URL = '/api/users/register/trainer/'

    def _payload(self, **overrides):
        body = {
            'username': 'new_trainer',
            'email': 'new_trainer@example.com',
            'first_name': 'New',
            'last_name': 'Trainer',
            'password': 'StrongPass123',
            'password2': 'StrongPass123',
            'license_number': 'LIC-001',
            'specialty': 'Strength',
            'biography': 'I have ten years of coaching experience and many clients.',
            'date_of_birth': '2000-01-01',
            'gender': 'F',
        }
        body.update(overrides)
        return body

    def test_full_registration_creates_trainer_with_profile_fields(self):
        res = self.client.post(self.URL, self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username='new_trainer')
        profile = user.trainer_profile
        self.assertEqual(profile.gender, 'F')
        self.assertEqual(str(profile.date_of_birth), '2000-01-01')
        self.assertIn('ten years', profile.biography)
        self.assertEqual(profile.status, TrainerProfile.Status.PENDING)

    def test_under_21_rejected(self):
        from django.utils import timezone
        from datetime import timedelta
        too_young = (timezone.localdate() - timedelta(days=20 * 365)).isoformat()
        res = self.client.post(self.URL, self._payload(date_of_birth=too_young), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date_of_birth', res.data)
        self.assertFalse(User.objects.filter(username='new_trainer').exists())

    def test_missing_dob_rejected(self):
        body = self._payload()
        body.pop('date_of_birth')
        res = self.client.post(self.URL, body, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date_of_birth', res.data)

    def test_missing_gender_rejected(self):
        body = self._payload()
        body.pop('gender')
        res = self.client.post(self.URL, body, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('gender', res.data)

    def test_short_biography_rejected(self):
        res = self.client.post(self.URL, self._payload(biography='hi'), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('biography', res.data)

    def test_future_dob_rejected(self):
        res = self.client.post(self.URL, self._payload(date_of_birth='2099-01-01'), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class AdminCreateTrainerTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_ct', password='p', role=User.Role.ADMIN,
            is_staff=True, is_superuser=True,
        )
        self.client.force_authenticate(self.admin)

    def _payload(self, **overrides):
        body = {
            'username': 'admin_made',
            'email': 'admin_made@example.com',
            'first_name': 'Admin',
            'last_name': 'Made',
            'password': 'Strong-Pw1!',
            'password2': 'Strong-Pw1!',
            'license_number': 'LIC-A-1',
            'specialty': 'HIIT',
            'biography': 'Created by administrator with verified credentials and bio.',
            'date_of_birth': '1995-05-05',
            'gender': 'M',
        }
        body.update(overrides)
        return body

    def test_admin_create_creates_approved_trainer(self):
        res = self.client.post(reverse('admin-trainers-list'), self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(username='admin_made')
        profile = user.trainer_profile
        self.assertEqual(profile.status, TrainerProfile.Status.APPROVED)
        self.assertEqual(profile.gender, 'M')
        self.assertEqual(str(profile.date_of_birth), '1995-05-05')
        self.assertEqual(res.data['status'], TrainerProfile.Status.APPROVED)

    def test_admin_create_under_21_rejected(self):
        from django.utils import timezone
        from datetime import timedelta
        too_young = (timezone.localdate() - timedelta(days=18 * 365)).isoformat()
        res = self.client.post(
            reverse('admin-trainers-list'),
            self._payload(date_of_birth=too_young),
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('date_of_birth', res.data)

    def test_non_admin_cannot_create(self):
        client_user = User.objects.create_user(
            username='client_create', password='p', role=User.Role.CLIENT,
        )
        self.client.force_authenticate(client_user)
        res = self.client.post(reverse('admin-trainers-list'), self._payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class AdminUserListTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_ul', password='p', role=User.Role.ADMIN,
            is_staff=True, is_superuser=True,
        )
        self.trainer = User.objects.create_user(
            username='ul_trainer', password='p', email='t@e.com',
            role=User.Role.TRAINER,
        )
        self.client_user = User.objects.create_user(
            username='ul_client', password='p', email='c@e.com',
            role=User.Role.CLIENT,
        )
        self.deleted = User.objects.create_user(
            username='ul_deleted', password='p', role=User.Role.CLIENT,
            is_deleted=True,
        )
        self.client.force_authenticate(self.admin)

    def test_lists_all_roles(self):
        res = self.client.get(reverse('admin-users-list'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        usernames = {r['username'] for r in res.data['results']}
        self.assertIn('admin_ul', usernames)
        self.assertIn('ul_trainer', usernames)
        self.assertIn('ul_client', usernames)
        self.assertNotIn('ul_deleted', usernames)

    def test_role_filter(self):
        res = self.client.get(reverse('admin-users-list'), {'role': 'trainer'})
        roles = {r['role'] for r in res.data['results']}
        self.assertEqual(roles, {'trainer'})

    def test_search(self):
        res = self.client.get(reverse('admin-users-list'), {'search': 'ul_client'})
        self.assertEqual(
            [r['username'] for r in res.data['results']],
            ['ul_client'],
        )

    def test_include_deleted(self):
        res = self.client.get(reverse('admin-users-list'), {'include_deleted': 'true'})
        usernames = {r['username'] for r in res.data['results']}
        self.assertIn('ul_deleted', usernames)

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(self.client_user)
        res = self.client.get(reverse('admin-users-list'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class AdminUserDeleteTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin_del', password='p', role=User.Role.ADMIN,
            is_staff=True, is_superuser=True,
        )
        self.victim = User.objects.create_user(
            username='victim', password='p', email='v@e.com', role=User.Role.CLIENT,
        )
        self.client.force_authenticate(self.admin)

    def test_destroy_soft_deletes_user(self):
        url = reverse('admin-users-detail', args=[self.victim.pk])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.victim.refresh_from_db()
        self.assertTrue(self.victim.is_deleted)
        self.assertFalse(self.victim.is_active)
        self.assertTrue(User.objects.filter(pk=self.victim.pk).exists())

    def test_deleted_user_hidden_from_default_list(self):
        self.client.delete(reverse('admin-users-detail', args=[self.victim.pk]))
        res = self.client.get(reverse('admin-users-list'))
        usernames = {u['username'] for u in res.data['results']}
        self.assertNotIn('victim', usernames)
        with_deleted = self.client.get(
            reverse('admin-users-list'), {'include_deleted': 'true'}
        )
        self.assertIn('victim', {u['username'] for u in with_deleted.data['results']})

    def test_admin_cannot_delete_self(self):
        url = reverse('admin-users-detail', args=[self.admin.pk])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_cannot_delete(self):
        self.client.force_authenticate(self.victim)
        url = reverse('admin-users-detail', args=[self.victim.pk])
        res = self.client.delete(url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class PasswordResetCodeTests(APITestCase):
    """Self-service code-based reset (MailHog-routed in dev)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='lost', password='oldpw1234',
            email='Lost@Example.com', role=User.Role.CLIENT,
        )

    def _request(self, email):
        return self.client.post(
            reverse('auth-password-reset-request'), {'email': email}, format='json',
        )

    def _confirm(self, **overrides):
        body = {
            'email': overrides.pop('email', self.user.email),
            'code': overrides.pop('code', ''),
            'new_password': overrides.pop('new_password', 'BrandNewPw1'),
        }
        body.update(overrides)
        return self.client.post(
            reverse('auth-password-reset-confirm'), body, format='json',
        )

    def test_request_unknown_email_returns_404(self):
        res = self._request('ghost@nowhere.test')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('no account is registered', res.data['detail'].lower())

    def test_request_known_email_creates_code_and_emails(self):
        mail.outbox.clear()
        res = self._request('lost@example.com')
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)

        codes = PasswordResetCode.objects.filter(user=self.user, used_at__isnull=True)
        self.assertEqual(codes.count(), 1)
        self.assertRegex(codes.first().code, r'^\d{6}$')

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertIn(codes.first().code, mail.outbox[0].body)

    def test_new_request_invalidates_older_active_codes(self):
        old = PasswordResetCode.objects.create(user=self.user, code='111111')
        self._request('lost@example.com')
        old.refresh_from_db()
        self.assertIsNotNone(old.used_at)
        active = PasswordResetCode.objects.filter(user=self.user, used_at__isnull=True)
        self.assertEqual(active.count(), 1)

    def test_confirm_correct_code_resets_password(self):
        self._request('lost@example.com')
        code = PasswordResetCode.objects.get(user=self.user, used_at__isnull=True).code

        res = self._confirm(code=code, new_password='Brand-New99')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        self.assertEqual(authenticate(username='lost', password='Brand-New99'), self.user)
        self.assertIsNone(authenticate(username='lost', password='oldpw1234'))

    def test_email_lookup_case_insensitive(self):
        self._request('lost@example.com')
        code = PasswordResetCode.objects.get(user=self.user, used_at__isnull=True).code
        res = self._confirm(email='LOST@EXAMPLE.COM', code=code, new_password='Brand-New99')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_wrong_code_rejected(self):
        self._request('lost@example.com')
        res = self._confirm(code='000000', new_password='Brand-New99')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(authenticate(username='lost', password='oldpw1234'), self.user)

    def test_used_code_rejected_on_replay(self):
        self._request('lost@example.com')
        code = PasswordResetCode.objects.get(user=self.user, used_at__isnull=True).code
        first = self._confirm(code=code, new_password='Brand-New99')
        self.assertEqual(first.status_code, status.HTTP_204_NO_CONTENT)
        replay = self._confirm(code=code, new_password='Yet-Another1')
        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_code_rejected(self):
        reset = PasswordResetCode.objects.create(user=self.user, code='987654')
        reset.expires_at = timezone.now() - timedelta(minutes=1)
        reset.save(update_fields=['expires_at'])
        res = self._confirm(code='987654', new_password='Brand-New99')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_new_password_rejected(self):
        self._request('lost@example.com')
        code = PasswordResetCode.objects.get(user=self.user, used_at__isnull=True).code
        res = self._confirm(code=code, new_password='123')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_email_on_confirm_returns_generic_400(self):
        res = self._confirm(email='ghost@nowhere.test', code='123456')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data['detail'], 'Invalid or expired code.')


class AdminStatsTests(APITestCase):
    """Stats endpoints: overview deltas, renewal detection, timeseries zero-fill."""

    @classmethod
    def setUpTestData(cls):
        from datetime import datetime
        from decimal import Decimal
        from django.utils import timezone
        from payments.models import Payment

        cls.admin = User.objects.create_user(
            username='admin_stats', password='p', role=User.Role.ADMIN,
            is_staff=True, is_superuser=True,
        )
        tz = timezone.get_current_timezone()
        today = timezone.localdate()

        def make_user(username, role, days_ago):
            u = User.objects.create_user(username=username, password='p', role=role)
            joined = timezone.make_aware(datetime.combine(today - timedelta(days=days_ago), timezone.now().time()), tz)
            User.objects.filter(pk=u.pk).update(date_joined=joined)
            u.refresh_from_db()
            return u

        # Current 30d window: 5 new clients, 1 new trainer.
        for i in range(5):
            make_user(f'cur_client_{i}', User.Role.CLIENT, days_ago=i + 1)
        cls.cur_trainer = make_user('cur_trainer', User.Role.TRAINER, days_ago=10)

        # Prior 30d window (days 31-60): 2 clients, 2 trainers.
        for i in range(2):
            make_user(f'prev_client_{i}', User.Role.CLIENT, days_ago=35 + i)
        for i in range(2):
            make_user(f'prev_trainer_{i}', User.Role.TRAINER, days_ago=40 + i)

        # Older still (>60 days), shouldn't appear in either window.
        cls.old_client = make_user('old_client', User.Role.CLIENT, days_ago=200)

        # Payments: old_client has a COMPLETED payment 100 days ago (the "first")
        # and another COMPLETED 5 days ago (in the current window) -> renewal.
        # cur_client_0 has only one COMPLETED in the current window -> NOT a renewal.
        trainer_recv = make_user('trainer_recv', User.Role.TRAINER, days_ago=300)

        def make_payment(client, days_ago, status_=Payment.Status.COMPLETED, amount='100.00'):
            ts = timezone.make_aware(datetime.combine(today - timedelta(days=days_ago), timezone.now().time()), tz)
            p = Payment.objects.create(
                client=client, trainer=trainer_recv, amount=Decimal(amount),
                status=status_,
                period_start=ts.date(), period_end=ts.date(),
            )
            Payment.objects.filter(pk=p.pk).update(created_at=ts)
            return p

        # Renewal scenario.
        make_payment(cls.old_client, days_ago=100)
        make_payment(cls.old_client, days_ago=5)  # renewal in current window

        # First-time payment in the current window — NOT a renewal.
        first_timer = User.objects.get(username='cur_client_0')
        make_payment(first_timer, days_ago=3)

        # Prior-window renewal: cur_client_1 had a payment 70 days ago (before
        # prior window starts, but we don't reach it; we want a renewal in
        # the prior window). Set up: a client with payment 100 days ago + 45 days ago.
        prev_renewal_client = User.objects.get(username='prev_client_0')
        make_payment(prev_renewal_client, days_ago=120)
        make_payment(prev_renewal_client, days_ago=45)  # in prior window

        # A refund in the current window — for activity feed.
        ref_client = User.objects.get(username='cur_client_2')
        ref_pay = make_payment(ref_client, days_ago=20, status_=Payment.Status.REFUNDED)
        Payment.objects.filter(pk=ref_pay.pk).update(
            refunded_at=timezone.make_aware(
                datetime.combine(today - timedelta(days=2), timezone.now().time()), tz)
        )

        # Approve cur_trainer (creates a trainer-approval activity event).
        TrainerProfile.objects.create(
            user=cls.cur_trainer, license_number='L', biography='Bio',
            status=TrainerProfile.Status.APPROVED,
            approved_at=timezone.now() - timedelta(days=4),
        )
        # Pending approval to count: another trainer waiting.
        pending_user = make_user('pending_trainer', User.Role.TRAINER, days_ago=2)
        TrainerProfile.objects.create(
            user=pending_user, license_number='L2', biography='Bio',
            status=TrainerProfile.Status.PENDING,
        )

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def test_overview_30d_counts_and_deltas(self):
        res = self.client.get(reverse('admin-stats-overview'), {'period': '30d'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        d = res.data
        self.assertEqual(d['period'], '30d')

        # 5 new clients in current 30d, 2 in prior. delta = (5-2)/2 * 100 = 150.0
        self.assertEqual(d['new_clients']['count'], 5)
        self.assertEqual(d['new_clients']['delta_pct'], 150.0)

        # 2 new trainers in current (cur_trainer + pending_trainer), 2 in prior
        self.assertEqual(d['new_trainers']['count'], 2)
        self.assertEqual(d['new_trainers']['delta_pct'], 0.0)

        # 1 renewal in current, 1 in prior
        self.assertEqual(d['membership_renewals']['count'], 1)
        self.assertEqual(d['membership_renewals']['delta_pct'], 0.0)

        # active clients = clients with COMPLETED payments in window.
        # old_client (renewal) + cur_client_0 (first-time) = 2.
        # cur_client_2 had a REFUNDED payment, so excluded.
        self.assertEqual(d['active_clients']['count'], 2)

        # 1 pending trainer (the cur_trainer was approved, pending_trainer is pending).
        self.assertEqual(d['pending_trainer_approvals'], 1)

    def test_zero_baseline_returns_null_delta(self):
        # Window 7d: prior 7d has no users joined -> delta should be null.
        res = self.client.get(reverse('admin-stats-overview'), {'period': '7d'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # New trainers in current 7d = 0 (cur_trainer was 10 days ago, pending was 2),
        # prior 7d = 0. So both zero -> delta None.
        # Tighter assertion: pick whichever cell is exactly zero/zero in our fixture.
        # new_trainers: current 7d window has pending_trainer (2 days ago). Prior 7d (8-14 days ago) has cur_trainer (10 days ago) -> 1.
        # So instead: check renewals where current 7d has 1 (5 days ago), prior 7d has 0.
        self.assertIsNone(res.data['membership_renewals']['delta_pct'])
        self.assertEqual(res.data['membership_renewals']['count'], 1)

    def test_invalid_period_returns_400(self):
        res = self.client.get(reverse('admin-stats-overview'), {'period': 'lifetime'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_signups_timeseries_zero_fills_missing_days(self):
        res = self.client.get(reverse('admin-stats-signups-timeseries'),
                              {'period': '7d', 'role': 'CLIENT'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        series = res.data['series']
        self.assertEqual(len(series), 7)
        # All entries have a date and a count >= 0.
        for entry in series:
            self.assertIn('date', entry)
            self.assertGreaterEqual(entry['count'], 0)
        total = sum(e['count'] for e in series)
        # 5 cur_clients joined within 1..5 days ago, all inside 7d window.
        self.assertEqual(total, 5)

    def test_signups_timeseries_invalid_role(self):
        res = self.client.get(reverse('admin-stats-signups-timeseries'),
                              {'period': '7d', 'role': 'WIZARD'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recent_activity_includes_all_event_types(self):
        res = self.client.get(reverse('admin-stats-recent-activity'), {'limit': 20})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        types = {e['type'] for e in res.data['events']}
        self.assertIn('new_client', types)
        self.assertIn('new_trainer', types)
        self.assertIn('trainer_approved', types)
        self.assertIn('refund', types)

        # Sorted descending by timestamp.
        timestamps = [e['timestamp'] for e in res.data['events']]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_recent_activity_respects_limit(self):
        res = self.client.get(reverse('admin-stats-recent-activity'), {'limit': 3})
        self.assertEqual(len(res.data['events']), 3)

    def test_non_admin_forbidden(self):
        client_user = User.objects.create_user(
            username='nope_user', password='p', role=User.Role.CLIENT,
        )
        self.client.force_authenticate(client_user)
        res = self.client.get(reverse('admin-stats-overview'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class ClientProfileTests(APITestCase):
    """Self-service client profile endpoint."""

    def setUp(self):
        from .models import ClientProfile
        from catalog.models import Accessory, TrainingGoal
        self.user = User.objects.create_user(
            username='cli', password='p', email='cli@e.com',
            first_name='Anna', last_name='Doe',
            role=User.Role.CLIENT,
        )
        self.profile = ClientProfile.objects.create(user=self.user)
        self.mat = Accessory.objects.create(name='Yoga mat')
        self.band = Accessory.objects.create(name='Resistance band')
        self.goal_loss = TrainingGoal.objects.create(name='Weight loss')
        self.goal_gain = TrainingGoal.objects.create(name='Muscle gain')
        self.client.force_authenticate(self.user)

    def test_get_returns_empty_profile_with_is_complete_false(self):
        res = self.client.get(reverse('client-me-profile'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['is_complete'])
        self.assertEqual(res.data['home_accessories'], [])
        self.assertEqual(res.data['goals'], [])
        self.assertEqual(res.data['user']['username'], 'cli')

    def test_patch_updates_user_and_profile_fields(self):
        body = {
            'first_name': 'Annabelle', 'last_name': 'Smith',
            'date_of_birth': '1995-06-01', 'gender': 'F',
            'height': 168, 'weight': 62, 'circumference': 75,
            'description': 'I want to feel stronger.',
            'health_status': 'Mild asthma.',
            'weekly_workouts': 4, 'workout_location': 'home',
            'home_accessory_ids': [self.mat.id, self.band.id],
            'goal_ids': [self.goal_loss.id],
        }
        res = self.client.patch(reverse('client-me-profile'), body, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.profile.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Annabelle')
        self.assertEqual(self.user.last_name, 'Smith')
        self.assertEqual(str(self.profile.date_of_birth), '1995-06-01')
        self.assertEqual(self.profile.gender, 'F')
        self.assertEqual(self.profile.height, 168)
        self.assertEqual(self.profile.weight, 62)
        self.assertEqual(self.profile.circumference, 75)
        self.assertEqual(self.profile.weekly_workouts, 4)
        self.assertEqual(self.profile.workout_location, 'home')

        self.assertEqual(
            set(self.profile.home_accessories.values_list('id', flat=True)),
            {self.mat.id, self.band.id},
        )
        self.assertEqual(
            set(self.profile.goals.values_list('id', flat=True)),
            {self.goal_loss.id},
        )

        self.assertTrue(res.data['is_complete'])
        self.assertEqual(
            sorted(a['name'] for a in res.data['home_accessories']),
            ['Resistance band', 'Yoga mat'],
        )

    def test_patch_with_invalid_height_returns_400(self):
        res = self.client.patch(reverse('client-me-profile'), {'height': 9999}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('height', res.data)

    def test_patch_partial_fields(self):
        # Filling only some fields keeps is_complete False.
        res = self.client.patch(reverse('client-me-profile'),
                                {'gender': 'M'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data['is_complete'])

    def test_clearing_m2m_accepted(self):
        self.profile.home_accessories.add(self.mat)
        self.profile.goals.add(self.goal_loss)
        res = self.client.patch(reverse('client-me-profile'),
                                {'home_accessory_ids': [], 'goal_ids': []},
                                format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.profile.home_accessories.count(), 0)
        self.assertEqual(self.profile.goals.count(), 0)

    def test_inactive_or_deleted_goal_rejected(self):
        from catalog.models import TrainingGoal
        bad = TrainingGoal.objects.create(name='Inactive', is_active=False)
        res = self.client.patch(reverse('client-me-profile'),
                                {'goal_ids': [bad.id]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_trainer_cannot_access_client_profile(self):
        trainer = User.objects.create_user(
            username='t1', password='p', role=User.Role.TRAINER,
        )
        self.client.force_authenticate(trainer)
        res = self.client.get(reverse('client-me-profile'))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_blocked(self):
        self.client.force_authenticate(None)
        res = self.client.get(reverse('client-me-profile'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
