from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import User, NivelExtincao, Animal

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
