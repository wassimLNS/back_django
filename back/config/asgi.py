"""
ALGÉRIE TÉLÉCOM — ASGI Config (HTTP + WebSocket)
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.chat.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    # Requêtes HTTP classiques
    'http': get_asgi_application(),

    # Connexions WebSocket (chat temps réel)
    'websocket': AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})