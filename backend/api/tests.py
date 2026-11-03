from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from .models import User, NivelExtincao, Animal, Bioma, EventoUso

class APITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(username='admin_test', password='password123', role='admin')
        self.normal_user = User.objects.create_user(username='user_test', password='password123', role='user')
        self.nivel = NivelExtincao.objects.create(nome='Vulnerável')
        
        # Obter tokens
        response = self.client.post(reverse('login'), {'username': 'admin_test', 'password': 'password123'})
        self.admin_token = response.data['token']
        
    def test_list_animals_public(self):
        """Testa se a listagem de animais é pública"""
        url = reverse('animal-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

    def test_create_animal_admin_only(self):
        """Testa se apenas admin pode criar animais"""
        url = reverse('animal-list')
        data = {
            'nome_comum': 'Arara Azul',
            'nome_cientifico': 'Anodorhynchus hyacinthinus',
            'nivel_extincao_id': self.nivel.id
        }
        
        # Sem token (falha)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Com token admin (sucesso)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.admin_token)
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Animal.objects.count(), 1)

    def test_soft_delete_animal(self):
        """Testa o soft delete de um animal"""
        animal = Animal.objects.create(nome_comum='Teste', nome_cientifico='Testus', nivel_extincao=self.nivel)
        url = reverse('animal-detail', args=[animal.id])
        
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.admin_token)
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        animal.refresh_from_db()
        self.assertIsNotNone(animal.deleted_at)
        
        # Não deve aparecer na listagem normal
        response = self.client.get(reverse('animal-list'))
        self.assertEqual(len(response.data['data']), 0)


class StatsUsoTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='stats_admin_test',
            password='password123',
            role='admin',
        )
        self.user = User.objects.create_user(
            username='stats_user_test',
            password='password123',
            role='user',
        )
        self.nivel = NivelExtincao.objects.create(nome='Em Perigo')
        self.bioma = Bioma.objects.create(nome='Bioma Estatísticas')
        self.animal_mais_visto = Animal.objects.create(
            nome_comum='Animal teste mais visto',
            nome_cientifico='Testus statisticae',
            nivel_extincao=self.nivel,
        )
        self.animal_segundo = Animal.objects.create(
            nome_comum='Animal teste secundário',
            nome_cientifico='Testus secundarius',
            nivel_extincao=self.nivel,
        )
        self.animal_mais_visto.biomas.add(self.bioma)
        self.animal_segundo.biomas.add(self.bioma)

        response = self.client.post(
            reverse('login'),
            {'username': 'stats_admin_test', 'password': 'password123'},
        )
        self.admin_token = response.data['token']

    def _criar_evento(self, tipo, dias_atras=0, hora=12, animal=None,
                      termo=None, resultado_encontrado=None):
        evento = EventoUso.objects.create(
            tipo=tipo,
            animal=animal,
            termo=termo,
            resultado_encontrado=resultado_encontrado,
        )
        criado_em = (timezone.now() - timedelta(days=dias_atras)).replace(
            hour=hora,
            minute=0,
            second=0,
            microsecond=0,
        )
        EventoUso.objects.filter(pk=evento.pk).update(created_at=criado_em)
        return evento

    def test_stats_requer_administrador(self):
        url = reverse('stats-uso')

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.admin_token)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

    def test_stats_retorna_agregacoes_e_periodos_corretos(self):
        for dias, hora in [(2, 10), (2, 10), (1, 14)]:
            self._criar_evento('view', dias, hora, self.animal_mais_visto)
        self._criar_evento('view', 40, 10, self.animal_mais_visto)
        self._criar_evento('view', 1, 14, self.animal_segundo)
        self._criar_evento('view', 10, 10, self.animal_segundo)

        self._criar_evento('favorite', 2, 14, self.animal_mais_visto)
        self._criar_evento('favorite', 2, 14, self.animal_mais_visto)
        self._criar_evento('favorite', 10, 11, self.animal_segundo)

        self._criar_evento('visit', 1, 10)
        self._criar_evento('visit', 6, 20)
        self._criar_evento('visit', 10, 9)

        self._criar_evento('search', 1, 10, termo='gralha-azul', resultado_encontrado=False)
        self._criar_evento('search', 6, 20, termo='gralha-azul', resultado_encontrado=False)
        self._criar_evento('search', 1, 14, termo='arara', resultado_encontrado=True)

        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.admin_token)
        response = self.client.get(reverse('stats-uso'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']

        self.assertEqual(data['total_visualizacoes_7d'], 4)
        self.assertEqual(data['total_visualizacoes_30d'], 5)
        self.assertEqual(data['total_favoritos_7d'], 2)
        self.assertEqual(data['total_favoritos_30d'], 3)
        self.assertEqual(data['total_visitas_7d'], 2)
        self.assertEqual(data['total_visitas_30d'], 3)

        self.assertEqual(data['animal_mais_visto']['animal_id'], self.animal_mais_visto.id)
        self.assertEqual(data['animal_mais_visto']['total'], 4)
        self.assertEqual(data['animal_mais_favoritado']['animal_id'], self.animal_mais_visto.id)
        self.assertEqual(data['animal_mais_favoritado']['total'], 2)
        self.assertEqual(sum(evento['total'] for evento in data['views_por_dia']), 5)
        self.assertEqual(sum(evento['total'] for evento in data['favs_por_dia']), 3)
        self.assertEqual(sum(evento['total'] for evento in data['visitas_por_dia']), 3)
        self.assertEqual(sum(evento['total'] for evento in data['horarios_pico']), 11)
        self.assertEqual(sum(evento['total'] for evento in data['dias_pico']), 11)

        self.assertEqual(data['biomas_mais_acessados'], [{
            'id': self.bioma.id,
            'nome': self.bioma.nome,
            'total': 5,
        }])
        conversao = {item['animal_id']: item for item in data['conversao']}
        self.assertEqual(
            conversao[self.animal_mais_visto.id]['nome_comum'],
            self.animal_mais_visto.nome_comum,
        )
        self.assertEqual(conversao[self.animal_mais_visto.id]['taxa_conversao'], 50.0)
        self.assertEqual(conversao[self.animal_segundo.id]['taxa_conversao'], 50.0)
        self.assertEqual(data['termos_mais_busados'][0], {'termo': 'gralha-azul', 'total': 2})
        self.assertEqual(data['buscas_sem_resultado'], [{'termo': 'gralha-azul', 'total': 2}])

    def test_stats_sem_eventos_retorna_estrutura_vazia_segura(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + self.admin_token)
        response = self.client.get(reverse('stats-uso'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']
        self.assertIsNone(data['animal_mais_visto'])
        self.assertIsNone(data['animal_mais_favoritado'])
        self.assertEqual(data['total_visualizacoes_30d'], 0)
        self.assertEqual(data['views_por_dia'], [])
        self.assertEqual(data['biomas_mais_acessados'], [])
        self.assertEqual(data['conversao'], [])
        self.assertEqual(len(data['horarios_pico']), 24)
        self.assertEqual(len(data['dias_pico']), 7)

    def test_registro_de_evento_publico_e_rejeita_tipo_invalido(self):
        url = reverse('registro-evento-uso')

        invalido = self.client.post(url, {'tipo': 'tipo-inexistente'}, format='json')
        self.assertEqual(invalido.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(EventoUso.objects.count(), 0)

        valido = self.client.post(
            url,
            {'tipo': 'view', 'animal_id': self.animal_mais_visto.id},
            format='json',
        )
        self.assertEqual(valido.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EventoUso.objects.count(), 1)
        self.assertEqual(EventoUso.objects.get().animal_id, self.animal_mais_visto.id)
