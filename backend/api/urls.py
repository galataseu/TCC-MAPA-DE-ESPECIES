from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AnimalViewSet, OngViewSet, ZonaPreservacaoViewSet, 
    NivelExtincaoViewSet, NivelDestruicaoViewSet, BiomaViewSet, 
    EstadoViewSet, RegiaoViewSet, LoginView, RegisterView
)

router = DefaultRouter()
router.register(r'animais', AnimalViewSet)
router.register(r'ongs', OngViewSet)
router.register(r'zonas', ZonaPreservacaoViewSet)

# Auxiliary routes
router.register(r'niveis-extincao', NivelExtincaoViewSet)
router.register(r'niveis-destruicao', NivelDestruicaoViewSet)
router.register(r'biomas', BiomaViewSet)
router.register(r'estados', EstadoViewSet)
router.register(r'regioes', RegiaoViewSet)

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/register/', RegisterView.as_view({'post': 'create'}), name='register'),
    path('', include(router.urls)),
]
