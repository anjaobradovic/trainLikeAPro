from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ('id', 'sender', 'content', 'created_at', 'read_at', 'is_mine')
        read_only_fields = ('id', 'sender', 'created_at', 'read_at', 'is_mine')

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return bool(request and request.user.is_authenticated and obj.sender_id == request.user.id)


class PartnerSerializer(serializers.Serializer):
    """Represents the other participant in a conversation."""
    conversation_id = serializers.IntegerField()
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    role = serializers.CharField()
    last_message = serializers.CharField(allow_null=True, allow_blank=True)
    last_message_at = serializers.DateTimeField(allow_null=True)
    unread_count = serializers.IntegerField()
