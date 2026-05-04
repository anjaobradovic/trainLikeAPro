from django.urls import path

from .admin_views import revenue_view, revenue_csv_view, revenue_by_trainer_view

urlpatterns = [
    path('reports/revenue/', revenue_view, name='admin-reports-revenue'),
    path('reports/revenue/by-trainer/', revenue_by_trainer_view, name='admin-reports-revenue-by-trainer'),
    path('reports/revenue/export.csv', revenue_csv_view, name='admin-reports-revenue-csv'),
]
