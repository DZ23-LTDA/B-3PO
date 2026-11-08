---
tipo: inventario-de-engenharia
agente: dsh
projeto: c3po-bot
data: 2026-11-08
fase: V6-§3
revisao: r1
---

# V6 — Inventário de engenharia (13 capacidades que o studio precisa)

> §3 do contrato: *"Auditar se o B-3PO já consegue … Para cada capacidade, registrar IMPLEMENTED,
> PARTIAL, MISSING ou BLOCKED, com evidências."*

**Método**: cada linha saiu do **código**, não de documento anterior. Os documentos do V5 foram lidos
primeiro (`RETRATATIONS` → `REPORT_FINAL` → `HANDOFF` → `OPEN_BLOCKERS`), mas **nenhuma classificação
abaixo é herdada deles** — todas foram reconferidas nos arquivos.

**Baseline**: `HEAD ea5b13643f` · branch `b3po-brand` · `main` intacta (`f4cf411f28`) · worktree limpo.

## O resumo, primeiro

| # | Capacidade | Estado | O que falta |
|---|---|---|---|
| 1 | Criar projetos do zero | **PARTIAL** | cria o **registro** de projeto; não cria pasta nem arquivos |
| 2 | Abrir diretório / importar repositório | **PARTIAL** | abrir e escanear repositórios existe; **não há vínculo** entre projeto e pasta |
| 3 | Ler/editar/criar/excluir arquivos | **IMPLEMENTED** | 4 canais com guarda (`podeOperarMaquina` + `recusaSeNaoPuder`) |
| 4 | Terminal isolado | **IMPLEMENTED** | `node-pty` real, 6 canais, posse por janela (r10/r50), 33 testes |
| 5 | Instalar dependências | **PARTIAL** | só via terminal; sem capacidade dedicada nem detecção |
| 6 | Executar testes e builds | **PARTIAL** | só via terminal; sem ação orquestrada nem leitura de resultado |
| 7 | Git e GitHub | **IMPLEMENTED / PARTIAL** | 21 canais de Git local; GitHub via `gh` (depende de instalado+autenticado) |
| 8 | Preview funcional | **MISSING** | o "preview" é renderização de arquivo no painel, **não** app rodando em porta |
| 9 | Inspecionar console e rede | **MISSING** | não há captura de console/rede de app em preview |
| 10 | Coordenar subagentes | **PARTIAL** | roster/execuções/aprovações existem; **nada consome uma execução `pendente`** |
| 11 | Memória e checkpoints | **PARTIAL** | camadas de memória no gateway; checkpoint de execução existe (`retomar`) |
| 12 | Recuperar trabalho interrompido | **IMPLEMENTED** | `retomar` + `expirarPendentes` (V5 r39/r40/r43), endurecidos |
| 13 | Gerar artefatos e documentação | **PARTIAL** | a tela lista artefatos de sessão; **não gera** |
| 14 | Preparar deploy com aprovação | **MISSING** | nenhum canal, nenhum fluxo |

**Nenhuma capacidade é declarada IMPLEMENTED sem o caminho completo** — ler arquivo existe (#3), mas isso
não é "trabalhar num projeto" (#1) nem "entregar código" (#13).

## O bloqueio central da V6

**`sofia:delegar` cria a execução como `pendente` e nada a consome.**

Verificado por busca em `apps/desktop/electron`, `apps/desktop/src` e `hermes_cli`:

```
grep "assumirPendente|consomePendente|executarPendente|pendente.*executar|assumir("   -> 0 resultados
grep "agent_execution|execution_id.*pendente" em hermes_cli/                          -> 0 resultados
```

**O store de execuções é do processo principal do desktop.** O gateway — que é o runtime Hermes, o único
que sabe abrir sessão e rodar ferramenta — **não conhece esse store**.

**Consequência para o critério de aceite**: *"Coordenar pelo menos uma jornada de desenvolvimento"* não
pode ser satisfeito enquanto ninguém pegar o trabalho. O V5 entregou a **criação** do trabalho e o
**transporte do pedido**; falta o **consumo**.

## Detalhe por capacidade

### 1. Criar projetos do zero — PARTIAL

**Existe**: `hermes:projetos:criar` → `SofiaStore`-irmão `project-store.ts:114 criar()`.

**O que é um "projeto" aqui** (`project.ts`, campos reais): `objetivo, escopo, criterios, entregaveis,
equipe, orcamento_cents, prazo, status, tenant_id, id, nome, created_at, updated_at`.

**O que não existe**: **nenhum campo de caminho**. `grep "caminho|path|dir|pasta"` em `project.ts`
devolve uma única linha — um comentário. Um projeto **não sabe onde vive no disco**.

**Portanto**: criar projeto = criar **registro de coordenação**. Não há scaffold, não há `mkdir` de
projeto, não há template.

### 2. Abrir diretório / importar repositório — PARTIAL

**Existe**: `hermes:fs:openDir`, `hermes:selectPaths` (dialog nativo com `openDirectory`),
`hermes:fs:gitRoot`, `hermes:git:scanRepos` (varre repositórios).

**Falta**: o vínculo. Uma pasta aberta não vira "o projeto X"; o registro de projeto não aponta para ela.

### 3. Arquivos — IMPLEMENTED

**Canais**: `fs:readDir`, `fs:writeText`, `fs:rename`, `fs:trash` (+ `fs:reveal`, `fs:openDir`).

**Autorização**: os quatro de efeito passam por `podeOperarMaquina` e `recusaSeNaoPuder` — auditado por
canal na V5 r50 (4 de 4 com guarda).

### 4. Terminal isolado — IMPLEMENTED

`node-pty` real (`terminal-ipc.ts:13`). 6 canais. `attach`/`write`/`resize`/`cwd`/`dispose` exigem
**posse da janela** (`webContentsId === sender.id`) — r10 fechou quatro e a r50 o quinto.

### 5 · 6. Dependências, testes e builds — PARTIAL

**Não há canal de "instalar" nem de "rodar teste".** O caminho real é: abrir terminal e digitar.
Isso é **capacidade humana via PTY**, não capacidade do produto: nada detecta gerenciador de pacotes,
nada lê o resultado do teste, nada sabe se o build passou.

### 7. Git e GitHub — IMPLEMENTED (local) / PARTIAL (GitHub)

**21 canais** incluindo `repoStatus`, `branchList`, `worktree*`, `review:stage`, `review:unstage`,
`review:commit`, `review:push`, `review:createPr`.

**GitHub** depende de `gh` no PATH e autenticado (`git-review-ops.ts` augmenta PATH e trata
miss/unauthed sem lançar).

### 8 · 9. Preview e inspeção — MISSING

O que existe com nome "preview" é **renderização de arquivo** (`preview-row.tsx`,
`preview-script-runner.ts` roda script de pré-visualização do painel). **Não há servidor de preview**,
**não há porta**, **não há console/rede do app do usuário**.

### 10. Subagentes — PARTIAL

Canais: `agent:roster`, `agent:executions`, `agent:executions:cancel`, `agent:approvals`.

**O bloqueio central** (acima): nada consome `pendente`.

### 11 · 12. Memória, checkpoint e retomada — PARTIAL / IMPLEMENTED

- **Memória**: `apps/desktop/src/app/settings/memory/memory-layers.tsx` (UI sobre memória do gateway).
  A persistência é do runtime; **o desktop só a exibe**.
- **Retomada**: `agent-execution-store.retomar()` + `expirarPendentes()` — V5 r39/r40/r43. **IMPLEMENTED.**

### 13. Artefatos — PARTIAL

`artifact-utils.ts` + tela `#/artifacts`: **lista** os artefatos que a sessão produziu. Não há geração.

### 14. Deploy — MISSING

`grep` por `deploy` em `apps/desktop/electron` e `apps/desktop/src`: **nenhum arquivo**.

## Classificação da plataforma

| | |
|---|---|
| **B-3PO como IDE** (editar, terminal, git) | **PARTIAL** — as peças existem; falta o vínculo projeto↔pasta |
| **B-3PO como studio de agentes** | **NOT_READY** — nada consome `pendente` |
| **B-3PO como plataforma de entrega** | **NOT_READY** — sem preview, sem deploy, sem geração de artefato |

**A V6 não está READY**, e a razão principal é uma só: **o trabalho delegado não é executado**.

## O que a V6 precisa, em ordem de dependência

1. **Consumir `pendente`** — o gateway precisa saber que existe trabalho. Sem isso, nada em §6 e §7 é
   possível. **É o BLOCKER.**
2. **Vincular projeto a pasta** — §5 pede explorador de projetos; hoje projeto não tem caminho.
3. **Preview + console/rede** — §5 pede preview funcional.
4. **Ações de teste/build** — para o benchmark conseguir "executar testes e corrigir falhas".
5. **Deploy com aprovação** — último da fila; depende de 1–4.

**Inferência de modelo continua `BLOCKED_BY_EXTERNAL_DEPENDENCY`** (`EXT-3`, `providers: {}`): sem
credencial, nenhum benchmark real é possível e nenhuma jornada de agente completa.
