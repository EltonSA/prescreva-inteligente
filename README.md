# Prescreva Inteligente

Sistema SaaS para prescrições magistrais dermatológicas com inteligência artificial.

## Stack

- **Frontend**: Next.js 15 (App Router) + TailwindCSS + shadcn/ui
- **Backend**: Fastify + Prisma ORM
- **Banco**: PostgreSQL
- **IA**: OpenAI / Gemini / Claude (configurável pelo painel admin)

## Estrutura

```
PRESCREVA/
├── apps/
│   ├── api/         → Backend Fastify + Prisma
│   │   ├── prisma/  → Schema e migrations
│   │   └── src/
│   │       ├── config/     → Env, Prisma client
│   │       ├── middleware/  → Auth JWT
│   │       ├── modules/    → Routes (auth, users, patients, ativos, formulas, ai, conversations)
│   │       └── services/   → AI, embeddings
│   └── web/         → Frontend Next.js
│       └── src/
│           ├── app/        → Pages (App Router)
│           ├── components/ → UI + Layout
│           ├── contexts/   → Auth context
│           └── lib/        → API client
├── infra/
│   └── docker-compose.yml  → PostgreSQL local
├── .env.example             → Modelo de variáveis de ambiente
└── .gitignore
```

## Pré-requisitos

- Node.js 18+
- PostgreSQL 16+ (ou Docker)
- npm

## Configuração Local

### 1. Variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com seus valores
```

### 2. Banco de dados

**Opção A** - Docker:
```bash
cd infra
docker-compose up -d
```

**Opção B** - PostgreSQL local:
Crie o banco `prescrevadb` com usuário `postgres`.

### 3. Backend

```bash
cd apps/api
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API disponível em `http://localhost:3333`

### 4. Frontend

```bash
cd apps/web
npm install
npm run dev
```

Frontend disponível em `http://localhost:3000`

## Credenciais de Desenvolvimento

> Criadas pelo seed. **Não use em produção.**

| Tipo | Email | Senha |
|------|-------|-------|
| Admin | admin@prescreva.com | admin123 |
| Usuário | usuario@prescreva.com | user123 |

## Módulos

- **Dashboard**: Estatísticas e ações rápidas
- **Usuários** (Admin): CRUD de usuários com roles
- **Pacientes**: CRUD completo com dados dermatológicos
- **Ativos**: Base de conhecimento com upload de PDFs
- **Fórmulas**: Biblioteca de fórmulas com categorias e tags
- **Criar com IA**: Chat inteligente para gerar fórmulas magistrais
- **Configurações** (Admin): Prompt do sistema, provedor de IA e API Key

## Funcionalidades

- Autenticação JWT com roles (ADMIN / USER)
- Chat com IA contextualizado (dados do paciente + base de ativos)
- Upload e processamento de PDFs (RAG com embeddings)
- Salvamento, favoritos e versionamento de fórmulas com IA
- Sync de dados com Bubble (ativos e fórmulas)
- UI responsiva estilo SaaS com tema verde

## Variáveis de Ambiente

Veja `.env.example` na raiz do projeto. As principais:

| Variável | Descrição | Obrigatória em Prod |
|----------|-----------|:-------------------:|
| `NODE_ENV` | `development` ou `production` | Sim |
| `DATABASE_URL` | Connection string do PostgreSQL | Sim |
| `JWT_SECRET` | Chave secreta para tokens JWT | Sim |
| `CORS_ORIGIN` | Domínio(s) permitidos (separar por vírgula) | Sim |
| `NEXT_PUBLIC_API_URL` | URL pública da API | Sim |
| `API_PORT` | Porta da API (padrão: 3333) | Não |
| `OPENAI_API_KEY` | Chave da OpenAI | Via painel admin |
| `BUBBLE_API_TOKEN` | Token para sync com Bubble | Se usar sync |

## Deploy em Produção

### Checklist pré-deploy

- [ ] Gerar JWT_SECRET forte: `openssl rand -hex 32`
- [ ] Configurar `DATABASE_URL` apontando para o banco de produção
- [ ] Definir `NODE_ENV=production`
- [ ] Definir `CORS_ORIGIN` com o(s) domínio(s) do frontend
- [ ] Definir `NEXT_PUBLIC_API_URL` com a URL pública da API
- [ ] **Trocar as senhas** dos usuários seed (admin123/user123) ou não rodar seed em produção
- [ ] Confirmar que `.env` e `node_modules` estão no `.gitignore`
- [ ] Rodar `npx prisma migrate deploy` (não `db push`) em produção

### Build

**Backend (API):**
```bash
cd apps/api
npm install
npx prisma generate
npm run build
NODE_ENV=production node dist/server.js
```

**Frontend (Web):**
```bash
cd apps/web
npm install
npm run build
npm start
```

### Endpoints úteis

| Endpoint | Descrição |
|----------|-----------|
| `GET /health` | Health check da API |
| `POST /auth/login` | Autenticação |
