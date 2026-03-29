from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Message
from .serializers import MessageSerializer, EnvoyerMessageSerializer
from apps.tickets.models import Ticket


def get_expediteur_type(user):
    """Retourne le type d'expéditeur selon le rôle"""
    role_map = {
        'client':          'client',
        'agent':           'agent',
        'agent_technique': 'agent_technique',
        'agent_annexe':    'agent_annexe',
        'admin':           'agent',
    }
    return role_map.get(user.role, 'systeme')


def verifier_acces_ticket(user, ticket):
    """Vérifie si l'utilisateur a accès à la discussion du ticket"""
    if user.role == 'client':
        return ticket.client == user
    elif user.role == 'agent':
        return ticket.agent == user
    elif user.role == 'agent_technique':
        return ticket.agent_technique == user or ticket.statut == 'escalade_technique'
    elif user.role == 'agent_annexe':
        return ticket.agent_annexe == user or ticket.statut == 'escalade_annexe'
    elif user.role == 'admin':
        return ticket.centre == user.centre
    return False


# ============================================================
# MESSAGES D'UN TICKET (API REST)
# ============================================================
class MessagesTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def get_ticket(self, ticket_id):
        try:
            return Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return None

    def get(self, request, ticket_id):
        """Récupérer tous les messages d'un ticket"""
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

        if not verifier_acces_ticket(request.user, ticket):
            return Response({'error': 'Accès refusé'}, status=status.HTTP_403_FORBIDDEN)

        messages = ticket.messages.all().order_by('created_at')

        # Marquer les messages comme lus
        if request.user.role == 'client':
            messages.filter(lu_par_client=False).exclude(
                expediteur_type='client'
            ).update(lu_par_client=True)
        elif request.user.role in ['agent', 'agent_technique', 'agent_annexe']:
            messages.filter(lu_par_agent=False).exclude(
                expediteur_type__in=['agent', 'agent_technique', 'agent_annexe']
            ).update(lu_par_agent=True)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, ticket_id):
        """Envoyer un message dans un ticket"""
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            return Response({'error': 'Ticket introuvable'}, status=status.HTTP_404_NOT_FOUND)

        if not verifier_acces_ticket(request.user, ticket):
            return Response({'error': 'Accès refusé'}, status=status.HTTP_403_FORBIDDEN)

        if ticket.statut in ['ferme', 'rejete']:
            return Response(
                {'error': 'Impossible d\'envoyer un message sur un ticket fermé ou rejeté'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EnvoyerMessageSerializer(data=request.data)
        if serializer.is_valid():
            expediteur_type = get_expediteur_type(request.user)
            message = Message.objects.create(
                ticket=ticket,
                expediteur=request.user,
                expediteur_type=expediteur_type,
                contenu=serializer.validated_data['contenu'],
                lu_par_client=(request.user.role == 'client'),
                lu_par_agent=(request.user.role != 'client'),
            )
            return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================
# MESSAGES NON LUS
# ============================================================
class MessagesNonLusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Nombre de messages non lus pour l'utilisateur connecté"""
        if request.user.role == 'client':
            count = Message.objects.filter(
                ticket__client=request.user,
                lu_par_client=False,
            ).exclude(expediteur_type='client').count()
        else:
            count = Message.objects.filter(
                ticket__agent=request.user,
                lu_par_agent=False,
            ).exclude(expediteur_type__in=['agent', 'agent_technique', 'agent_annexe']).count()

        return Response({'messages_non_lus': count})