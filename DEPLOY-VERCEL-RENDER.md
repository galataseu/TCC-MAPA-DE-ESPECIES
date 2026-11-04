# 🚀 Passo a passo — Deploy na Vercel (frontend) + Render (API Django)

Este resumo pressupõe que você já tem repositório no GitHub conectado à Vercel e ao Render.

---

## 1. Backend Django (Render)

### 1.1. Variáveis de ambiente no Render
No painel do Render, em **Environment Variables**, adicione/ajuste:

| Variável | Valor | Observação |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Banco PostgreSQL + PostGIS já configurado |
| `NODE_ENV` | `production` | Desliga o modo debug |
| `JWT_SECRET` | `chave_longa_e_aleatoria` | Mesma usada pelo frontend/login |
| `ALLOWED_HOSTS` | `*` | Já está no settings |
| `CORS_ALLOWED_ORIGINS` | (opcional) | A origem oficial `https://tcc-mapa-de-especies.vercel.app` já é permitida por padrão. Informe domínios extras de preview ou personalizados separados por vírgula. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | conforme seu e-mail | Para notificações de mudança de status (opcional para estatísticas) |

### 1.2. Comandos de build no Render
- **Build Command:** `pip install -r requirements.txt && python manage.py migrate`
- **Start Command:** `gunicorn tcc_backend.wsgi:application` (ou `python manage.py runserver 0.0.0.0:$PORT` se não usar gunicorn)

> A migração `0011_eventouso` (nova tabela de estatísticas) será aplicada automaticamente pelo `migrate`.

### 1.3. URL da API
Acesse `https://<seu-servico>.onrender.com/api/v1/stats/uso/` com o token JWT de admin para confirmar que responde (deve retornar 401 sem token e 200 com token de admin).

### 1.4. Criar ou redefinir o administrador de produção
O banco local e o banco configurado no Render são separados. Criar ou trocar a senha localmente não altera a conta de produção.

Se o plano do Render não oferece Shell, é possível redefinir a conta com um deploy temporário. Não é necessário adicionar a senha ao código ou ao repositório:

1. Em **Environment → Environment Variables** do serviço Django, adicione `ADMIN_RESET_PASSWORD` com a nova senha. Marque-a como secreta, se essa opção aparecer.
2. Em **Settings → Start Command**, copie o comando atual para poder restaurá-lo. Se o comando atual for `gunicorn tcc_backend.wsgi:application`, substitua-o temporariamente por:

   ```bash
   python manage.py shell -c 'import os; from api.models import User; u=User.objects.get(username="admin"); u.set_password(os.environ["ADMIN_RESET_PASSWORD"]); u.role="admin"; u.is_active=True; u.is_staff=True; u.is_superuser=True; u.save(update_fields=["password","role","is_active","is_staff","is_superuser"]); print("Admin production password updated.")' && gunicorn tcc_backend.wsgi:application
   ```

   Se o serviço usa outro comando de inicialização, troque somente o final `gunicorn tcc_backend.wsgi:application` pelo **Start Command original**, mantendo o trecho `python manage.py shell ... &&`.
3. Salve e aguarde o deploy ficar **Live**. O comando atualiza a senha da conta `admin` e confirma o perfil de administrador da API.
4. Imediatamente depois, restaure o **Start Command original**, remova `ADMIN_RESET_PASSWORD` e salve. Isso inicia um segundo deploy sem a redefinição temporária; não deixe o prefixo configurado, pois ele seria executado em cada reinício.
5. Entre em `/admin/login` na Vercel usando `admin` e a senha definida no passo 1.

Esse procedimento pressupõe que o usuário `admin` já existe no banco de produção. Ele não imprime a senha no log nem a envia à Vercel.

---

## 2. Frontend Express (Vercel)

O projeto raiz já tem `vercel.json` configurado. A Vercel detecta o `package.json` e usa `npm install` + `npm run build` (ou você pode definir o Build Command manualmente).

### 2.1. Variáveis de ambiente na Vercel
No painel da Vercel, em **Settings → Environment Variables**, adicione:

| Variável | Valor | Ambiente |
|---|---|---|
| `API_BASE_URL` | `https://<seu-servico-django>.onrender.com/api` | Production, Preview, Development |

> Isso faz com que `API_DJANGO` no `app.js` aponte para o Django na Render e as estatísticas funcionem em produção.

### 2.2. CORS
O Django permite por padrão a origem oficial `https://tcc-mapa-de-especies.vercel.app` e os endereços locais. `CORS_ALLOWED_ORIGINS` acrescenta domínios de preview ou personalizados, separados por vírgula. Depois de alterar `settings.py` ou as variáveis de ambiente, faça redeploy do serviço Django no Render. Sem essa configuração no backend, o navegador bloqueia as chamadas da Vercel, inclusive login e estatísticas.

---

## 3. Verificações após o deploy

1. Abra o site na Vercel. O **banner de cookies (LGPD)** deve aparecer no rodapé.
2. Faça login como admin (`/admin/login`). O `sessionStorage.adminMode` será ativado.
3. Clique na aba **"Estatísticas"** no navbar (substitui o "Sobre" só para admin).
4. Confirme que o modal carrega os gráficos e que o botão **Exportar CSV** baixa um arquivo `.csv`.
5. Abra o console do navegador (`F12`) e confira que não há erros nas chamadas `fetch` para a API da Render.

---

## 4. Arquivos alterados nesta implementação

- `backend/api/models.py` — modelo `EventoUso`
- `backend/api/migrations/0011_eventouso.py` — migração nova
- `backend/api/views.py` — views de registro e estatísticas (bloqueado a admin)
- `backend/api/urls.py` — rotas `/stats/uso/` e `/stats/uso/evento/`
- `backend/tcc_backend/settings.py` — CORS dinâmico via env
- `views/layouts/main.pug` — inclui o banner de cookies
- `views/partials/cookie-banner.pug` — banner LGPD (novo)
- `public/assets/js/app.js` — rastreamento anônimo, consentimento, navbar admin, modal estatísticas
- `public/assets/js/favoritos.js` — eventos favorite/unfavorite
- `public/assets/css/app.css` — CSS do banner e do modal de estatísticas

---

## 5. LGPD (consentimento)

O banner `cookie-banner.pug` define o cookie `tcc_cookie_consent` (12 meses) com três valores possíveis:
- `analytics` — usuário aceitou estatísticas anônimas
- `essenciais` — recusou analytics
- `all` — (futuro) aceitou tudo

O rastreamento de estatísticas (`registrarEventoUso`) só dispara quando `window.__cookieConsent === true`. Sem dados pessoais são coletados: apenas `animal_id`, tipo de evento, termo de busca e carimbo de data/hora.
