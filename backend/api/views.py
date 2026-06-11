from rest_framework import viewsets, permissions, status, pagination
from rest_framework.response import Response
from django.db.models import Q
from .models import User, NivelExtincao, NivelDestruicao, Bioma, Estado, Regiao, Animal, Ong, ZonaPreservacao
from .serializers import (
    UserSerializer, NivelExtincaoSerializer, NivelDestruicaoSerializer, BiomaSerializer, 
    EstadoSerializer, RegiaoSerializer, AnimalSerializer, OngSerializer, ZonaPreservacaoSerializer
)
from .permissions import IsAdminOrReadOnly
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
