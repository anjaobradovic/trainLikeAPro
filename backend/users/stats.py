"""Admin dashboard stats: overview, signup time-series, recent activity."""
from datetime import date, datetime, time, timedelta

from django.db.models import Count, Min
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import TrainerProfile, User
from .permissions import IsAdmin

# Avoid circular import at module load: payments imports nothing from users at top level.
# We import Payment lazily inside functions to keep this module light.

VALID_PERIODS = {'7d', '30d', '90d', 'ytd'}


def _resolve_window(period):
    """Return (start, end, prev_start, prev_end) — all timezone-aware datetimes.

    end is exclusive (strictly < end).
    """
    tz = timezone.get_current_timezone()
    today = timezone.localdate()
    end = timezone.make_aware(datetime.combine(today + timedelta(days=1), time.min), tz)

    if period == 'ytd':
        start_d = today.replace(month=1, day=1)
        days_so_far = (today - start_d).days + 1
        start = timezone.make_aware(datetime.combine(start_d, time.min), tz)
        prev_start_d = start_d.replace(year=start_d.year - 1)
        prev_end_d = prev_start_d + timedelta(days=days_so_far)
        prev_start = timezone.make_aware(datetime.combine(prev_start_d, time.min), tz)
        prev_end = timezone.make_aware(datetime.combine(prev_end_d, time.min), tz)
        return start, end, prev_start, prev_end

    days = int(period.rstrip('d'))
    start = end - timedelta(days=days)
    prev_end = start
    prev_start = prev_end - timedelta(days=days)
    return start, end, prev_start, prev_end


def _delta_pct(current, previous):
    """Percent change vs previous, or None when previous is zero."""
    if previous == 0:
        return None
    return round(((current - previous) / previous) * 100, 1)


# -------------------------------------------------------- overview --

def _count_users_joined(role, start, end):
    return User.objects.filter(
        role=role, is_deleted=False,
        date_joined__gte=start, date_joined__lt=end,
    ).count()


def _renewals_qs(start, end):
    """Payments in the window made by clients with a previous COMPLETED payment.

    "Previous" = a COMPLETED payment with created_at < the renewal payment's
    created_at. Implemented as: clients whose first COMPLETED payment is before
    `start`, AND who have at least one COMPLETED payment in [start, end).
    Plus: clients whose first COMPLETED is inside the window but who have an
    earlier-still COMPLETED payment in the same window count too — covered by
    the per-payment check below.
    """
    from payments.models import Payment

    # Earliest COMPLETED payment per client.
    first_dates = dict(
        Payment.objects
        .filter(status=Payment.Status.COMPLETED)
        .values_list('client_id')
        .annotate(first=Min('created_at'))
        .values_list('client_id', 'first')
    )
    in_window = (
        Payment.objects
        .filter(status=Payment.Status.COMPLETED, created_at__gte=start, created_at__lt=end)
        .values('client_id', 'created_at')
    )
    return [p for p in in_window if first_dates.get(p['client_id']) is not None
            and first_dates[p['client_id']] < p['created_at']]


def _count_renewals(start, end):
    return len(_renewals_qs(start, end))


def _count_active_clients(start, end):
    """Clients with at least one COMPLETED payment in the window."""
    from payments.models import Payment
    return (
        Payment.objects
        .filter(status=Payment.Status.COMPLETED, created_at__gte=start, created_at__lt=end)
        .values('client_id').distinct().count()
    )


@api_view(['GET'])
@permission_classes([IsAdmin])
def overview(request):
    period = (request.query_params.get('period') or '30d').lower()
    if period not in VALID_PERIODS:
        return Response({'detail': 'Invalid period.'}, status=400)
    start, end, prev_start, prev_end = _resolve_window(period)

    nc = _count_users_joined(User.Role.CLIENT, start, end)
    nc_prev = _count_users_joined(User.Role.CLIENT, prev_start, prev_end)
    nt = _count_users_joined(User.Role.TRAINER, start, end)
    nt_prev = _count_users_joined(User.Role.TRAINER, prev_start, prev_end)

    renewals = _count_renewals(start, end)
    renewals_prev = _count_renewals(prev_start, prev_end)

    active = _count_active_clients(start, end)
    active_prev = _count_active_clients(prev_start, prev_end)

    pending = TrainerProfile.objects.filter(
        status=TrainerProfile.Status.PENDING, is_deleted=False,
    ).count()

    return Response({
        'period': period,
        'window': {'start': start.isoformat(), 'end': end.isoformat()},
        'new_clients': {'count': nc, 'delta_pct': _delta_pct(nc, nc_prev)},
        'new_trainers': {'count': nt, 'delta_pct': _delta_pct(nt, nt_prev)},
        'membership_renewals': {'count': renewals, 'delta_pct': _delta_pct(renewals, renewals_prev)},
        'active_clients': {'count': active, 'delta_pct': _delta_pct(active, active_prev)},
        'pending_trainer_approvals': pending,
    })


# ------------------------------------------------------ timeseries --

@api_view(['GET'])
@permission_classes([IsAdmin])
def signups_timeseries(request):
    period = (request.query_params.get('period') or '30d').lower()
    role_param = (request.query_params.get('role') or 'CLIENT').upper()
    role_map = {'CLIENT': User.Role.CLIENT, 'TRAINER': User.Role.TRAINER}
    if period not in VALID_PERIODS:
        return Response({'detail': 'Invalid period.'}, status=400)
    if role_param not in role_map:
        return Response({'detail': 'Invalid role.'}, status=400)

    start, end, *_ = _resolve_window(period)

    rows = (
        User.objects
        .filter(role=role_map[role_param], is_deleted=False,
                date_joined__gte=start, date_joined__lt=end)
        .annotate(day=TruncDate('date_joined'))
        .values('day')
        .annotate(count=Count('id'))
    )
    by_day = {r['day']: r['count'] for r in rows}

    series = []
    cursor = start.date()
    last = end.date()
    while cursor < last:
        series.append({'date': cursor.isoformat(), 'count': by_day.get(cursor, 0)})
        cursor += timedelta(days=1)

    return Response({'period': period, 'role': role_param, 'series': series})


# -------------------------------------------------- recent activity --

@api_view(['GET'])
@permission_classes([IsAdmin])
def recent_activity(request):
    try:
        limit = max(1, min(int(request.query_params.get('limit', 10)), 100))
    except (TypeError, ValueError):
        return Response({'detail': 'Invalid limit.'}, status=400)
    from payments.models import Payment

    events = []

    for u in (User.objects.filter(role=User.Role.CLIENT, is_deleted=False)
              .order_by('-date_joined')[:limit]):
        events.append({
            'type': 'new_client',
            'timestamp': u.date_joined.isoformat(),
            'message': f"{u.get_full_name() or u.username} joined as a client",
            'user_id': u.id,
        })

    for u in (User.objects.filter(role=User.Role.TRAINER, is_deleted=False)
              .order_by('-date_joined')[:limit]):
        events.append({
            'type': 'new_trainer',
            'timestamp': u.date_joined.isoformat(),
            'message': f"{u.get_full_name() or u.username} registered as a trainer",
            'user_id': u.id,
        })

    for p in (TrainerProfile.objects
              .filter(approved_at__isnull=False, is_deleted=False)
              .select_related('user')
              .order_by('-approved_at')[:limit]):
        events.append({
            'type': 'trainer_approved',
            'timestamp': p.approved_at.isoformat(),
            'message': f"{p.user.get_full_name() or p.user.username} was approved as a trainer",
            'user_id': p.user_id,
        })

    for pay in (Payment.objects
                .filter(status=Payment.Status.REFUNDED, refunded_at__isnull=False)
                .select_related('client', 'trainer')
                .order_by('-refunded_at')[:limit]):
        client = pay.client
        events.append({
            'type': 'refund',
            'timestamp': pay.refunded_at.isoformat(),
            'message': (f"Refund of {pay.amount} EUR to "
                        f"{client.get_full_name() or client.username}"),
            'amount': str(pay.amount),
            'payment_id': pay.id,
        })

    events.sort(key=lambda e: e['timestamp'], reverse=True)
    return Response({'events': events[:limit]})
