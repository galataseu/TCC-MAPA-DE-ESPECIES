# 🌿 Mapa de Espécies Ameaçadas - TCC (Documento de Referência)

Este arquivo serve como a **Fonte de Verdade** para o desenvolvimento do projeto. Ele consolida os requisitos, a arquitetura e as diretrizes de engenharia para o TCC.

---

## 1. 🎯 VISÃO GERAL DO PROJETO
O projeto consiste em um **Mapa Interativo Web** focado na representação espacial de espécies ameaçadas de extinção na **região Sul do Brasil (PR, SC e RS)**. O objetivo é transformar dados técnicos (como os do ICMBio/SALVE) em uma interface didática e visual para o público geral.

### Objetivos Principais:
- Conscientização ambiental através da visualização geográfica.
- Mapeamento de Animais, ONGs e Zonas de Preservação.
- Interface minimalista, colorida e de fácil manuseio.

---

## 2. 🏛️ ARQUITETURA E STACK TÉCNICO

### Backend Híbrido
- **Django (Python):** Núcleo da lógica de negócios, gestão de usuários (Auth), painel administrativo robusto e ORM principal para manutenção de dados.
- **Node.js (Express):** Atua como BFF (Backend for Frontend) e serviço de alta performance para entrega de dados GeoJSON assíncronos para o mapa Leaflet. Utiliza **Prisma ORM** para consultas rápidas.

### Banco de Dados (PostgreSQL + PostGIS)
- **Engine:** PostgreSQL.
- **Extensão Espacial:** **PostGIS** (Obrigatório para manipulação eficiente de coordenadas e GeoJSON).
- *Nota do Arquiteto:* Embora modelos antigos mencionassem MySQL, a implementação atual utiliza PostGIS pela superioridade nativa no tratamento de dados geográficos, essencial para os requisitos do mapa.

### Frontend
- **Interface:** HTML5, CSS3 (Bootstrap 5.3) e JavaScript (Vanilla).
- **Mapa:** Leaflet.js integrado com Mapbox API.

---

## 3. 👤 PERFIS DE USUÁRIO E REGRAS DE NEGÓCIO

| Perfil | Permissões | Funcionalidades Exclusivas |
| :--- | :--- | :--- |
| **Usuário Comum** | Read-Only | Pesquisa unificada, Visualização de Cards, Lista de Favoritos. |
| **Administrador** | Full CRUD | Criar registros via clique direito no mapa (captura de coordenadas). |

### Regras de Negócio Críticas:
1. **Fórum Descontinuado:** Removido do escopo. Ignorar tabelas `forum`, `mensagem` e `interage`.
2. **Entidades Obrigatórias:** `Animal`, `ONG`, `Zona de Preservação` e `Favoritos`.
3. **Criação Admin:** Ao clicar com o botão direito no mapa, o sistema deve capturar as coordenadas exatas e abrir o modal de criação.

---

## 4. 🗄️ MODELAGEM DE DADOS (Destaques)

### Animal
- Nome Comum e Científico (Único).
- Nível de Extinção (Vinculado a tabela de referência).
- Taxonomia: Classe, Família.
- Atributos: Dieta, Hábitos, Altura, Peso, Biomas.
- Mídia: Imagem e Coordenadas Geográficas.

### ONGs e Zonas de Preservação
- Dados de localização (Pontos ou Polígonos via PostGIS).
- Descrição, contatos e área de atuação.

---

## 5. 🛠️ DIRETRIZES DE DESENVOLVIMENTO (Engenharia)

- **Código Limpo:** Priorizar legibilidade e separação de responsabilidades (Django para lógica pesada, Node para performance).
- **Dados Geográficos:** Sempre trafegar dados entre backend e frontend no formato **GeoJSON**.
- **Autenticação:** Centralizada no Django (JWT).
- **Manutenibilidade:** Seguir as convenções de código já estabelecidas no diretório `/backend` (Django) e na raiz (Node.js).

---

## 6. 🚀 COMANDOS RÁPIDOS E CREDENCIAIS
*Consultar `backend/INSTRUCOES_TCC.txt` para detalhes de execução.*

- **Admin Padrão:** `admin / admin`
- **User Padrão:** `user / user`
- **Django Server:** `localhost:8000`
- **Node/Express:** `localhost:3000` (ou porta configurada)
