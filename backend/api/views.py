from decimal import Decimal
from datetime import date, datetime, timedelta

from rest_framework import viewsets, permissions, status, pagination
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count
from django.db.models.functions import TruncDay
from django.utils import timezone
from django.contrib.gis.geos import Point
from .models import User, NivelExtincao, NivelDestruicao, Bioma, Estado, Regiao, Animal, Ong, ZonaPreservacao, Marcador, EventoUso
from .serializers import (
    UserSerializer, NivelExtincaoSerializer, NivelDestruicaoSerializer, BiomaSerializer, 
    EstadoSerializer, RegiaoSerializer, AnimalSerializer, OngSerializer, ZonaPreservacaoSerializer
)
from .permissions import IsAdminOrReadOnly, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomPagination(pagination.PageNumberPagination):
    page_size = 20
    
    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'data': data,
            'pagination': {
                'total': self.page.paginator.count,
                'page': self.page.number,
                'limit': self.page_size,
                'pages': self.page.paginator.num_pages
            }
        })

class BaseViewSet(viewsets.ModelViewSet):
    pagination_class = CustomPagination
    permission_classes = [IsAdminOrReadOnly]

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if not self.pagination_class:
            return Response({'success': True, 'data': response.data})
        return response

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return Response({'success': True, 'data': response.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if hasattr(self.get_serializer().Meta.model, 'autor_cad'):
            serializer.save(autor_cad=request.user)
        else:
            serializer.save()
        return Response({'success': True, 'data': serializer.data, 'message': 'Criado com sucesso'}, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return Response({'success': True, 'data': response.data, 'message': 'Atualizado com sucesso'})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({'success': True, 'message': 'Deletado com sucesso'})

class AnimalViewSet(BaseViewSet):
    queryset = Animal.objects.all().order_by('-created_at')
    serializer_class = AnimalSerializer
    permission_classes = [IsAdminOrReadOnly]

    def create(self, request, *args, **kwargs):
        # request.data is already MultiValueDict in DRF for multipart
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Safely get the user
        user = request.user if request.user.is_authenticated else None
        animal = serializer.save(autor_cad=user)
        
        # Handle Image
        imagem = request.FILES.get('animal_imagem')
        if imagem:
            AnimalImagem.objects.create(animal=animal, imagem=imagem)
            
        # Handle Coordinates
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        if lat and lng:
            Marcador.objects.create(
                animal=animal,
                location=Point(float(lng), float(lat), srid=4326)
            )
            
        return Response({'success': True, 'data': serializer.data, 'message': 'Animal, imagem e marcador criados com sucesso'}, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = super().get_queryset()
        nivel_extincao = self.request.query_params.get('nivel_extincao')
        nivel_destruicao = self.request.query_params.get('nivel_destruicao')
        bioma = self.request.query_params.get('bioma')
        regiao = self.request.query_params.get('regiao')
        estado = self.request.query_params.get('estado')
        search = self.request.query_params.get('search')

        if nivel_extincao:
            queryset = queryset.filter(nivel_extincao_id=nivel_extincao)
        if nivel_destruicao:
            queryset = queryset.filter(nivel_destruicao_id=nivel_destruicao)
        if bioma:
            queryset = queryset.filter(biomas__id=bioma)
        if regiao:
            queryset = queryset.filter(regiao_id=regiao)
        if estado:
            queryset = queryset.filter(regiao__estado_id=estado)
        if search:
            queryset = queryset.filter(
                Q(nome_comum__icontains=search) | 
                Q(nome_cientifico__icontains=search)
            )
        return queryset.distinct()

class OngViewSet(BaseViewSet):
    queryset = Ong.objects.all().order_by('-created_at')
    serializer_class = OngSerializer

class ZonaPreservacaoViewSet(BaseViewSet):
    queryset = ZonaPreservacao.objects.all().order_by('-created_at')
    serializer_class = ZonaPreservacaoSerializer

class NivelExtincaoViewSet(BaseViewSet):
    queryset = NivelExtincao.objects.all()
    serializer_class = NivelExtincaoSerializer
    pagination_class = None

class NivelDestruicaoViewSet(BaseViewSet):
    queryset = NivelDestruicao.objects.all()
    serializer_class = NivelDestruicaoSerializer
    pagination_class = None

class BiomaViewSet(BaseViewSet):
    queryset = Bioma.objects.all()
    serializer_class = BiomaSerializer
    pagination_class = None

class EstadoViewSet(BaseViewSet):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer
    pagination_class = None

class RegiaoViewSet(BaseViewSet):
    queryset = Regiao.objects.all()
    serializer_class = RegiaoSerializer
    pagination_class = None

# AUTH VIEWS
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['success'] = True
        data['message'] = 'Login bem-sucedido'
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'role': self.user.role
        }
        data['token_type'] = 'Bearer'
        data['token'] = data.pop('access')
        data.pop('refresh')
        return data

class LoginView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class RegisterView(viewsets.GenericViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role', 'user')

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Nome de usuário já está em uso', 'code': 'CONFLICT'}, status=status.HTTP_409_CONFLICT)

        user = User.objects.create_user(username=username, password=password, role=role)
        return Response({
            'success': True, 
            'message': 'Usuário criado com sucesso',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


# ============================================================================
# Estatísticas de uso (apenas administrador)
# ============================================================================
class RegistroEventoUsoView(APIView):
    """Registra um evento de uso anônimo (visualização, favorito, busca, visita).

    Aberto (AllowAny) porque é chamado pelo frontend de qualquer visitante.
    Não grava dados pessoais: apenas animal, tipo, termo e carimbo.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        tipo = request.data.get('tipo')
        validos = dict(EventoUso.TIPO_EVENTO)
        if tipo not in validos:
            return Response({'success': False, 'error': 'Tipo de evento inválido.'}, status=400)

        animal = None
        animal_id = request.data.get('animal_id')
        if animal_id:
            try:
                animal = Animal.objects.get(id=animal_id)
            except Animal.DoesNotExist:
                pass

        EventoUso.objects.create(
            animal=animal,
            tipo=tipo,
            termo=(request.data.get('termo') or '').strip() or None,
            resultado_encontrado=request.data.get('resultado_encontrado'),
        )
        return Response({'success': True}, status=201)


class StatsUsoView(APIView):
    """Retorna estatísticas agregadas de uso para o painel do administrador.

    Bloqueado por IsAdminUser: usuários comuns recebem 403.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        agora = timezone.now()
        sete_dias = agora - timedelta(days=7)
        trinta_dias = agora - timedelta(days=30)

        eventos = EventoUso.objects.all()

        # --- Animal mais visto (total) ---
        mais_visto = (
            eventos.filter(tipo='view', animal__isnull=False)
            .values('animal_id', 'animal__nome_comum')
            .annotate(total=Count('id'))
            .order_by('-total')
            .first()
        )

        # --- Animal mais favoritado (total) ---
        mais_favoritado = (
            eventos.filter(tipo='favorite', animal__isnull=False)
            .values('animal_id', 'animal__nome_comum')
            .annotate(total=Count('id'))
            .order_by('-total')
            .first()
        )

        # --- Totais por período ---
        total_visualizacoes_7d = eventos.filter(tipo='view', created_at__gte=sete_dias).count()
        total_visualizacoes_30d = eventos.filter(tipo='view', created_at__gte=trinta_dias).count()
        total_favoritos_7d = eventos.filter(tipo='favorite', created_at__gte=sete_dias).count()
        total_favoritos_30d = eventos.filter(tipo='favorite', created_at__gte=trinta_dias).count()
        total_visitas_7d = eventos.filter(tipo='visit', created_at__gte=sete_dias).count()
        total_visitas_30d = eventos.filter(tipo='visit', created_at__gte=trinta_dias).count()

        # --- Visualizações e favoritos por dia (últimos 30 dias) ---
        views_por_dia = list(
            eventos.filter(tipo='view', created_at__gte=trinta_dias)
            .annotate(dia=TruncDay('created_at'))
            .values('dia')
            .annotate(total=Count('id'))
            .order_by('dia')
        )
        favs_por_dia = list(
            eventos.filter(tipo='favorite', created_at__gte=trinta_dias)
            .annotate(dia=TruncDay('created_at'))
            .values('dia')
            .annotate(total=Count('id'))
            .order_by('dia')
        )
        visitas_por_dia = list(
            eventos.filter(tipo='visit', created_at__gte=trinta_dias)
            .annotate(dia=TruncDay('created_at'))
            .values('dia')
            .annotate(total=Count('id'))
            .order_by('dia')
        )

        # --- Biomas mais acessados (a partir dos animais mais vistos) ---
        top_animais_ids = list(
            eventos.filter(tipo='view', animal__isnull=False)
            .values_list('animal_id', flat=True)
            .annotate(total=Count('id'))
            .order_by('-total')[:50]
        )
        from .models import Bioma
        biomas_contagem = {}
        if top_animais_ids:
            animais = Animal.objects.filter(id__in=top_animais_ids).prefetch_related('biomas')
            views_por_animal = {
                r['animal_id']: r['total']
                for r in eventos.filter(tipo='view', animal__id__in=top_animais_ids)
                .values('animal_id')
                .annotate(total=Count('id'))
            }
            for a in animais:
                for b in a.biomas.all():
                    biomas_contagem[b.id] = {
                        'id': b.id,
                        'nome': b.nome,
                        'total': biomas_contagem.get(b.id, {}).get('total', 0) + views_por_animal.get(a.id, 0),
                    }
        biomas_mais_acessados = sorted(
            biomas_contagem.values(), key=lambda x: x['total'], reverse=True
        )[:10]

        # --- Taxa de conversão: animais com muitas visualizações e poucos favoritos ---
        animais_stats = (
            eventos.filter(animal__isnull=False)
            .values('animal_id', 'animal__nome_comum')
            .annotate(
                views=Count('id', filter=Q(tipo='view')),
                favoritos=Count('id', filter=Q(tipo='favorite')),
            )
            .order_by('-views')[:30]
        )
        conversao = []
        for a in animais_stats:
            v = a['views'] or 0
            f = a['favoritos'] or 0
            taxa = round((f / v) * 100, 2) if v else 0
            conversao.append({
                'animal_id': a['animal_id'],
                'nome_comum': a['nome_comum'],
                'views': v,
                'favoritos': f,
                'taxa_conversao': taxa,
            })
        conversao_ordenada = sorted(conversao, key=lambda x: x['taxa_conversao'])

        # --- Horários de pico (hora do dia) ---
        # TruncDay não serve para hora; usamos extração manual via Python p/ portabilidade.
        horas = {}
        for e in eventos.filter(created_at__gte=sete_dias).only('created_at'):
            h = e.created_at.hour
            horas[h] = horas.get(h, 0) + 1
        horarios_pico = [{'hora': h, 'total': horas.get(h, 0)} for h in range(24)]

        # --- Dias da semana de pico ---
        dias_semana = {}
        for e in eventos.filter(created_at__gte=sete_dias).only('created_at'):
            # 0=segunda ... 6=domingo (Python weekday)
            nome = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][e.created_at.weekday()]
            dias_semana[nome] = dias_semana.get(nome, 0) + 1
        ordem_dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
        dias_pico = [{'dia': d, 'total': dias_semana.get(d, 0)} for d in ordem_dias]

        # --- Termos mais buscados e buscas sem resultado ---
        buscas = eventos.filter(tipo='search')
        termos = (
            buscas.exclude(termo__isnull=True).exclude(termo='')
            .values('termo')
            .annotate(total=Count('id'))
            .order_by('-total')[:20]
        )
        buscas_sem_resultado = (
            buscas.filter(resultado_encontrado=False)
            .exclude(termo__isnull=True).exclude(termo='')
            .values('termo')
            .annotate(total=Count('id'))
            .order_by('-total')[:10]
        )

        data = {
            'animal_mais_visto': mais_visto,
            'animal_mais_favoritado': mais_favoritado,
            'total_visualizacoes_7d': total_visualizacoes_7d,
            'total_visualizacoes_30d': total_visualizacoes_30d,
            'total_favoritos_7d': total_favoritos_7d,
            'total_favoritos_30d': total_favoritos_30d,
            'total_visitas_7d': total_visitas_7d,
            'total_visitas_30d': total_visitas_30d,
            'views_por_dia': views_por_dia,
            'favs_por_dia': favs_por_dia,
            'visitas_por_dia': visitas_por_dia,
            'biomas_mais_acessados': biomas_mais_acessados,
            'conversao': conversao_ordenada,
            'horarios_pico': horarios_pico,
            'dias_pico': dias_pico,
            'termos_mais_busados': list(termos),
            'buscas_sem_resultado': list(buscas_sem_resultado),
            'gerado_em': agora.isoformat(),
        }

        # Serialização segura de datas/decimais
        return Response({'success': True, 'data': self._serialize(data)})

    def _serialize(self, obj):
        if isinstance(obj, dict):
            return {k: self._serialize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [self._serialize(v) for v in obj]
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, timedelta):
            return str(obj)
        if isinstance(obj, Decimal):
            return float(obj)
        return obj
