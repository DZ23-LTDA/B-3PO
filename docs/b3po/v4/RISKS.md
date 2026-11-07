---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# RISKS — ordenado por risco, com o que o justifica

> Severidade: `BLOCKER` / `CRITICAL` / `HIGH` / `MEDIUM` / `LOW`. Cada risco cita a evidência que o
> sustenta. **Nenhum risco aqui é hipotético**: ou foi medido, ou aponta a linha onde a condição
> existe.

## Nenhum `BLOCKER` ou `CRITICAL` aberto

O produto **inicializa, renderiza e passa seus gates**. Não há perda de dados em curso, não há
vazamento conhecido, não há rota quebrada no caminho principal. O que segue são riscos reais de
grau menor — e a lista existe porque esconder isso seria pior que o risco.

## HIGH

### R1 — 36 stores persistem JSON independente, sem transação nem escrita atômica

**Evidência**: `electron/*-store.ts` (36 arquivos); `sales-store.ts:86` mostra o padrão
`join(userDataDir, 'b3po', 'sales.json')`. **Não há helper compartilhado** — cada store tem o seu
`readFileSync` + `JSON.parse` + validação.

**Impacto**: o fluxo *pedido → estoque → financeiro* atravessa três arquivos. Uma falha no meio deixa
os três em estados diferentes, e não há como reverter. Um crash durante a escrita deixa o arquivo
truncado.

**Não foi verificado** se cada store grava em arquivo temporário + rename (atômico). **Isso precisa
ser auditado antes de qualquer fluxo transacional real.**

### R2 — duas superfícies IPC para a mesma informação

**Evidência**: `window.hermesDesktop.<dominio>.*` (50 domínios) e
`window.hermesDesktop.api({path, method, body})` (33 routers Python) em
`ARCHITECTURE_CURRENT.md` §2.

**Impacto**: um domínio pode estar correto numa superfície e desatualizado na outra, e **nenhum gate
compara as duas**.

### R3 — 16 de 50 canais IPC sem `exigirAtor`

**Evidência**: `permission-coverage-ratchet.test.ts` mede **50 canais, dívida 16**.

**Impacto**: canal sem verificação de ator no host é confiança na UI. O ratchet impede que aumente,
mas não impede que exista.

## MEDIUM

### R4 — `contextBridge` congelado impossibilita teste de falha em runtime

**Evidência**: medido na r3 do V4. Atribuir a `hermesDesktop.agents.roster` é **silenciosamente
ignorado**. Documentado no próprio `home-b3po.test.tsx`.

**Impacto**: o caminho de erro da UI só é provável por teste de componente. Um teste de integração
"a tela aguenta a API cair" **não existe e não é trivial**.

### R5 — `sofia.status()` responde `{ error }`

**Evidência**: medido em runtime (`v4-sofia`), chaves `["error"]`.

**Impacto**: qualquer superfície que dependa do status da Sofia recebe erro. A home trata como
`estado: 'erro'` (correto), mas o defeito no backend continua.

### R6 — gateway Python não é testável nesta máquina

**Evidência**: `pytest tests/gateway/` → `91 errors during collection` por
`ModuleNotFoundError: aiohttp`; `scripts/run_tests.sh` exige bash, ausente.

**Impacto**: **o backend inteiro é `NOT_TESTED`** daqui. É o maior buraco de verificação que existe.

### R7 — a casca do app tem piso de ~509px e clipa abaixo disso

**Evidência**: medido na r3 do V4. Cadeia: `DIV w=481 → w=485 → w=344` num slot de 344px. A app
declara `MIN_WIDTH = 400` (`electron/window-state.ts:11`).

**Impacto**: entre 400 e ~509px o conteúdo é **clipado sem scroll** (o container tem
`overflow: hidden`). A home **não é a causa** — ela obedece `w-full` do pai.

## LOW

### R8 — `docs/b3po/v4/` nasceu nesta rodada

Os cinco documentos exigidos pelo G0 só existem a partir de 07/11. Antes disso, o inventário estava
só na cabeça de quem rodou a sessão.

### R9 — Marketplace e Relatórios não existem como rota

A instrução do dono é só exibi-los quando forem operacionais. Hoje **não** são, e **não** aparecem.

## O que **não** é risco, e vale registrar

| Item | Por quê |
|---|---|
| "110 falhas de symlink" | **eram 3**. O número se perpetuou por cópia de handoff; recontado em 07/11 |
| 27 falhas do desktop | classificadas por nome (`BASELINE.md` §5): empacotamento, rede, GPU, flaky. **0 de lógica de produto** |
| `axe` 0 | medido com `axe.run(document, {})` **sem filtro de regras**; `axe` zero **não** é conformidade WCAG total |
| modo ≠ permissão | invariante testada desde a r121 |
