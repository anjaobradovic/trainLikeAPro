"""Aggregation helpers for the admin financial reports.

Bucketing rules (per spec):
  - Gross: sum of payments where status == COMPLETED, bucketed by created_at.
  - Refunds: sum of payments where status == REFUNDED, bucketed by refunded_at.
  - Net = gross - refunds.
"""
import csv
from datetime import date, datetime, time
from decimal import Decimal
from io import StringIO

from django.db.models import Count, DecimalField, Sum, Value
from django.db.models.functions import (
    Coalesce, TruncMonth, TruncQuarter, TruncYear,
)
from django.utils import timezone

from .models import Payment

ZERO = Decimal('0.00')

GRANULARITY_MONTHLY = 'monthly'
GRANULARITY_QUARTERLY = 'quarterly'
GRANULARITY_ANNUAL = 'annual'
GRANULARITIES = {GRANULARITY_MONTHLY, GRANULARITY_QUARTERLY, GRANULARITY_ANNUAL}

_TRUNC = {
    GRANULARITY_MONTHLY: TruncMonth,
    GRANULARITY_QUARTERLY: TruncQuarter,
    GRANULARITY_ANNUAL: TruncYear,
}


def _bucket_label(d, granularity):
    if granularity == GRANULARITY_MONTHLY:
        return f"{d.year:04d}-{d.month:02d}"
    if granularity == GRANULARITY_QUARTERLY:
        q = (d.month - 1) // 3 + 1
        return f"{d.year:04d}-Q{q}"
    return f"{d.year:04d}"


def _empty_series(year, granularity):
    if granularity == GRANULARITY_MONTHLY:
        return [
            {'period': f"{year:04d}-{m:02d}", 'gross': ZERO, 'refunds': ZERO, 'net': ZERO, 'transactions': 0}
            for m in range(1, 13)
        ]
    if granularity == GRANULARITY_QUARTERLY:
        return [
            {'period': f"{year:04d}-Q{q}", 'gross': ZERO, 'refunds': ZERO, 'net': ZERO, 'transactions': 0}
            for q in range(1, 5)
        ]
    return [{'period': f"{year:04d}", 'gross': ZERO, 'refunds': ZERO, 'net': ZERO, 'transactions': 0}]


def _year_window(year):
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime(year, 1, 1, 0, 0, 0), tz)
    end = timezone.make_aware(datetime(year + 1, 1, 1, 0, 0, 0), tz)
    return start, end


def revenue_series(year, granularity):
    """Build the periodic series + totals for a year at a given granularity."""
    if granularity not in GRANULARITIES:
        raise ValueError(f"Unsupported granularity: {granularity}")
    trunc = _TRUNC[granularity]
    start, end = _year_window(year)

    gross_qs = (
        Payment.objects
        .filter(status=Payment.Status.COMPLETED, created_at__gte=start, created_at__lt=end)
        .annotate(bucket=trunc('created_at'))
        .values('bucket')
        .annotate(
            amount=Coalesce(Sum('amount'), Value(ZERO), output_field=DecimalField(max_digits=14, decimal_places=2)),
            count=Count('id'),
        )
    )
    refund_qs = (
        Payment.objects
        .filter(status=Payment.Status.REFUNDED, refunded_at__gte=start, refunded_at__lt=end)
        .annotate(bucket=trunc('refunded_at'))
        .values('bucket')
        .annotate(
            amount=Coalesce(Sum('amount'), Value(ZERO), output_field=DecimalField(max_digits=14, decimal_places=2)),
        )
    )

    series = _empty_series(year, granularity)
    by_period = {row['period']: row for row in series}

    for row in gross_qs:
        label = _bucket_label(row['bucket'], granularity)
        target = by_period.get(label)
        if target is None:
            continue
        target['gross'] = row['amount']
        target['transactions'] = row['count']

    for row in refund_qs:
        label = _bucket_label(row['bucket'], granularity)
        target = by_period.get(label)
        if target is None:
            continue
        target['refunds'] = row['amount']

    for row in series:
        row['net'] = row['gross'] - row['refunds']

    totals = {
        'gross': sum((r['gross'] for r in series), ZERO),
        'refunds': sum((r['refunds'] for r in series), ZERO),
        'net': sum((r['net'] for r in series), ZERO),
        'transactions': sum(r['transactions'] for r in series),
    }
    return series, totals


def trainer_breakdown(date_from, date_to):
    """Per-trainer aggregation between two dates (inclusive on both ends)."""
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(date_from, time.min), tz)
    end = timezone.make_aware(datetime.combine(date_to, time.max), tz)

    gross_rows = (
        Payment.objects
        .filter(status=Payment.Status.COMPLETED, created_at__gte=start, created_at__lte=end)
        .values('trainer_id', 'trainer__first_name', 'trainer__last_name', 'trainer__username')
        .annotate(
            gross=Coalesce(Sum('amount'), Value(ZERO), output_field=DecimalField(max_digits=14, decimal_places=2)),
            transactions=Count('id'),
        )
    )
    refund_rows = (
        Payment.objects
        .filter(status=Payment.Status.REFUNDED, refunded_at__gte=start, refunded_at__lte=end)
        .values('trainer_id')
        .annotate(
            refunds=Coalesce(Sum('amount'), Value(ZERO), output_field=DecimalField(max_digits=14, decimal_places=2)),
        )
    )

    refunds_by_trainer = {r['trainer_id']: r['refunds'] for r in refund_rows}

    rows = []
    seen = set()
    for r in gross_rows:
        tid = r['trainer_id']
        seen.add(tid)
        full = f"{r['trainer__first_name'] or ''} {r['trainer__last_name'] or ''}".strip() or r['trainer__username']
        gross = r['gross']
        refunds = refunds_by_trainer.get(tid, ZERO)
        rows.append({
            'trainer_id': tid,
            'trainer_name': full,
            'gross': gross,
            'refunds': refunds,
            'net': gross - refunds,
            'transactions': r['transactions'],
        })

    # Trainers with refunds but no gross in window still need a row.
    for tid, refunds in refunds_by_trainer.items():
        if tid in seen:
            continue
        from users.models import User
        try:
            u = User.objects.get(pk=tid)
            full = u.get_full_name() or u.username
        except User.DoesNotExist:
            full = f"Trainer #{tid}"
        rows.append({
            'trainer_id': tid,
            'trainer_name': full,
            'gross': ZERO,
            'refunds': refunds,
            'net': -refunds,
            'transactions': 0,
        })

    rows.sort(key=lambda r: r['net'], reverse=True)
    return rows


def revenue_csv(year, granularity):
    series, totals = revenue_series(year, granularity)
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(['period', 'gross', 'refunds', 'net', 'transactions'])
    for r in series:
        writer.writerow([r['period'], f"{r['gross']:.2f}", f"{r['refunds']:.2f}", f"{r['net']:.2f}", r['transactions']])
    writer.writerow([
        'TOTAL',
        f"{totals['gross']:.2f}", f"{totals['refunds']:.2f}", f"{totals['net']:.2f}", totals['transactions'],
    ])
    return buf.getvalue()


def parse_date(value, default=None):
    if not value:
        return default
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None
