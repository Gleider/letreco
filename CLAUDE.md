# Letreco

Clone do Wordle em português brasileiro. Disponível em [letreco.gleider.dev](https://letreco.gleider.dev).

Documentação completa: `docs/letreco.md`

## Stack

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS 4
- **Backend:** NestJS 11 + Prisma ORM + PostgreSQL (AWS RDS)
- **Monorepo:** Turborepo + pnpm workspaces
- **CI/CD:** GitHub Actions — push na `main` roda testes e deploy automático para EC2

## Estrutura

```
apps/web/           → Next.js frontend (porta 3000)
apps/api/           → NestJS backend (porta 3002)
packages/shared/    → Tipos compartilhados (LetterStatus, GuessResult, GameStats)
docs/               → Documentação do projeto
docs/solutions/     → Soluções documentadas de problemas resolvidos (YAML frontmatter, pesquisável por module, tags, problem_type)
```

## Como rodar

```bash
pnpm install
docker compose up -d            # PostgreSQL local
pnpm db:migrate
pnpm db:seed
pnpm dev                        # web (3000) + api (3002)
```

## Convenções

- **Dark theme** fixo (bg-gray-950, texto claro) — sem toggle light/dark
- **Português** como idioma do conteúdo e mensagens de erro
- Conventional commits: `feat:`, `fix:`, `refactor:`
- Palavras do jogo: apenas `a-z` (sem acentos), validadas por regex `/^[a-z]{5}$/`
- Rotação de palavra: **meio-dia BRT** (15:00 UTC), cron `'0 15 * * *'`
- Identificação do jogador: UUID no localStorage, sem login
- Estatísticas salvas no localStorage do navegador

## API

- `POST /game/guess` — envia tentativa (header `X-Player-Id`, body `{ "guess": "..." }`)
- `GET /game/status?playerId=<uuid>` — estado atual do jogo

## Infraestrutura

- EC2 + RDS compartilhados com gleider-dev (Terraform no repo gleider-dev)
- Imagens Docker no ECR (`letreco-api`, `letreco-web`)
- `NEXT_PUBLIC_API_URL` é variável de build-time no Dockerfile do web
- Terraform com `lifecycle { prevent_destroy = true }` em EC2 e RDS
