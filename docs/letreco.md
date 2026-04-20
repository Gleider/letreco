# Letreco

Jogo de adivinhar palavras de 5 letras em português brasileiro, inspirado no Wordle. Disponível em [letreco.gleider.dev](https://letreco.gleider.dev).

## Stack

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS 4
- **Backend:** NestJS 11 + Prisma ORM + PostgreSQL (AWS RDS)
- **Monorepo:** Turborepo + pnpm workspaces
- **Infra:** AWS EC2 + ECR + RDS (via Terraform no repo gleider-dev)
- **CI/CD:** GitHub Actions — push na `main` roda testes e faz deploy automaticamente

## Estrutura do Projeto

```
letreco/
├── apps/
│   ├── api/                    → NestJS backend (porta 3002)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   → Modelos: Word, DailyWord, GameSession
│   │   │   └── seed.ts         → Seed do banco a partir de words.json
│   │   └── src/
│   │       ├── game/
│   │       │   ├── game.controller.ts  → POST /game/guess, GET /game/status
│   │       │   ├── game.service.ts     → Lógica de sessão e tentativas
│   │       │   └── game.logic.ts       → Algoritmo de avaliação (correct/present/absent)
│   │       ├── word/
│   │       │   ├── word.service.ts     → Rotação diária, validação de palavras
│   │       │   ├── word.scheduler.ts   → Cron job: rotação ao meio-dia BRT
│   │       │   └── __tests__/          → Testes de validação do word list
│   │       ├── prisma/                 → PrismaService (conexão com banco)
│   │       └── seed/
│   │           ├── words.json          → 8445 palavras de 5 letras (a-z apenas)
│   │           └── run-seed.ts         → Script de seed
│   └── web/                    → Next.js frontend (porta 3000)
│       ├── app/
│       │   ├── layout.tsx      → HTML base, fonte Inter, dark theme
│       │   ├── page.tsx        → Página principal do jogo
│       │   └── globals.css     → Animação pop para digitação
│       ├── components/
│       │   ├── game-board.tsx  → Grid 6x5 de tiles
│       │   ├── game-row.tsx    → Uma linha de 5 tiles
│       │   ├── game-tile.tsx   → Tile individual com animação de flip
│       │   ├── keyboard.tsx    → Teclado virtual QWERTY
│       │   └── stats-modal.tsx → Modal de estatísticas + compartilhar
│       └── lib/
│           ├── api-client.ts   → Chamadas HTTP para a API
│           └── storage.ts      → localStorage: playerId + stats
└── packages/
    └── shared/                 → Tipos compartilhados (LetterStatus, GuessResult, GameStats)
```

## Como Rodar

```bash
pnpm install
docker compose up -d            # PostgreSQL local
pnpm db:migrate                 # Rodar migrations
pnpm db:seed                    # Popular banco com palavras
pnpm dev                        # Sobe web (3000) e api (3002)
```

## Modelo de Dados

### Word
Cada palavra do dicionário. Apenas palavras de 5 letras com caracteres `a-z` (sem acentos).

| Campo    | Tipo       | Descrição                         |
|----------|------------|-----------------------------------|
| id       | Int (PK)   | Auto-incremento                   |
| text     | String(5)  | Palavra em minúsculas, única      |
| usedAt   | DateTime?  | Quando foi usada como palavra do dia |

### DailyWord
A palavra selecionada para cada dia.

| Campo      | Tipo      | Descrição                           |
|------------|-----------|-------------------------------------|
| id         | Int (PK)  | Auto-incremento                     |
| date       | Date      | Data do jogo (única)                |
| gameNumber | Int       | Número sequencial do jogo (único)   |
| wordId     | Int (FK)  | Referência para Word                |

### GameSession
Sessão de cada jogador para cada palavra do dia.

| Campo       | Tipo       | Descrição                                  |
|-------------|------------|--------------------------------------------|
| id          | Int (PK)   | Auto-incremento                            |
| playerId    | String(36) | UUID do jogador (gerado no localStorage)   |
| dailyWordId | Int (FK)   | Referência para DailyWord                  |
| attempts    | JSON       | Array de `{ guess, results }`              |
| status      | String(10) | `playing`, `won` ou `lost`                 |
| createdAt   | DateTime   | Data de criação                            |
| updatedAt   | DateTime   | Última atualização                         |

Constraint único: `(playerId, dailyWordId)` — um jogador por palavra do dia.

## API

### POST /game/guess
Envia uma tentativa de adivinhação.

**Headers:** `X-Player-Id: <uuid>`
**Body:** `{ "guess": "mundo" }`

**Resposta:**
```json
{
  "results": ["correct", "absent", "present", "absent", "correct"],
  "attempt": 3,
  "gameOver": false,
  "won": false,
  "gameNumber": 42
}
```

- `results`: Array de 5 status — `correct` (verde), `present` (amarelo), `absent` (cinza)
- Quando `gameOver: true`, inclui `revealedWord` com a resposta

**Validações:**
- Palavra deve ter exatamente 5 letras (`a-z`)
- Palavra deve existir no dicionário (tabela Word)
- Máximo de 6 tentativas por jogo
- Jogador não pode jogar novamente após terminar

### GET /game/status?playerId=<uuid>
Retorna o estado atual do jogo para o jogador.

**Resposta:**
```json
{
  "status": "playing",
  "attempts": [
    { "guess": "mundo", "results": ["correct", "absent", "present", "absent", "correct"] }
  ],
  "gameNumber": 42
}
```

## Lógica de Avaliação (game.logic.ts)

Algoritmo de dois passes, idêntico ao Wordle original:

1. **Passe 1 (verdes):** Marca letras na posição correta como `CORRECT`. Remove da lista de letras disponíveis.
2. **Passe 2 (amarelos):** Para letras não marcadas como `CORRECT`, verifica se existem na lista restante. Se sim, marca como `PRESENT` e remove da lista.
3. Letras não encontradas ficam como `ABSENT`.

Isso garante que letras duplicadas sejam tratadas corretamente — uma letra só é marcada como `PRESENT` se ainda houver ocorrências não-consumidas na resposta.

## Rotação de Palavras

### Cron Job (word.scheduler.ts)
- Executa diariamente às **12:00 BRT** (15:00 UTC) via `@Cron('0 15 * * *')`
- Chama `wordService.rotateDailyWord()`

### Seleção de Palavra (word.service.ts)
1. Busca palavras que nunca foram usadas (`usedAt IS NULL`) ou foram usadas há mais de 1 ano
2. Filtra apenas palavras keyboard-compatible via regex PostgreSQL: `text ~ '^[a-z]{5}$'`
3. Seleciona aleatoriamente com `OFFSET random`
4. Cria registro em `DailyWord` com `gameNumber` sequencial
5. Atualiza `usedAt` na palavra selecionada

### Garantia de Palavra no Boot
`onModuleInit()` verifica se existe uma `DailyWord` para hoje. Se não, cria uma automaticamente.

## Frontend

### Identificação do Jogador
- UUID gerado via `crypto.randomUUID()` e salvo no `localStorage`
- Enviado como header `X-Player-Id` em todas as requisições
- Sem necessidade de login/cadastro

### Componentes

#### GameBoard (game-board.tsx)
Grid de 6 linhas x 5 colunas. Renderiza:
- Linhas com tentativas já enviadas (com cores de resultado)
- Linha atual sendo digitada (com borda branca)
- Linhas vazias restantes (com borda cinza)

#### GameTile (game-tile.tsx)
Tile individual com 4 estados visuais:
- **Vazio:** Borda cinza `#1f2937`
- **Digitando:** Borda branca + animação pop (scale 1→1.1→1)
- **Correto:** Fundo verde `#059669`
- **Presente:** Fundo amarelo/âmbar `#d97706`
- **Ausente:** Fundo cinza `#374151`

**Animação de revelação:** Flip vertical via `scaleY` (1→0→1) com 250ms. A cor é aplicada no ponto médio quando o tile está "de lado" (`scaleY(0)`), criando o efeito de virar e revelar.

#### GameRow (game-row.tsx)
Linha de 5 tiles. Quando `isRevealing`, aplica delay escalonado de 300ms por tile (0ms, 300ms, 600ms, 900ms, 1200ms), criando o efeito de revelação letra por letra.

`REVEAL_TOTAL_MS = 300 * 4 + 500 = 1700ms` — tempo total da animação exportado para sincronizar com a atualização do teclado.

#### Keyboard (keyboard.tsx)
Teclado virtual QWERTY com 3 linhas:
- `Q W E R T Y U I O P`
- `A S D F G H J K L`
- `ENTER Z X C V B N M ⌫`

As teclas mudam de cor conforme o jogador faz tentativas:
- Verde (`#059669`): letra correta confirmada
- Amarelo (`#d97706`): letra presente em outra posição
- Cinza (`#374151`): letra ausente
- Padrão (`#1f2937`): ainda não usada

Prioridade de cores: `CORRECT (3) > PRESENT (2) > ABSENT (1)`. Uma tecla nunca "rebaixa" de verde para amarelo.

#### StatsModal (stats-modal.tsx)
Modal de estatísticas exibido após o jogo terminar ou ao clicar no ícone de gráfico:
- **Jogos:** Total de partidas
- **Vitórias:** Percentual de vitórias
- **Sequência:** Streak atual de vitórias consecutivas
- **Melhor:** Maior streak histórico
- **Distribuição:** Barras horizontais mostrando quantas vezes acertou em 1, 2, 3, 4, 5 ou 6 tentativas
- **Countdown:** Timer até a próxima palavra (meio-dia BRT)
- **Compartilhar:** Copia resultado em formato emoji (🟩🟨⬛) para o clipboard

### Detecção de Nova Palavra (page.tsx)

O frontend detecta quando o servidor rotaciona a palavra do dia via 3 mecanismos:

1. **`visibilitychange`**: Re-consulta a API quando o usuário volta à aba
2. **Polling 60s**: `setInterval` a cada 60 segundos
3. **`gameNumber` via `useRef`**: Compara o `gameNumber` retornado pela API com o armazenado. Se diferente, reseta todo o estado do jogo

### Input
- **Teclado virtual:** Click/touch nas teclas
- **Teclado físico:** `keydown` listener filtrando `a-zA-Z`, `Enter`, `Backspace`
- Input bloqueado durante animação de revelação (`isRevealing`)
- Input bloqueado após jogo terminar (`gameStatus !== 'playing'`)

### Estatísticas Locais (storage.ts)
Salvas no `localStorage` com a chave `letreco-stats`:
```typescript
{
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  distribution: Record<number, number>; // { 1: 0, 2: 0, ..., 6: 0 }
}
```

## Deploy

### CI/CD (deploy.yml)
Push na `main` dispara automaticamente:
1. **Job test:** `pnpm install` + `pnpm test`
2. **Job deploy** (depende de test):
   - Build imagens Docker (API + Web)
   - Push para AWS ECR
   - SCP do `docker-compose.prod.yml` para EC2
   - SSH: pull + `docker compose up -d`

### Infraestrutura
- **EC2:** Roda os containers Docker (API porta 3002, Web porta 3000)
- **RDS PostgreSQL:** Banco persistente compartilhado com gleider-dev (instância separada por database)
- **ECR:** Registry das imagens Docker
- **Terraform:** Lifecycle `prevent_destroy = true` em EC2 e RDS para evitar destruição acidental

### Variáveis de Ambiente

| Variável              | Onde          | Descrição                           |
|-----------------------|---------------|-------------------------------------|
| DATABASE_URL          | API           | Connection string do PostgreSQL     |
| PORT                  | API           | Porta do servidor (3002)            |
| CORS_ORIGIN           | API           | Origem permitida para CORS          |
| NEXT_PUBLIC_API_URL   | Web (build)   | URL da API (build-time)             |

## Banco de Palavras

- **8445 palavras** de 5 letras em português brasileiro
- Apenas caracteres `a-z` (sem acentos, cedilha, til)
- Fonte: lista das palavras mais usadas na língua portuguesa, filtrada
- Validação via regex `/^[a-z]{5}$/` tanto no seed quanto na query de seleção
- Palavras usadas têm cooldown de 1 ano antes de serem reutilizadas
- Testes automatizados garantem que o `words.json` não contém palavras inválidas, duplicadas ou com menos de 5000 entradas

## Admin API

Endpoints sob `/admin/*` são consumidos pelo painel `gleider.dev/admin` via `apps/web/lib/api-server.ts`.

### Autenticação

Todos os endpoints exigem JWT HS256 no header `Authorization: Bearer <token>`. O token é assinado com `API_JWT_SECRET` (a **mesma** string compartilhada com `gleider-dev`). Sem token → 401. Token expirado → 401. Role ≠ admin → 403.

```bash
# Gerar token para teste local (Node REPL)
node -e "
const { SignJWT } = require('jose');
const secret = new TextEncoder().encode('dev-shared-secret');
new SignJWT({ sub: 'gleider', role: 'admin' })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(secret)
  .then(t => console.log(t));
"
```

### Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/words?q=&page=&pageSize=` | Lista/busca palavras (paginado, max 200/página) |
| POST | `/admin/words` body `{ text }` | Adiciona palavra (`^[a-z]{5}$` + dedupe) |
| DELETE | `/admin/words/:id` | Remove palavra (409 se referenciada por DailyWord) |
| GET | `/admin/daily-words?limit=` | Últimas N DailyWords (desc por data, default 30) |
| GET | `/admin/daily-words/today` | Palavra de hoje + `activeSessions` count |
| POST | `/admin/daily-words/today` body `{ wordId }` | Troca palavra do dia (invalida sessions) |
| POST | `/admin/daily-words/rotate` | Força rotação aleatória (igual ao cron) |
| POST | `/admin/daily-words/schedule` body `{ date, wordId }` | Agenda palavra futura (`YYYY-MM-DD`) |
| DELETE | `/admin/daily-words/schedule/:date` | Desfaz agendamento pendente |

### Variáveis de Ambiente

- `API_JWT_SECRET` — string aleatória forte, **deve ser igual** ao `API_JWT_SECRET` do `gleider-dev`. Rotação exige redeploy de ambos os serviços.
- Boot da API falha explicitamente se `API_JWT_SECRET` não estiver definido.

Ver `.env.example` para referência de todas as variáveis.

## Design

- **Dark theme:** Fundo `#030712` (gray-950), texto claro
- **Mobile-first:** Tiles e teclado responsivos com breakpoint `sm:`
- **Paleta de cores:**
  - Verde `#059669` — letra correta
  - Âmbar `#d97706` — letra presente
  - Cinza `#374151` — letra ausente
  - Cinza escuro `#1f2937` — teclas/tiles não usados
  - Fundo `#030712` — background
- **Tipografia:** Inter (Google Fonts), monospace para letras nos tiles
- **Animações:**
  - Pop: scale 1→1.1→1 ao digitar letra
  - Flip: scaleY 1→0→1 ao revelar resultado (300ms entre cada tile)
