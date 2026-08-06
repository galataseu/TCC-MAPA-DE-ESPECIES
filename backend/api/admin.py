from django.contrib.gis import admin
from django.db import models
from django.forms import CheckboxSelectMultiple
from .models import (
    User, NivelExtincao, NivelDestruicao, Bioma, Estado, 
    Regiao, Microrregiao, Animal, Marcador, Favorito, 
    Ong, ZonaPreservacao, AnimalImagem
)

class AnimalImagemInline(admin.TabularInline):
    model = AnimalImagem
    extra = 1

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'role', 'denuncias')

@admin.register(Regiao)
class RegiaoAdmin(admin.ModelAdmin):
    list_display = ('nome',)

@admin.register(Estado)
class EstadoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'sigla', 'regiao')
    list_filter = ('regiao',)

@admin.register(Microrregiao)
class MicrorregiaoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'estado')
    list_filter = ('estado',)

@admin.register(NivelExtincao)
class NivelExtincaoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'sigla')

@admin.register(NivelDestruicao)
class NivelDestruicaoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'cor_alerta')

@admin.register(Bioma)
class BiomaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo', 'nivel_destr')

@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = ('nome_comum', 'nome_cientifico', 'nivel_extincao', 'microrregiao')
    list_filter = ('nivel_extincao', 'nivel_destruicao', 'microrregiao')
    search_fields = ('nome_comum', 'nome_cientifico')
    inlines = [AnimalImagemInline]
    actions = ['delete_animal_quickly']
    
    # Adicionando seleção visual para Biomas
    formfield_overrides = {
        models.ManyToManyField: {'widget': CheckboxSelectMultiple},
    }

    @admin.action(description='Deletar animais selecionados rapidamente')
    def delete_animal_quickly(self, request, queryset):
        queryset.delete()
        self.message_user(request, "Animais selecionados foram deletados com sucesso.")

@admin.register(Marcador)
class MarcadorAdmin(admin.GISModelAdmin):
    list_display = ('animal', 'created_at')
    list_filter = ('animal',)

@admin.register(Favorito)
class FavoritoAdmin(admin.ModelAdmin):
    list_display = ('user', 'animal', 'created_at')
    list_filter = ('created_at',)

@admin.register(Ong)
class OngAdmin(admin.GISModelAdmin):
    list_display = ('nome', 'email', 'telefone')

@admin.register(ZonaPreservacao)
class ZonaPreservacaoAdmin(admin.GISModelAdmin):
    list_display = ('nome', 'categoria')
