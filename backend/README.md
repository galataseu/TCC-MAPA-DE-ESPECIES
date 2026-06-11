# TCC-Django: Backend em Django REST Framework

Este projeto é uma migração do sistema original em Node.js para Django, criado para fins de comparação acadêmica.

## Tecnologias
- Python 3.12
- Django 6.0
- Django REST Framework
- SimpleJWT (Autenticação)
- PostgreSQL

## Como Rodar

1. **Ativar o Ambiente Virtual:**
   ```bash
   source venv/bin/activate
   ```

2. **Configurar o Banco de Dados:**
   O projeto está configurado para usar o banco `tcc_django`. Se precisar recriar:
   ```bash
   # No terminal (bash)
   PGPASSWORD=1508 psql -h localhost -U postgres -c "CREATE DATABASE tcc_django;"
   ```

3. **Rodar Migrações:**
   ```bash
   python manage.py migrate
   ```

4. **Resetar IDs (Opcional):**
   Para limpar o banco e fazer os IDs voltarem ao 1:
   ```bash
   python manage.py reset_db
   ```

5. **Criar Superusuário (Admin):**
   ```bash
   python manage.py createsuperuser
   # Ou use o padrão criado: admin / admin123
   ```

6. **Iniciar o Servidor:**
   ```bash
   python manage.py runserver 8000
   ```

## Endpoints Principais
- **Login:** `POST /api/v1/auth/login/`
- **Animais:** `GET/POST /api/v1/animais/`
- **ONGs:** `GET/POST /api/v1/ongs/`
- **Zonas:** `GET/POST /api/v1/zonas/`
- **Admin Django:** `http://localhost:8000/admin/`

## Diferenciais Implementados
- **Soft Delete:** Animais e ONGs usam `deleted_at`.
- **Compatibilidade:** O formato do JSON de resposta (`success: true, data: ...`) é idêntico ao do Node.js.
- **Geolocalização:** Campos Prontos para integração com Leaflet.
