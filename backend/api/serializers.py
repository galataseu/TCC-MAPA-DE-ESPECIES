from rest_framework import serializers
from .models import User, NivelExtincao, NivelDestruicao, Bioma, Estado, Regiao, Animal, Ong, ZonaPreservacao

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'role', 'data_nasc', 'denuncias')

class NivelExtincaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = NivelExtincao
        fields = '__all__'

class NivelDestruicaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = NivelDestruicao
        fields = '__all__'

class BiomaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bioma
        fields = '__all__'

class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estado
        fields = '__all__'

class RegiaoSerializer(serializers.ModelSerializer):
    estado = EstadoSerializer(read_only=True)
    estado_id = serializers.PrimaryKeyRelatedField(
        queryset=Estado.objects.all(), source='estado', write_only=True
    )
    class Meta:
        model = Regiao
        fields = '__all__'

class AnimalSerializer(serializers.ModelSerializer):
    nivel_extincao = NivelExtincaoSerializer(read_only=True)
    nivel_extincao_id = serializers.PrimaryKeyRelatedField(
        queryset=NivelExtincao.objects.all(), source='nivel_extincao', write_only=True
    )
    
    nivel_destruicao = NivelDestruicaoSerializer(read_only=True)
    nivel_destruicao_id = serializers.PrimaryKeyRelatedField(
        queryset=NivelDestruicao.objects.all(), source='nivel_destruicao', write_only=True, required=False
    )
    
    biomas = BiomaSerializer(many=True, read_only=True)
    biomas_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Bioma.objects.all(), source='biomas', write_only=True
    )
    
    regiao = RegiaoSerializer(read_only=True)
    regiao_id = serializers.PrimaryKeyRelatedField(
        queryset=Regiao.objects.all(), source='regiao', write_only=True
    )

    class Meta:
        model = Animal
        fields = '__all__'
        extra_kwargs = {
            'deleted_at': {'read_only': True},
            'autor_cad': {'read_only': True}
        }

class OngSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ong
        fields = '__all__'
        extra_kwargs = {
            'deleted_at': {'read_only': True}
        }

class ZonaPreservacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ZonaPreservacao
        fields = '__all__'
        extra_kwargs = {
            'deleted_at': {'read_only': True}
        }
