from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from .models import Email, TypeEmail, StatutEmail


def envoyer_email(destinataire, type_email, sujet, contexte, ticket=None):
    """
    Fonction principale pour envoyer un email et le logger en BDD.
    """
    # Générer le corps HTML
    template_map = {
        TypeEmail.STATUT_CHANGE:   'emails/statut_change.html',
        TypeEmail.TICKET_OUVERT:   'emails/ticket_ouvert.html',
        TypeEmail.TICKET_RESOLU:   'emails/ticket_resolu.html',
        TypeEmail.ESCALADE:        'emails/escalade.html',
        TypeEmail.NOUVEAU_MESSAGE: 'emails/nouveau_message.html',
        TypeEmail.RAPPEL_SLA:      'emails/rappel_sla.html',
    }

    template = template_map.get(type_email)
    if template:
        try:
            corps_html = render_to_string(template, contexte)
        except Exception:
            corps_html = f"<p>{sujet}</p>"
    else:
        corps_html = f"<p>{sujet}</p>"

    # Créer l'entrée en BDD
    email_obj = Email.objects.create(
        destinataire=destinataire,
        destinataire_email=destinataire.email or '',
        type_email=type_email,
        sujet=sujet,
        corps_html=corps_html,
        ticket=ticket,
        statut=StatutEmail.EN_ATTENTE,
    )

    # Envoyer l'email
    if not destinataire.email:
        email_obj.statut    = StatutEmail.ECHEC
        email_obj.erreur    = "Pas d'email pour cet utilisateur"
        email_obj.save()
        return False

    try:
        send_mail(
            subject=sujet,
            message='',
            html_message=corps_html,
            from_email=None,  # utilise DEFAULT_FROM_EMAIL du settings
            recipient_list=[destinataire.email],
            fail_silently=False,
        )
        email_obj.statut   = StatutEmail.ENVOYE
        email_obj.envoye_a = timezone.now()
        email_obj.tentatives += 1
        email_obj.save()
        return True

    except Exception as e:
        email_obj.statut     = StatutEmail.ECHEC
        email_obj.erreur     = str(e)
        email_obj.tentatives += 1
        email_obj.save()
        return False


# ============================================================
# FONCTIONS SPÉCIFIQUES PAR ÉVÉNEMENT
# ============================================================

def notifier_changement_statut(ticket):
    """Envoie un email au client quand le statut de son ticket change"""
    statut_labels = {
        'ouvert':             'Ouvert',
        'en_cours':           'En cours de traitement',
        'escalade_technique': 'Escaladé vers un technicien',
        'escalade_annexe':    'Escaladé vers le service annexe',
        'resolu':             'Résolu',
        'ferme':              'Fermé',
        'rejete':             'Rejeté',
    }

    contexte = {
        'client_prenom': ticket.client.prenom,
        'client_nom':    ticket.client.nom,
        'numero_ticket': ticket.numero_ticket,
        'titre':         ticket.titre,
        'statut':        statut_labels.get(ticket.statut, ticket.statut),
        'date':          timezone.now().strftime('%d/%m/%Y à %H:%M'),
    }

    envoyer_email(
        destinataire=ticket.client,
        type_email=TypeEmail.STATUT_CHANGE,
        sujet=f"[AT] Votre réclamation {ticket.numero_ticket} - Statut mis à jour",
        contexte=contexte,
        ticket=ticket,
    )