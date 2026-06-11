# Projeto TCC - Mapa de Espécies Ameaçadas

Este é o repositório consolidado do TCC, integrando o frontend Bootleaf (Express) com o backend geográfico (Django + PostGIS).

## 🏗️ Estrutura do Projeto
- **root**: Servidor Express para entrega do frontend estático.
- **backend/**: Servidor Django REST Framework com suporte a dados geoespaciais (PostGIS).
- **prisma/**: Gestão e visualização do banco de dados via Prisma Studio.
- **public/**: Interface do usuário (HTML, CSS, JS).

## 🚀 Como Executar

### 1. Requisitos
- Node.js & npm
- Python 3.12+
- PostgreSQL com PostGIS

### 2. Backend (Django)
Acesse a pasta `backend/`, ative o ambiente virtual e instale as dependências:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py seed_db
python manage.py runserver 8000
```

### 3. Frontend (Express)
Na raiz do projeto:
```bash
npm install
npm run dev
```

## 🛠️ Comandos Úteis (via npm)
- `npm run django:run`: Inicia o Django na porta 8000.
- `npm run django:seed`: Popula o banco de dados.
- `npm run prisma:studio`: Abre o visualizador do banco de dados (Prisma).

## 📍 Integração
O frontend em `public/` está configurado para consumir a API Django em `http://localhost:8000`.
