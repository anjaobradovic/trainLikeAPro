from datetime import date

from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from users.permissions import IsAdmin

from .reports import (
    GRANULARITIES, GRANULARITY_MONTHLY,
    parse_date, revenue_csv, revenue_series, trainer_breakdown,
)

CURRENCY = 'EUR'


def _parse_year(raw):
    if not raw:
        return timezone.localdate().year
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _parse_granularity(raw):
    g = (raw or GRANULARITY_MONTHLY).lower()
    return g if g in GRANULARITIES else None


@api_view(['GET'])
@permission_classes([IsAdmin])
def revenue_view(request):
    year = _parse_year(request.query_params.get('year'))
    granularity = _parse_granularity(request.query_params.get('granularity'))
    if year is None:
        return Response({'detail': 'Invalid year.'}, status=400)
    if granularity is None:
        return Response({'detail': 'Invalid granularity.'}, status=400)

    series, totals = revenue_series(year, granularity)
    return Response({
        'granularity': granularity,
        'year': year,
        'currency': CURRENCY,
        'series': [_format_series_row(r) for r in series],
        'totals': _format_totals(totals),
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def revenue_csv_view(request):
    year = _parse_year(request.query_params.get('year'))
    granularity = _parse_granularity(request.query_params.get('granularity'))
    if year is None or granularity is None:
        return Response({'detail': 'Invalid year or granularity.'}, status=400)

    body = revenue_csv(year, granularity)
    filename = f"revenue-{year}-{granularity}.csv"
    response = HttpResponse(body, content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['GET'])
@permission_classes([IsAdmin])
def revenue_by_trainer_view(request):
    today = timezone.localdate()
    default_from = today.replace(month=1, day=1)
    date_from = parse_date(request.query_params.get('from'), default_from)
    date_to = parse_date(request.query_params.get('to'), today)
    if date_from is None or date_to is None:
        return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)
    if date_from > date_to:
        return Response({'detail': '`from` must be on or before `to`.'}, status=400)

    rows = trainer_breakdown(date_from, date_to)
    formatted = [_format_trainer_row(r) for r in rows]

    paginator = PageNumberPagination()
    paginator.page_size = 20
    paginator.page_size_query_param = 'page_size'
    page = paginator.paginate_queryset(formatted, request)
    response = paginator.get_paginated_response(page)
    response.data['from'] = date_from.isoformat()
    response.data['to'] = date_to.isoformat()
    response.data['currency'] = CURRENCY
    return response


def _format_series_row(r):
    return {
        'period': r['period'],
        'gross': str(r['gross']),
        'refunds': str(r['refunds']),
        'net': str(r['net']),
        'transactions': r['transactions'],
    }


def _format_totals(t):
    return {
        'gross': str(t['gross']),
        'refunds': str(t['refunds']),
        'net': str(t['net']),
        'transactions': t['transactions'],
    }


def _format_trainer_row(r):
    return {
        'trainer_id': r['trainer_id'],
        'trainer_name': r['trainer_name'],
        'gross': str(r['gross']),
        'refunds': str(r['refunds']),
        'net': str(r['net']),
        'transactions': r['transactions'],
    }
