from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Limpa o banco de dados e reinicia as sequências de ID'

    def handle(self, *args, **options):
        self.stdout.write('🔄 Reiniciando todas as sequências de ID e limpando o banco Django...')
        
        tables = [
            'api_marcador',
            'api_interacao',
            'api_animal_biomas',
            'api_bioma_estados',
            'api_animal',
            'api_ong',
            'api_zonapreservacao',
            'api_bioma',
            'api_microrregiao',
            'api_estado',
            'api_regiao',
            'api_nivelextincao',
            'api_niveldestruicao',
            'api_user',
        ]

        with connection.cursor() as cursor:
            for table in tables:
                try:
                    cursor.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE;')
                    self.stdout.write(self.style.SUCCESS(f'✅ Tabela "{table}" resetada.'))
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'⚠️ Erro ao resetar tabela "{table}": {e}'))

        self.stdout.write(self.style.SUCCESS('\n✨ Banco de dados Django limpo e IDs reiniciados em 1.'))
