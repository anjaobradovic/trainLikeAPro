from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.permissions import IsAdmin
from .models import Equipment, Accessory, TrainingGoal
from .serializers import EquipmentSerializer, AccessorySerializer, TrainingGoalSerializer


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
        if instance.is_deleted:
            return
        instance.is_deleted = True
        update_fields = ['is_deleted']
        field_names = {f.name for f in instance._meta.get_fields()}
        if 'updated_at' in field_names:
            update_fields.append('updated_at')
        instance.save(update_fields=update_fields)

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


class AdminTrainingGoalViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [IsAdmin]
    queryset = TrainingGoal.objects.all()
    serializer_class = TrainingGoalSerializer

    def get_queryset(self):
        qs = self.filter_soft_deleted(self.queryset.all())
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    @action(detail=True, methods=['patch'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        try:
            goal = TrainingGoal.objects.get(pk=pk)
        except TrainingGoal.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if goal.is_deleted:
            return Response(
                {'detail': 'Cannot toggle a deleted goal.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        goal.is_active = not goal.is_active
        goal.save(update_fields=['is_active'])
        return Response(self.get_serializer(goal).data)


class PublicTrainingGoalViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TrainingGoalSerializer

    def get_queryset(self):
        return TrainingGoal.objects.filter(is_deleted=False, is_active=True)
