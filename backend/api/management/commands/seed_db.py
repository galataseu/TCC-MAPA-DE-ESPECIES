from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point, Polygon, MultiPolygon
from api.models import (
    NivelExtincao, NivelDestruicao, Bioma, Regiao, Estado, 
    Microrregiao, Animal, Marcador, Ong, ZonaPreservacao, User
)
from django.contrib.auth.hashers import make_password
from datetime import date

class Command(BaseCommand):
    help = 'Popula o banco de dados com dados Oficiais da Região Sul (SC, PR, RS)'

    def handle(self, *args, **kwargs):
        self.stdout.write('🌱 Iniciando seeding focado exclusivamente na Região Sul...')

        # 1. Usuários
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'password': make_password('admin123'),
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
                'data_nasc': date(1990, 1, 1)
            }
        )

        # 2. Região Macro (Apenas Sul)
        sul, _ = Regiao.objects.get_or_create(nome='Sul')

        # 3. Estados (Apenas SC, PR, RS)
        sc, _ = Estado.objects.get_or_create(nome='Santa Catarina', sigla='SC', regiao=sul)
        pr, _ = Estado.objects.get_or_create(nome='Paraná', sigla='PR', regiao=sul)
        rs, _ = Estado.objects.get_or_create(nome='Rio Grande do Sul', sigla='RS', regiao=sul)

        # 4. Microrregiões Principais
        micros = [
            ('Vale do Itajaí', sc), ('Grande Florianópolis', sc), ('Norte Catarinense', sc), ('Oeste Catarinense', sc),
            ('Litoral Paranaense', pr), ('Metropolitana de Curitiba', pr), ('Norte Central Paranaense', pr),
            ('Metropolitana de Porto Alegre', rs), ('Serra Gaúcha', rs), ('Sudoeste Rio-grandense', rs), ('Campanha', rs)
        ]
        micro_objs = {}
        for nome, est in micros:
            obj, _ = Microrregiao.objects.get_or_create(nome=nome, estado=est)
            micro_objs[nome] = obj

        # 5. Níveis de Extinção Oficiais (IUCN/MMA)
        niveis_ext = [
            ('EX', 'Extinta', 'Não restam dúvidas de que o último indivíduo tenha morrido.'),
            ('EW', 'Extinta na Natureza', 'Sobrevive apenas em cultivo, cativeiro ou como população naturalizada.'),
            ('CR', 'Criticamente em Perigo', 'Enfrenta um risco extremamente elevado de extinção na natureza.'),
            ('EN', 'Em Perigo', 'Enfrenta um risco muito elevado de extinção na natureza.'),
            ('VU', 'Vulnerável', 'Enfrenta um risco elevado de extinção na natureza.'),
            ('NT', 'Quase Ameaçada', 'Não está ameaçada agora, mas pode estar em um futuro próximo.'),
            ('LC', 'Pouco Preocupante', 'Espécie abundante e com ampla distribuição.'),
            ('DD', 'Dados Insuficientes', 'Informação inadequada para uma avaliação do risco de extinção.'),
        ]
        ext_objs = {}
        for sigla, nome, desc in niveis_ext:
            obj, _ = NivelExtincao.objects.get_or_create(
                sigla=sigla, 
                defaults={'nome': nome, 'descricao': desc}
            )
            ext_objs[sigla] = obj

        # 6. Níveis de Destruição/Degradação de Habitat
        niveis_dest = [
            ('Preservado', 'Ecossistema com funções e estrutura originais mantidas.', '#2ECC71'),
            ('Alterado', 'Presença de intervenção humana leve ou espécies invasoras.', '#F1C40F'),
            ('Fragmentado', 'Áreas isoladas por matrizes de agricultura ou urbanização.', '#E67E22'),
            ('Muito Alterado', 'Perda significativa de biodiversidade e erosão do solo.', '#E74C3C'),
            ('Degradado', 'Ecossistema incapaz de regeneração natural.', '#922B21'),
        ]
        dest_objs = {}
        for nome, desc, cor in niveis_dest:
            obj, _ = NivelDestruicao.objects.get_or_create(
                nome=nome, 
                defaults={'descricao': desc, 'cor_alerta': cor}
            )
            dest_objs[nome] = obj

        # 7. Biomas da Região Sul
        mata_atlantica, _ = Bioma.objects.get_or_create(
            nome='Mata Atlântica', 
            defaults={'tipo': 'Tropical/Subtropical', 'caract': 'Floresta densa, Mata de Araucárias no planalto.'}
        )
        mata_atlantica.estados.add(sc, pr, rs)

        pampa, _ = Bioma.objects.get_or_create(
            nome='Pampa', 
            defaults={'tipo': 'Campos Sulinos', 'caract': 'Extensos campos, clima temperado, exclusivo do RS.'}
        )
        pampa.estados.add(rs)

        # 8. Espécies Emblemáticas da Região Sul
        especies = [
            {
                'nome': 'Gralha-Azul', 'cient': 'Cyanocorax caeruleus', 'classe': 'Aves', 'fam': 'Corvidae',
                'ext': 'NT', 'dest': 'Fragmentado', 'micro': 'Metropolitana de Curitiba', 'bioma': mata_atlantica,
                'locs': [(-49.27, -25.42), (-48.50, -25.80)]
            },
            {
                'nome': 'Sapo-de-barriga-vermelha', 'cient': 'Melanophryniscus admirabilis', 'classe': 'Amphibia', 'fam': 'Bufonidae',
                'ext': 'CR', 'dest': 'Degradado', 'micro': 'Vale do Itajaí', 'bioma': mata_atlantica,
                'locs': [(-49.00, -27.00)]
            },
            {
                'nome': 'Papagaio-charão', 'cient': 'Amazona pretrei', 'classe': 'Aves', 'fam': 'Psittacidae',
                'ext': 'VU', 'dest': 'Alterado', 'micro': 'Serra Gaúcha', 'bioma': mata_atlantica,
                'locs': [(-51.50, -29.20)]
            },
            {
                'nome': 'Gato-do-mato-pequeno', 'cient': 'Leopardus tigrinus', 'classe': 'Mammalia', 'fam': 'Felidae',
                'ext': 'EN', 'dest': 'Fragmentado', 'micro': 'Metropolitana de Porto Alegre', 'bioma': pampa,
                'locs': [(-51.20, -30.00)]
            },
            {
                'nome': 'Tamanduá-bandeira', 'cient': 'Myrmecophaga tridactyla', 'classe': 'Mammalia', 'fam': 'Myrmecophagidae',
                'ext': 'VU', 'dest': 'Fragmentado', 'micro': 'Oeste Catarinense', 'bioma': mata_atlantica,
                'locs': [(-52.60, -27.10)]
            }
        ]

        for esp in especies:
            animal, _ = Animal.objects.get_or_create(
                nome_cientifico=esp['cient'],
                defaults={
                    'nome_comum': esp['nome'],
                    'classe': esp['classe'],
                    'familia': esp['fam'],
                    'nivel_extincao': ext_objs[esp['ext']],
                    'nivel_destruicao': dest_objs[esp['dest']],
                    'microrregiao': micro_objs[esp['micro']],
                    'autor_cad': admin
                }
            )
            animal.biomas.add(esp['bioma'])
            
            for lon, lat in esp['locs']:
                Marcador.objects.get_or_create(
                    animal=animal,
                    location=Point(lon, lat),
                    defaults={'icone': f"{esp['nome'].lower().replace(' ', '-')}-icon"}
                )

        # 9. ONGs de Conservação (Sul)
        Ong.objects.get_or_create(
            nome='SPVS',
            defaults={
                'descricao': 'Sociedade de Pesquisa em Vida Selvagem e Educação Ambiental.',
                'email': 'spvs@spvs.org.br',
                'location': Point(-49.27, -25.42),
                'endereco': 'Curitiba, PR'
            }
        )

        # 10. Zonas de Preservação Estratégicas
        parque_itajai = Polygon((( -49.2, -27.0), (-48.8, -27.0), (-48.8, -27.3), (-49.2, -27.3), (-49.2, -27.0)))
        ZonaPreservacao.objects.get_or_create(
            nome='Parque Nacional da Serra do Itajaí',
            defaults={
                'descricao': 'Protege um dos maiores remanescentes de Mata Atlântica de SC.',
                'categoria': 'Parque Nacional',
                'area': MultiPolygon(parque_itajai)
            }
        )

        self.stdout.write(self.style.SUCCESS('✅ Banco de dados oficial da Região Sul populado com sucesso!'))
