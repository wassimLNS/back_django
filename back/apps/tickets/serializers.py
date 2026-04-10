from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import Ticket, TypeService, PieceJointe, Escalade, StatutTicket
from apps.centres.models import ParametresCentre


class TypeServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TypeService
        fields = ['id', 'code', 'libelle', 'description', 'priorite_defaut', 'actif']


class PieceJointeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PieceJointe
        fields = ['id', 'nom_fichier', 'type_mime', 'taille_octets', 'created_at']


class PieceJointeUploadSerializer(serializers.ModelSerializer):
    fichier = serializers.FileField(write_only=True)

    class Meta:
        model  = PieceJointe
        fields = ['id', 'fichier', 'nom_fichier', 'type_mime', 'taille_octets', 'created_at']
        read_only_fields = ['id', 'nom_fichier', 'type_mime', 'taille_octets', 'created_at']

    def create(self, validated_data):
        fichier = validated_data.pop('fichier')
        piece = PieceJointe(
            nom_fichier=fichier.name,
            type_mime=fichier.content_type,
            taille_octets=fichier.size,
            contenu=fichier.read(),
            **validated_data
        )
        piece.save()
        return piece


class CreerTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Ticket
        fields = ['type_service', 'titre', 'description']

    def create(self, validated_data):
        client = self.context['request'].user

        # Récupérer directement le centre du client
        centre = client.centre
        if not centre:
            raise serializers.ValidationError(
                "Vous n'êtes rattaché à aucun centre."
            )

        priorite_map = {1: 'basse', 2: 'normale', 3: 'haute', 4: 'critique'}
        priorite = priorite_map.get(validated_data['type_service'].priorite_defaut, 'normale')

        ticket = Ticket.objects.create(client=client, centre=centre, priorite=priorite, **validated_data)

        try:
            params = ParametresCentre.objects.get(centre=centre)
            sla_map = {'normale': params.sla_heures_normale, 'haute': params.sla_heures_haute, 'critique': params.sla_heures_critique, 'basse': 72}
            heures = sla_map.get(priorite, 48)
            ticket.echeance_sla = timezone.now() + timedelta(hours=heures)
            ticket.save()
        except ParametresCentre.DoesNotExist:
            pass

        self._attribuer_automatiquement(ticket, centre)
        return ticket

    def _attribuer_automatiquement(self, ticket, centre):
        from apps.users.models import Utilisateur, Role
        try:
            params = ParametresCentre.objects.get(centre=centre)
            if not params.attribution_auto_active:
                return
        except ParametresCentre.DoesNotExist:
            pass

        agents = Utilisateur.objects.filter(centre=centre, role=Role.AGENT, actif=True)
        if not agents.exists():
            return

        agent_min = min(agents, key=lambda a: a.tickets_agent.filter(statut__in=['ouvert', 'en_cours']).count())
        ticket.agent = agent_min
        # On garde le statut initial (SOUMIS) pour laisser au client le temps d'annuler s'il le souhaite
        ticket.attribution_auto = True
        ticket.save()


class TicketListSerializer(serializers.ModelSerializer):
    type_service_libelle = serializers.CharField(source='type_service.libelle', read_only=True)
    client_nom    = serializers.CharField(source='client.nom', read_only=True)
    client_prenom = serializers.CharField(source='client.prenom', read_only=True)
    agent_nom     = serializers.CharField(source='agent.nom', read_only=True)
    agent_prenom  = serializers.CharField(source='agent.prenom', read_only=True)
    centre_nom    = serializers.CharField(source='centre.nom', read_only=True)
    nombre_messages = serializers.SerializerMethodField()

    class Meta:
        model  = Ticket
        fields = ['id', 'numero_ticket', 'titre', 'statut', 'priorite', 'type_service_libelle', 'client_nom', 'client_prenom', 'agent_nom', 'agent_prenom', 'centre_nom', 'nombre_messages', 'created_at', 'echeance_sla']

    def get_nombre_messages(self, obj):
        return obj.messages.count()


class TicketDetailSerializer(serializers.ModelSerializer):
    type_service   = TypeServiceSerializer(read_only=True)
    pieces_jointes = PieceJointeSerializer(many=True, read_only=True)
    centre_nom     = serializers.CharField(source='centre.nom', read_only=True)
    client_nom     = serializers.CharField(source='client.nom', read_only=True)
    client_prenom  = serializers.CharField(source='client.prenom', read_only=True)
    client_tel     = serializers.CharField(source='client.telephone', read_only=True)
    agent_nom      = serializers.CharField(source='agent.nom', read_only=True)
    agent_prenom   = serializers.CharField(source='agent.prenom', read_only=True)

    class Meta:
        model  = Ticket
        fields = ['id', 'numero_ticket', 'titre', 'description', 'statut', 'priorite', 'type_service', 'client_nom', 'client_prenom', 'client_tel', 'agent_nom', 'agent_prenom', 'centre_nom', 'attribution_auto', 'resolution', 'satisfaction_client', 'commentaire_satisfaction', 'pieces_jointes', 'created_at', 'updated_at', 'pris_en_charge_a', 'resolu_a', 'ferme_a', 'echeance_sla']


class MettreAJourTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Ticket
        fields = ['statut', 'resolution', 'priorite']

    def validate_statut(self, value):
        ticket = self.instance
        transitions = {'ouvert': ['en_cours', 'rejete'], 'en_cours': ['resolu', 'escalade_technique', 'escalade_annexe', 'rejete'], 'escalade_technique': ['resolu', 'ferme'], 'escalade_annexe': ['resolu', 'ferme'], 'resolu': ['ferme']}
        autorises = transitions.get(ticket.statut, [])
        if value not in autorises:
            raise serializers.ValidationError(f"Transition invalide : {ticket.statut} → {value}")
        return value

    def update(self, instance, validated_data):
        nouveau_statut = validated_data.get('statut', instance.statut)
        if nouveau_statut == 'resolu' and instance.statut != 'resolu':
            instance.resolu_a = timezone.now()
        if nouveau_statut == 'ferme' and instance.statut != 'ferme':
            instance.ferme_a = timezone.now()
        return super().update(instance, validated_data)


class SatisfactionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Ticket
        fields = ['satisfaction_client', 'commentaire_satisfaction']

    def validate_satisfaction_client(self, value):
        if value not in range(1, 6):
            raise serializers.ValidationError("La satisfaction doit être entre 1 et 5.")
        return value


class EscaladeSerializer(serializers.ModelSerializer):
    agent_source_nom = serializers.CharField(source='agent_source.nom', read_only=True)
    agent_cible_nom  = serializers.CharField(source='agent_cible.nom', read_only=True)

    class Meta:
        model  = Escalade
        fields = ['id', 'ticket', 'type_escalade', 'agent_source', 'agent_source_nom', 'agent_cible', 'agent_cible_nom', 'motif', 'resume_ia', 'created_at', 'pris_en_charge_a', 'resolu_a']
        read_only_fields = ['id', 'ticket', 'agent_source', 'created_at']


class CreerEscaladeSerializer(serializers.Serializer):
    type_escalade = serializers.ChoiceField(choices=['technique', 'annexe'])
    motif         = serializers.CharField()

    def create(self, validated_data):
        ticket       = self.context['ticket']
        agent_source = self.context['request'].user
        if validated_data['type_escalade'] == 'technique':
            ticket.statut = StatutTicket.ESCALADE_TECHNIQUE
        else:
            ticket.statut = StatutTicket.ESCALADE_ANNEXE
        ticket.save()
        return Escalade.objects.create(ticket=ticket, agent_source=agent_source, **validated_data)