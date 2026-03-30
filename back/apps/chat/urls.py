from django.urls import path
from .views import MessagesTicketView, MessagesNonLusView

urlpatterns = [
    # Messages d'un ticket (API REST)
    path('<uuid:ticket_id>/messages/',  MessagesTicketView.as_view(), name='messages-ticket'),

    # Messages non lus
    path('non-lus/',                    MessagesNonLusView.as_view(), name='messages-non-lus'),
]