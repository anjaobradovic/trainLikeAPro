from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import TrainerProfile, User
from .permissions import IsAdmin
from .serializers import (
    AdminCreateTrainerSerializer,
    AdminUserSerializer,
    TrainerListSerializer,
    TrainerDetailSerializer,
    TrainerRejectSerializer,
    UserSerializer,
)


class AdminTrainerPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminTrainerViewSet(mixins.CreateModelMixin,
                          mixins.ListModelMixin,
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
        if self.action == 'create':
            return AdminCreateTrainerSerializer
        return TrainerDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Return the full trainer-detail shape so the frontend can refresh in place.
        profile = user.trainer_profile
        return Response(
            TrainerDetailSerializer(profile).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        from django.utils import timezone
        trainer = self.get_object()
        if trainer.is_deleted:
            return Response(
                {'detail': 'Cannot approve a removed trainer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        trainer.status = TrainerProfile.Status.APPROVED
        trainer.rejection_reason = ''
        trainer.approved_at = timezone.now()
        trainer.save(update_fields=['status', 'rejection_reason', 'approved_at'])
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


class AdminUserViewSet(mixins.ListModelMixin,
                       mixins.RetrieveModelMixin,
                       mixins.DestroyModelMixin,
                       viewsets.GenericViewSet):
    permission_classes = [IsAdmin]
    serializer_class = AdminUserSerializer
    pagination_class = AdminTrainerPagination

    def destroy(self, request, *args, **kwargs):
        """Logical delete: flip is_deleted + is_active. Self-delete is forbidden."""
        target = self.get_object()
        if target.pk == request.user.pk:
            return Response(
                {'detail': "You can't delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target.is_deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        target.is_deleted = True
        target.is_active = False
        target.save(update_fields=['is_deleted', 'is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_queryset(self):
        qs = User.objects.all()

        include_deleted = self.request.query_params.get('include_deleted', '').lower() == 'true'
        if not include_deleted:
            qs = qs.filter(is_deleted=False)

        role = (self.request.query_params.get('role') or '').lower()
        valid = {r.value for r in User.Role}
        if role and role in valid:
            qs = qs.filter(role=role)

        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        return qs.order_by('username')
