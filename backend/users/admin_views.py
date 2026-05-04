from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import TrainerProfile
from .permissions import IsAdmin
from .serializers import (
    TrainerListSerializer,
    TrainerDetailSerializer,
    TrainerRejectSerializer,
)


class AdminTrainerPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminTrainerViewSet(mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          mixins.DestroyModelMixin,
                          viewsets.GenericViewSet):
    permission_classes = [IsAdmin]
    pagination_class = AdminTrainerPagination

    def get_queryset(self):
        qs = TrainerProfile.objects.select_related('user').all()

        include_deleted = self.request.query_params.get('include_deleted', '').lower() == 'true'
        if not include_deleted:
            qs = qs.filter(is_deleted=False)

        status_param = (self.request.query_params.get('status') or 'ALL').upper()
        valid_statuses = {s.value for s in TrainerProfile.Status}
        if status_param != 'ALL' and status_param in valid_statuses:
            qs = qs.filter(status=status_param)

        sort = (self.request.query_params.get('sort') or 'name').lower()
        if sort == 'rating':
            qs = qs.order_by('-average_rating', 'user__last_name', 'user__first_name')
        else:
            qs = qs.order_by('user__last_name', 'user__first_name', 'user__username')

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return TrainerListSerializer
        return TrainerDetailSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        trainer = self.get_object()
        if trainer.is_deleted:
            return Response(
                {'detail': 'Cannot approve a removed trainer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        trainer.status = TrainerProfile.Status.APPROVED
        trainer.rejection_reason = ''
        trainer.save(update_fields=['status', 'rejection_reason'])
        return Response(TrainerDetailSerializer(trainer).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        trainer = self.get_object()
        if trainer.is_deleted:
            return Response(
                {'detail': 'Cannot reject a removed trainer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = TrainerRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trainer.status = TrainerProfile.Status.REJECTED
        trainer.rejection_reason = serializer.validated_data['reason']
        trainer.save(update_fields=['status', 'rejection_reason'])
        return Response(TrainerDetailSerializer(trainer).data)

    def destroy(self, request, *args, **kwargs):
        trainer = self.get_object()
        trainer.is_deleted = True
        trainer.status = TrainerProfile.Status.REMOVED
        trainer.save(update_fields=['is_deleted', 'status'])
        return Response(status=status.HTTP_204_NO_CONTENT)
