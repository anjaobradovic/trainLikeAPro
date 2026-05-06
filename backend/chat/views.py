from datetime import datetime, timezone as dt_timezone

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import ClientProfile, User

from .models import Conversation, Message
from .serializers import MessageSerializer, PartnerSerializer


def _get_or_create_conversation(trainer, client):
    convo, _ = Conversation.objects.get_or_create(trainer=trainer, client=client)
    return convo


def _allowed_partner(me, other):
    """Trainer may chat only with their assigned clients; client only with their trainer."""
    if me.role == User.Role.TRAINER and other.role == User.Role.CLIENT:
        return ClientProfile.objects.filter(user=other, trainer=me).exists()
    if me.role == User.Role.CLIENT and other.role == User.Role.TRAINER:
        return ClientProfile.objects.filter(user=me, trainer=other).exists()
    return False


def _build_partner(convo, partner, me):
    last = convo.messages.order_by('-created_at').first()
    unread = convo.messages.filter(read_at__isnull=True).exclude(sender=me).count()
    return {
        'conversation_id': convo.id,
        'user_id': partner.id,
        'username': partner.username,
        'first_name': partner.first_name or '',
        'last_name': partner.last_name or '',
        'role': partner.role,
        'last_message': last.content if last else None,
        'last_message_at': last.created_at if last else None,
        'unread_count': unread,
    }


class ConversationListView(APIView):
    """List chat partners for the authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        partners = []

        if user.role == User.Role.TRAINER:
            client_users = User.objects.filter(client_profile__trainer=user, is_deleted=False)
            for client in client_users:
                convo = _get_or_create_conversation(trainer=user, client=client)
                partners.append(_build_partner(convo, client, user))
        elif user.role == User.Role.CLIENT:
            profile = getattr(user, 'client_profile', None)
            if profile and profile.trainer and not profile.trainer.is_deleted:
                trainer = profile.trainer
                convo = _get_or_create_conversation(trainer=trainer, client=user)
                partners.append(_build_partner(convo, trainer, user))
        else:
            return Response({'detail': 'Chat is only available for trainers and clients.'}, status=403)

        partners.sort(key=lambda p: p['last_message_at'] or datetime.min.replace(tzinfo=dt_timezone.utc), reverse=True)
        return Response(PartnerSerializer(partners, many=True).data)


class MessageListCreateView(APIView):
    """List or send messages in a single conversation."""
    permission_classes = [IsAuthenticated]

    def _get_conversation(self, request, conversation_id):
        convo = get_object_or_404(Conversation, pk=conversation_id)
        if request.user.id not in (convo.trainer_id, convo.client_id):
            return None
        return convo

    def get(self, request, conversation_id):
        convo = self._get_conversation(request, conversation_id)
        if convo is None:
            return Response({'detail': 'Not found.'}, status=404)
        convo.messages.filter(read_at__isnull=True).exclude(sender=request.user).update(
            read_at=timezone.now()
        )
        messages = convo.messages.all()
        return Response(MessageSerializer(messages, many=True, context={'request': request}).data)

    def post(self, request, conversation_id):
        convo = self._get_conversation(request, conversation_id)
        if convo is None:
            return Response({'detail': 'Not found.'}, status=404)
        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'content': 'Message cannot be empty.'}, status=400)
        if len(content) > 2000:
            return Response({'content': 'Message too long (max 2000 chars).'}, status=400)
        msg = Message.objects.create(conversation=convo, sender=request.user, content=content)
        convo.save(update_fields=['updated_at'])
        return Response(
            MessageSerializer(msg, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class StartConversationView(APIView):
    """Create or fetch a conversation with the given user_id."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        other_id = request.data.get('user_id')
        if not other_id:
            return Response({'user_id': 'Required.'}, status=400)
        other = get_object_or_404(User, pk=other_id, is_deleted=False)
        me = request.user
        if not _allowed_partner(me, other):
            return Response({'detail': 'You are not allowed to chat with this user.'}, status=403)
        if me.role == User.Role.TRAINER:
            convo = _get_or_create_conversation(trainer=me, client=other)
        else:
            convo = _get_or_create_conversation(trainer=other, client=me)
        return Response({'conversation_id': convo.id})
