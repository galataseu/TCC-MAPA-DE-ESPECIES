from django.contrib.gis.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    def delete(self, **kwargs):
        self.deleted_at = timezone.now()
        self.save()

    class Meta:
        abstract = True

class User(AbstractUser):
    ADMIN = 'admin'
    USER = 'user'
    
    ROLE_CHOICES = [
        (ADMIN, 'Administrador'),
        (USER, 'Usuário Comum'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=USER)
    data_nasc = models.DateField(null=True, blank=True)
    denuncias = models.IntegerField(default=0)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.username

class Regiao(models.Model):
    """Regiões do Brasil (Norte, Sul, etc.) - Conforme Modelagem"""
    nome = models.CharField(max_length=100, unique=True)
    
    class Meta:
        verbose_name = "Região"
        verbose_name_plural = "Regiões"

    def __str__(self):
        return self.nome

class Estado(models.Model):
    nome = models.CharField(max_length=50)
    sigla = models.CharField(max_length=2, unique=True)
    regiao = models.ForeignKey(Regiao, on_delete=models.CASCADE, related_name='estados', null=True, blank=True)
    
    def __str__(self):
        return f"{self.nome} ({self.sigla})"

class Microrregiao(models.Model):
    """Antiga 'Regiao' em models.py (ex: AMESC, AMREC)"""
    nome = models.CharField(max_length=100)
    estado = models.ForeignKey(Estado, on_delete=models.CASCADE, related_name='microrregioes')
    
    class Meta:
        verbose_name = "Microrregião"
        verbose_name_plural = "Microrregiões"
        unique_together = ('nome', 'estado')

    def __str__(self):
        return f"{self.nome} ({self.estado.sigla})"

class NivelExtincao(models.Model):
    """Níveis oficiais (IUCN/MMA)"""
    nome = models.CharField(max_length=100, unique=True)
    sigla = models.CharField(max_length=5, null=True, blank=True)
    descricao = models.TextField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Nível de Extinção"
        verbose_name_plural = "Níveis de Extinção"

    def __str__(self):
        return self.nome

class NivelDestruicao(models.Model):
    """Nível de destruição do habitat"""
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(null=True, blank=True)
    cor_alerta = models.CharField(max_length=7, default="#FF0000")
    
    class Meta:
        verbose_name = "Nível de Destruição"
        verbose_name_plural = "Níveis de Destruição"

    def __str__(self):
        return self.nome

class Bioma(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    tipo = models.CharField(max_length=100, null=True, blank=True)
    nivel_destr = models.CharField(max_length=100, null=True, blank=True)
    caract = models.TextField(null=True, blank=True)
    estados = models.ManyToManyField(Estado, related_name='biomas')
    
    def __str__(self):
        return self.nome

class Animal(SoftDeleteModel):
    nome_comum = models.CharField(max_length=100)
    nome_cientifico = models.CharField(max_length=150)
    familia = models.CharField(max_length=70, null=True, blank=True)
    classe = models.CharField(max_length=50, null=True, blank=True)
    altura = models.FloatField(null=True, blank=True)
    peso = models.FloatField(null=True, blank=True)
    dieta = models.CharField(max_length=50, null=True, blank=True)
    habitos = models.TextField(null=True, blank=True)
    obs = models.TextField(null=True, blank=True)
    
    nivel_extincao = models.ForeignKey(NivelExtincao, on_delete=models.PROTECT, related_name='animais')
    nivel_destruicao = models.ForeignKey(NivelDestruicao, on_delete=models.SET_NULL, null=True, blank=True, related_name='animais')
    
    biomas = models.ManyToManyField(Bioma, related_name='animais')
    microrregiao = models.ForeignKey(Microrregiao, on_delete=models.PROTECT, related_name='animais', null=True, blank=True)
    
    autor_cad = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='animais_cadastrados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Animal"
        verbose_name_plural = "Animais"
        constraints = [
            models.UniqueConstraint(
                fields=['nome_cientifico'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_active_scientific_name'
            )
        ]

    def __str__(self):
        return self.nome_comum

class AnimalImagem(models.Model):
    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name='imagens')
    imagem = models.ImageField(upload_to='animais/')
    legenda = models.CharField(max_length=100, null=True, blank=True)
    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['ordem']
        verbose_name = "Imagem do Animal"
        verbose_name_plural = "Imagens dos Animais"

    def __str__(self):
        return f"Imagem de {self.animal.nome_comum} ({self.id})"

class Marcador(models.Model):
    """Tabela localizac... / Marcadores na modelagem"""
    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name='marcadores')
    location = models.PointField(srid=4326)
    icone = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Marcador"
        verbose_name_plural = "Marcadores"

    def __str__(self):
        return f"Marcador de {self.animal.nome_comum} ({self.location.x}, {self.location.y})"

class Interacao(models.Model):
    """Tabela interage na modelagem"""
    autor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interacoes_feitas')
    recebedor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interacoes_recebidas', null=True, blank=True)
    tipo = models.CharField(max_length=50)
    data = models.DateField(auto_now_add=True)
    hora = models.TimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Interação"
        verbose_name_plural = "Interações"

class Ong(SoftDeleteModel):
    nome = models.CharField(max_length=150)
    descricao = models.TextField(null=True, blank=True)
    email = models.EmailField(max_length=100, null=True, blank=True)
    telefone = models.CharField(max_length=20, null=True, blank=True)
    site = models.URLField(max_length=200, null=True, blank=True)
    
    location = models.PointField(srid=4326)
    endereco = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nome

class ZonaPreservacao(SoftDeleteModel):
    nome = models.CharField(max_length=150)
    descricao = models.TextField(null=True, blank=True)
    categoria = models.CharField(max_length=100, null=True, blank=True)
    
    area = models.MultiPolygonField(srid=4326)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Zona de Preservação"
        verbose_name_plural = "Zonas de Preservação"

    def __str__(self):
        return self.nome
