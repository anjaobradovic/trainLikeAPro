from rest_framework import viewsets, mixins, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsAdmin
from .models import Equipment, Accessory
from .serializers import EquipmentSerializer, AccessorySerializer


class SoftDeleteMixin:
    """DELETE flips is_deleted=True instead of removing the row.

    Pair with a queryset that filters out soft-deleted rows by default and a
    `?include_deleted=true` query param to opt in to seeing them.
    """

    def filter_soft_deleted(self, qs):
        include_deleted = self.request.query_params.get('include_deleted', '').lower() == 'true'
        if not include_deleted:
            qs = qs.filter(is_deleted=False)
        return qs

    def perform_soft_delete(self, instance):
        if not instance.is_deleted:
            instance.is_deleted = True
            instance.save(update_fields=['is_deleted', 'updated_at'])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_soft_delete(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class _AdminCatalogViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_param = 'search'

    def get_queryset(self):
        qs = self.queryset.all()
        qs = self.filter_soft_deleted(qs)
        search = self.request.query_params.get(self.search_param)
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class AdminEquipmentViewSet(_AdminCatalogViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer


class AdminAccessoryViewSet(_AdminCatalogViewSet):
    queryset = Accessory.objects.all()
    serializer_class = AccessorySerializer


class _PublicCatalogViewSet(mixins.ListModelMixin,
                            mixins.RetrieveModelMixin,
                            viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(is_deleted=False)


class PublicEquipmentViewSet(_PublicCatalogViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer


class PublicAccessoryViewSet(_PublicCatalogViewSet):
    queryset = Accessory.objects.all()
    serializer_class = AccessorySerializer
