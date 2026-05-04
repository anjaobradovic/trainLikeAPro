from datetime import date, datetime
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from .models import Payment


def _make_payment(client, trainer, amount, status_, created, refunded_at=None):
    """Create a Payment with deterministic created_at / refunded_at.

    `auto_now_add` overrides any value passed at construction, so we save first
    and then update via QuerySet.
    """
    p = Payment.objects.create(
        client=client, trainer=trainer, amount=Decimal(amount),
        status=status_,
        period_start=created.date(), period_end=created.date(),
        refunded_at=refunded_at,
    )
    Payment.objects.filter(pk=p.pk).update(created_at=created, refunded_at=refunded_at)
    p.refresh_from_db()
    return p


class RevenueReportTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username='admin_rep', password='p',
            role=User.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        cls.client_user = User.objects.create_user(
            username='client_rep', password='p', role=User.Role.CLIENT,
        )
        cls.t1 = User.objects.create_user(
            username='trainer1', password='p', first_name='Alice', last_name='A',
            role=User.Role.TRAINER,
        )
        cls.t2 = User.objects.create_user(
            username='trainer2', password='p', first_name='Bob', last_name='B',
            role=User.Role.TRAINER,
        )

        tz = timezone.get_current_timezone()
        def dt(y, m, d, h=12):
            return timezone.make_aware(datetime(y, m, d, h), tz)

        # 2026 — completed
        _make_payment(cls.client_user, cls.t1, '100.00', Payment.Status.COMPLETED, dt(2026, 1, 10))
        _make_payment(cls.client_user, cls.t1, '50.00',  Payment.Status.COMPLETED, dt(2026, 1, 20))
        _make_payment(cls.client_user, cls.t2, '200.00', Payment.Status.COMPLETED, dt(2026, 2, 15))
        _make_payment(cls.client_user, cls.t2, '300.00', Payment.Status.COMPLETED, dt(2026, 5, 3))
        # Refund: created in Jan but refunded in March
        _make_payment(cls.client_user, cls.t1, '40.00',  Payment.Status.REFUNDED,
                      dt(2026, 1, 5), refunded_at=dt(2026, 3, 8))
        # Pending and failed must be ignored entirely
        _make_payment(cls.client_user, cls.t1, '999.99', Payment.Status.PENDING, dt(2026, 4, 1))
        _make_payment(cls.client_user, cls.t2, '888.88', Payment.Status.FAILED,  dt(2026, 4, 1))

        # 2025 — used to confirm year filter
        _make_payment(cls.client_user, cls.t1, '7.00', Payment.Status.COMPLETED, dt(2025, 6, 6))

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def _get(self, **params):
        return self.client.get(reverse('admin-reports-revenue'), params)

    def test_monthly_buckets_have_12_entries_with_zero_for_empty(self):
        res = self._get(granularity='monthly', year=2026)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['granularity'], 'monthly')
        self.assertEqual(res.data['currency'], 'EUR')
        self.assertEqual(len(res.data['series']), 12)

        by_period = {row['period']: row for row in res.data['series']}

        # January: 100 + 50 = 150 gross, 0 refund (the refund happens in March)
        self.assertEqual(Decimal(by_period['2026-01']['gross']), Decimal('150.00'))
        self.assertEqual(Decimal(by_period['2026-01']['refunds']), Decimal('0.00'))
        self.assertEqual(by_period['2026-01']['transactions'], 2)

        # February: 200 gross
        self.assertEqual(Decimal(by_period['2026-02']['gross']), Decimal('200.00'))

        # March: 0 gross, 40 refunds, net = -40
        self.assertEqual(Decimal(by_period['2026-03']['gross']), Decimal('0.00'))
        self.assertEqual(Decimal(by_period['2026-03']['refunds']), Decimal('40.00'))
        self.assertEqual(Decimal(by_period['2026-03']['net']), Decimal('-40.00'))

        # April is empty (pending + failed are excluded)
        self.assertEqual(Decimal(by_period['2026-04']['gross']), Decimal('0.00'))
        self.assertEqual(by_period['2026-04']['transactions'], 0)

        # May
        self.assertEqual(Decimal(by_period['2026-05']['gross']), Decimal('300.00'))

    def test_totals_match_series(self):
        res = self._get(granularity='monthly', year=2026)
        totals = res.data['totals']
        # Gross: 100+50+200+300 = 650
        self.assertEqual(Decimal(totals['gross']), Decimal('650.00'))
        # Refunds: 40
        self.assertEqual(Decimal(totals['refunds']), Decimal('40.00'))
        # Net: 610
        self.assertEqual(Decimal(totals['net']), Decimal('610.00'))
        # Transactions: 4 completed
        self.assertEqual(totals['transactions'], 4)

    def test_quarterly_buckets(self):
        res = self._get(granularity='quarterly', year=2026)
        self.assertEqual(len(res.data['series']), 4)
        by_period = {row['period']: row for row in res.data['series']}
        self.assertIn('2026-Q1', by_period)
        # Q1 gross: 100+50+200 = 350; refunds: 40; net 310
        self.assertEqual(Decimal(by_period['2026-Q1']['gross']), Decimal('350.00'))
        self.assertEqual(Decimal(by_period['2026-Q1']['refunds']), Decimal('40.00'))
        self.assertEqual(Decimal(by_period['2026-Q1']['net']), Decimal('310.00'))
        # Q2 gross 300
        self.assertEqual(Decimal(by_period['2026-Q2']['gross']), Decimal('300.00'))
        self.assertEqual(Decimal(by_period['2026-Q3']['gross']), Decimal('0.00'))
        self.assertEqual(Decimal(by_period['2026-Q4']['gross']), Decimal('0.00'))

    def test_annual_single_bucket(self):
        res = self._get(granularity='annual', year=2026)
        self.assertEqual(len(res.data['series']), 1)
        self.assertEqual(res.data['series'][0]['period'], '2026')
        self.assertEqual(Decimal(res.data['series'][0]['gross']), Decimal('650.00'))

    def test_year_filter_isolates_2025_and_2026(self):
        res = self._get(granularity='annual', year=2025)
        self.assertEqual(Decimal(res.data['totals']['gross']), Decimal('7.00'))

        res26 = self._get(granularity='annual', year=2026)
        self.assertEqual(Decimal(res26.data['totals']['gross']), Decimal('650.00'))

    def test_invalid_granularity_returns_400(self):
        res = self._get(granularity='hourly', year=2026)
        self.assertEqual(res.status_code, 400)

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(self.client_user)
        res = self._get(granularity='monthly', year=2026)
        self.assertEqual(res.status_code, 403)


class RevenueByTrainerTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username='admin_t', password='p',
            role=User.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        cls.client_user = User.objects.create_user(
            username='client_t', password='p', role=User.Role.CLIENT,
        )
        cls.t1 = User.objects.create_user(
            username='trainer_top', password='p', first_name='Top', last_name='Earner',
            role=User.Role.TRAINER,
        )
        cls.t2 = User.objects.create_user(
            username='trainer_mid', password='p', first_name='Mid', last_name='Tier',
            role=User.Role.TRAINER,
        )

        tz = timezone.get_current_timezone()
        def dt(*a):
            return timezone.make_aware(datetime(*a), tz)

        _make_payment(cls.client_user, cls.t1, '500.00', Payment.Status.COMPLETED, dt(2026, 2, 5))
        _make_payment(cls.client_user, cls.t1, '500.00', Payment.Status.COMPLETED, dt(2026, 3, 5))
        _make_payment(cls.client_user, cls.t2, '300.00', Payment.Status.COMPLETED, dt(2026, 2, 10))
        _make_payment(cls.client_user, cls.t1, '100.00', Payment.Status.REFUNDED,
                      dt(2026, 1, 1), refunded_at=dt(2026, 3, 15))

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def test_per_trainer_aggregation_sorted_by_net_desc(self):
        res = self.client.get(
            reverse('admin-reports-revenue-by-trainer'),
            {'from': '2026-01-01', 'to': '2026-12-31'},
        )
        self.assertEqual(res.status_code, 200)
        rows = res.data['results']
        self.assertEqual(rows[0]['trainer_name'], 'Top Earner')
        self.assertEqual(Decimal(rows[0]['gross']), Decimal('1000.00'))
        self.assertEqual(Decimal(rows[0]['refunds']), Decimal('100.00'))
        self.assertEqual(Decimal(rows[0]['net']), Decimal('900.00'))
        self.assertEqual(rows[1]['trainer_name'], 'Mid Tier')
        self.assertEqual(Decimal(rows[1]['net']), Decimal('300.00'))

    def test_invalid_date_returns_400(self):
        res = self.client.get(
            reverse('admin-reports-revenue-by-trainer'),
            {'from': 'not-a-date', 'to': '2026-12-31'},
        )
        self.assertEqual(res.status_code, 400)


class RevenueCSVTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user(
            username='admin_csv', password='p',
            role=User.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        client_user = User.objects.create_user(
            username='client_csv', password='p', role=User.Role.CLIENT,
        )
        trainer = User.objects.create_user(
            username='trainer_csv', password='p', role=User.Role.TRAINER,
        )
        tz = timezone.get_current_timezone()
        _make_payment(client_user, trainer, '12.34', Payment.Status.COMPLETED,
                      timezone.make_aware(datetime(2026, 1, 5, 12), tz))

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def test_csv_headers_and_rows(self):
        res = self.client.get(
            reverse('admin-reports-revenue-csv'),
            {'granularity': 'monthly', 'year': 2026},
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res['Content-Type'].startswith('text/csv'))
        self.assertIn('attachment', res['Content-Disposition'])
        body = res.content.decode('utf-8').splitlines()
        self.assertEqual(body[0], 'period,gross,refunds,net,transactions')
        # 12 monthly rows + header + TOTAL
        self.assertEqual(len(body), 14)
        self.assertTrue(body[-1].startswith('TOTAL,'))
        # Jan row contains 12.34
        self.assertIn('2026-01,12.34', body[1])
