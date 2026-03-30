from rest_framework import serializers
from .models import Email


class EmailSerializer(serializers.ModelSerializer):

    destinataire_nom = serializers.CharField(source='destinataire.nom', read_only=True)
    ticket_numero    = serializers.CharField(source='ticket.numero_ticket', read_only=True)

    class Meta:
        model  = Email
        fields = [
            'id', 'destinataire', 'destinataire_nom',
            'destinataire_email', 'type_email',
            'sujet', 'statut', 'tentatives',
            'ticket', 'ticket_numero',
            'erreur', 'envoye_a', 'created_at',
        ]