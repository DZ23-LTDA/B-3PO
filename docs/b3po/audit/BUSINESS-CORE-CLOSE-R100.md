# Business Core — fechamento da faixa 76–100

**Rodada 100 de 256.** 391 commits em `b3po-brand` acima de `main`.

## Números medidos (não estimados)

| Medida | Valor | Como foi contado |
|---|---|---|
| Stores de domínio | **20** (16 ERP + 4 CRM) | `*-store.ts` em `electron/` |
| Canais IPC registrados | **36** arquivos `*-ipc.ts` | idem |
| Telas com `index.tsx` | **32** | diretórios em `src/app/` |
| Itens de menu do produto | **17** + 5 do núcleo | plugin `b3po-nav` |
| Testes de privacidade | **19** | `privacy*.test.ts` |
| Testes do menu | **9** | `b3po-nav/plugin.test.ts` |
| Canais com tenant do renderer | **0** | medido após r89 |
| Gate | **14 checks, ok** | `scripts/check` |
| Typecheck | **2 projetos, 0 erros** | `check-b3po-types` sem flag |
| Docs de auditoria | **30** | `docs/b3po/audit/*.md` |

## O que a faixa entregou

### Domínios (20 stores, todos em JSON atômico sob `userData/b3po/`)

catálogo · estoque · vendas · financeiro · agenda · compras · empresas · serviços · RH · atendimento ·
pós-venda · marketing · automações · documentos · analytics (puro) + 4 de CRM (contatos, conversas,
pipeline, tarefas).

Cada um com: store, IPC, cliente `src/api`, tela, testes. `analytics` é a exceção deliberada — é puro,
não guarda nada.

### Isolamento multitenant

**17 domínios** filtram por tenant. `companies` não filtra por decisão: a empresa **é** o tenant.

Decisão do proprietário na r92: **uma instalação = uma empresa**. `serverTenant()` é constante e o
tenant **nunca** vem do renderer.

### Segurança (r85–r90)

IDOR fechado em **7 canais**: `documents`, `finance`, `inventory`, `sales`, `purchases`, `catalog`,
`scheduling`. Zero chamadas com tenant do renderer.

### LGPD (r91–r95, r99)

| Direito | Estado |
|---|---|
| Acesso (art. 18, I) | `exportarTitular` — testado |
| Eliminação (art. 18, VI) | `aplicarAnonimizacao` — anonimiza, preserva o fato fiscal |
| Tela | `/privacidade` — **verificada na tela real** |
| Consentimento | **não existe** |

### Navegação (r96–r99)

Antes: **1** item de menu para o produto (kanban). Depois: **17**.

Três defeitos que só a tela mostrou:

| Rodada | Defeito |
|---|---|
| 96 | 22 telas inalcançáveis pela interface |
| 97 | 3 ícones inválidos (`cart`, `wallet`, `building` não existem) |
| 99 | ponte em `window.hermes` em vez de `hermesDesktop` |

## O que a faixa NÃO entregou

| Item | Estado | Por quê |
|---|---|---|
| `multiagent funcional` | **PARCIAL** | sem credencial de provider (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY` ausentes) — nenhum turno de agente observado |
| Consentimento LGPD | NOT_IMPLEMENTED | campo/base legal não existe no CRM |
| WhatsApp real (envio) | BLOCKED_BY_EXTERNAL_DEPENDENCY | 9 variáveis `WHATSAPP_CLOUD_*` do proprietário |
| Telas de RH/marketing/pós-venda | não verificadas visualmente | só as 8 principais foram abertas |
| `fs-ipc`/`terminal-ipc` | não auditados | path traversal |

## Critérios de conclusão (de 32)

**Atendidos: 16.** O bloco desta faixa cobre: fonte canônica por domínio (parcial), produtos, estoque,
compras, vendas, financeiro, agendamentos, atendimento, pós-venda, RH, marketing, automações,
isolamento multitenant, permissões, testes, documentação.

## O que a faixa ensinou

**Cinco defeitos apareceram na tela, não no teste:**

| Onde | Teste dizia | Realidade |
|---|---|---|
| r96 | rotas resolvem | ninguém chegava nelas |
| r97 | plugin contribui | 3 itens sem ícone |
| r97 | typecheck ok | commitei com tipo quebrado |
| r99 | canais montados | ponte no nome errado |

**O padrão:** cada camada testada isoladamente, e o **meio** entre elas quebrado. O teste de rota e o
teste de plugin passaram enquanto o usuário não conseguia abrir nada.

**A regra que fica:** para qualquer coisa que o usuário **vê**, a verificação termina numa captura do app
construído. Teste de unidade prova que a peça existe; não prova que ela chegou.
