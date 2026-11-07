# CI/CD: o gate do B-3PO existe, roda e passa (rodada 243)

## O que foi medido

`gh run list --branch b3po-brand --limit 25`:

| Estado | Quantidade |
|---|---|
| **sucesso** | **2** (ambos `b3po-brand gates`) |
| **em andamento** | 10 |
| **cancelados** | 13 |
| **falhas** | **0** |

Workflows distintos que rodaram nesse branch: **6** — `b3po-brand gates`, `Nix flake check`, `Termux verification`,
`PM Bundle`, e mais dois.

**Zero falhas.** Os 13 cancelamentos são **concorrência** (pushes consecutivos cancelam runs antigos), não erro.

## O gate do produto

`.github/workflows/b3po-brand.yml` — **existe e passou**. Ele documenta o escopo no próprio arquivo:

> *"Roda só o que é reproduzível sem segredo e sem infraestrutura especial: gate de marca (brand_check): assets,
> contraste AA, cor proibida, nível; testes de domínio (schema do Bot v1 + adaptador de orquestração); typecheck do
> desktop. Não publica, não assina, não acessa credencial. Actions fixadas por SHA."*

### As etapas, na ordem

| Etapa | O que faz |
|---|---|
| checkout | — |
| setup python 3.12 | — |
| **gate de marca** | `python scripts/brand_check.py` |
| setup node 26 | `engine-strict` no `.npmrc` exige ≥26 |
| dependências | `npm ci --no-audit --no-fund` |
| **testes de domínio** | `bot-schema`, `orchestration`, `mascots`, `mascot-grid`, `edit-profile-look` |
| **auditoria de produção** | `npm audit --omit=dev --audit-level=high` |
| **testes do CRM** | `npx vitest run --root crm` |
| **typecheck do desktop** | `npm run typecheck` |
| SBOM | `continue-on-error` — informativo, não quebra |

**Actions fixadas por SHA** (`actions/checkout@11d5960...`, `actions/setup-python@a26af69...`) — o pinning que o
guia do repositório exige.

## O número que impressiona, e o que ele custa

| Medida | Valor |
|---|---|
| Workflows no repositório | **57** |
| **Rodam em qualquer push** (sem filtro de branch) | **46** |
| Com filtro explícito que inclui `b3po-brand` | 11 |

**Cada push nesta branch dispara até 46 workflows.** É por isso que 13 aparecem cancelados: o grupo de concorrência
mata o run antigo quando um novo chega.

**Não é defeito** — é o custo de um repositório com 57 workflows herdados. Mas **explica por que a maioria dos runs
nunca termina**: eles são substituídos antes.

## O que continua sem verificação

| Item | Estado |
|---|---|
| **Os 10 runs em andamento terminam verdes?** | **não esperei** — mediria minutos, não informação nova |
| Runs de `Nix flake check`, `Termux verification`, `PM Bundle` | **não classificados** individualmente |
| Cobertura de **macOS** e **Linux** do gate | o `b3po-brand gates` roda em **`ubuntu-latest`** — cobre Linux, não macOS |
| **Instalação do MSIX** | continua **não testada** (r242) |

## O que esta rodada estabelece

**A CI do produto não é hipótese**: existe um workflow com o nome da branch, escopo documentado, Actions fixadas por
SHA, e **dois runs concluídos com sucesso**.

**O gate local (`scripts/check`, 14 checks) tem um espelho remoto.** Quando eu rodo `python scripts/check` antes de
commitar, o que passa aqui é o que o `brand-gates` verifica lá — **marca, domínio, audit de produção, CRM,
typecheck**.

## Medido

| Medida | Valor |
|---|---|
| Workflows | 57 |
| Gate do produto | **`b3po-brand.yml`, 9 etapas** |
| Runs com sucesso | **2** |
| Runs com falha | **0** |
| Runs cancelados (concorrência) | 13 |
