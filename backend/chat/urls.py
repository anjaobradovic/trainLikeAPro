from django.urls import path

from .views import ConversationListView, MessageListCreateView, StartConversationView

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='chat-conversations'),
    path('conversations/start/', StartConversationView.as_view(), name='chat-start'),
    path('conversations/<int:conversation_id>/messages/', MessageListCreateView.as_view(), name='chat-messages'),
]
