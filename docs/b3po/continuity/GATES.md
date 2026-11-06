# B-3PO — GATES DO V3

**Regra**: cada gate tem medição. `READY` só com evidência; `PARCIAL` diz o que falta.
**Atualizado**: 06/11/2026 · **HEAD**: `a5006074ca`

---

## G1 · Segurança / IPC / RBAC / tenant — **PARCIAL**

### O que está construído (medido)

| Componente | Estado | Evidência |
|---|---|---|
| **`rbac.ts`** | **READY** | 5 níveis (`READ · RECOMMEND · PREPARE · EXECUTE_ALLOWED · SUPERVISED_AUTONOMY`), 5 papéis (`viewer · operator · manager · owner · bot`), `can(actor, action, resource)` devolve `Decision` |
| **Escopo por bot** | **READY** | `rbac.ts:118` — *"Bot só age no domínio que lhe foi atribuído. Sem scopes declarados, não age em nenhum"* → `fora_do_escopo` |
| **Testes de permissão** | **READY** | **40 testes verdes**: `rbac` 16 · `permission-exigir-ator` 9 · `permission-guard` 10 · `permission-coverage-ratchet` 5 |
| **Tenant** | **READY (single-tenant)** | `DEFAULT_TENANT = 'local'`; **30 de 31 stores filtram** por `tenant_id`; `catalog-store.ts:6` — *"`tenant_id` existe desde o primeiro campo, mesmo com uma empresa só hoje"* |
| **Ator no IPC** | **READY** | `sofia-ipc.ts:131` — o ator vem do **resolvedor**, nunca do payload |

### O que falta — e não é pouco

**46 canais IPC, 16 sem guarda de permissão.** A lista está congelada por teste
(`expect(SEM_GUARDA).toHaveLength(16)`): **não pode crescer**, mas também **não encolheu nesta rodada**.

| Canal sem guarda | Risco |
|---|---|
| **`fs-ipc.ts`** | **acesso a arquivo** sem permissão |
| **`terminal-ipc.ts`** | **execução de comando** sem permissão |
| **`git-ipc.ts`** | operações de repositório |
| **`erp-ipc.ts`** | domínio de negócio inteiro |
| `agent-ipc.ts` · `clipboard-ipc.ts` · `lookup-ipc.ts` · `notification-ipc.ts` | superfícies de ação |
| `challenge-window-ipc.ts` · `hud-ipc.ts` · `pet-overlay-ipc.ts` · `plugin-files-ipc.ts` · `spellcheck-dictionary-ipc.ts` · `startup-latency-ipc.ts` · `ui-preferences-ipc.ts` | janelas/UI |

**O próprio teste explica por que não foram fechados na época**:

> *"Envolver 38 canais de uma vez significaria ligar autorização sem sujeito: hoje o produto não tem
> X, `actorOf()` devolve o dono da instalação. Uma guarda que sempre permite é pior que guarda
> nenhuma — **parece proteção**."*

**A dívida é consciente e honesta. Mas continua dívida.**

**Quando `actorOf()` passar a devolver atores com escopo real, os 16 precisam de guarda** — e
`fs`, `terminal` e `git` são os três primeiros da fila.

### O que NÃO foi verificado

| Item | Por quê |
|---|---|
| **RBAC com ator restrito** | o HOME tem um `owner` com `scopes: []`; sem um `viewer`/`bot` real, `can()` recusando não foi exercitado em runtime |
| **Isolamento entre dois tenants** | só existe `local`; o filtro existe mas nunca foi chamado com outro valor |
| **`actors-store` sem tenant** | atores são globais hoje — pode ser decisão, não esquecimento |
| **E2E de recusa** | os testes de permissão são unitários; não cliquei numa tela com ator sem escopo |

---

## G0 · Inventário, baseline e continuity — **READY**

| Item | Estado |
|---|---|
| inventário do git (branch, remotes, worktree, tags) | **READY** — `main` = `origin/main`, sem commit de produto |
| 11 arquivos de continuity | **7 criados** · faltam `TASK-QUEUE.json`, `DECISIONS.md`, `PLATFORM-MATRIX.txt`, `FINAL-DELIVERY.txt` |
| baseline de testes | medido em r275 (19.083 testes, 31 vermelhos, 12 de infra) |
| documentos de estado | `MASTER-STATE.md`, `MASTER-CHECKPOINT.json`, `BLOCKERS.md`, `AUDIT-MATRIX.md`, `TEST-EVIDENCE.md`, `PERFORMANCE.md`, `GATES.md` |

### Prova de runtime — a guarda não é decoração

**`permission-guard.ts` roda `can()` ANTES do handler**, com o ator resolvido **no processo
principal** — nunca do renderer:

```ts
const decision = can(actor, action, options.resource)
const entrada  = audit(actor, action, options.resource, decision, now)
if (!decision.allowed) return { error: 'sem_permissao', reason: decision.reason }
return handler()
```

**Medido na trilha em disco** (`%APPDATA%\B-3PO\b3po\auditoria.json`):

```
entradas: 837
  read projects     → permitido=True
  read companies     → permitido=True
  read automation    → permitido=True
  manage_actor admin → permitido=True
negadas: 0 de 837
```

**837 decisões registradas** provam que `can()` está em vigor. **Zero negativas** provam outra coisa:
**o único ator ativo é o `owner`**.

### O ator restrito — criado, medido e desativado

Criei um `viewer` real (`act_1793998122251_w87dst`, `level: READ`, `scopes: []`) para tentar uma
recusa de verdade.

**Não consegui fazer o IPC agir COMO ele**: `actorOf()` devolve sempre o dono da instalação. O
`admin-ipc.ts:41` já reconhece o caso — há um `role: 'viewer'` de bootstrap — mas **não há porta no
produto para "agir como outro ator"**, o que é **correto por segurança**: se houvesse, seria a
escalada de privilégio que o próprio `rbac.ts` proíbe.

**Resultado honesto**: a recusa está provada **em teste** (`rbac.test.ts:50` — *"viewer só lê"*,
`:58` — *"operator prepara mas não executa"*) e **não** em runtime, porque **não existe runtime com
dois atores ativos**. Isso é `NOT_TESTED`, não `PASS`.

O ator de teste foi **desativado** (`active: false`); o `owner` segue o único ativo.

### Correção do veredito

| Antes eu disse | O correto |
|---|---|
| "RBAC recusando em runtime: não testado" | **parcialmente resolvido**: a guarda está ativa (837 decisões), mas a **negativa** só existe em teste |

---

## G2 · Runtime / modelos / diagnóstico de inferência — **PARCIAL**

### O que existe e responde

| Superfície | Resposta medida |
|---|---|
| `/api/status` | `gateway_running: true` · `gateway_state: "running"` · `active_sessions: 0` · `release_date: "2026.9.24"` · `config_version: 52` |
| Componentes | `gateway ok` · `dashboard ok` (0 erros, selftest ok) · `storage ok` · `platforms ok` (0 configuradas) |
| `profiles.list` | `model: "anthropic/claude-opus-4.6"` · `provider: "auto"` · `skill_count: 44` |
| `setup.runtime_check` | **falha** — `no_provider_configured` (B1) |
| `runtime-readiness.ts` | 4 estados (`checking · needs_setup · ready · unavailable`) e motivo em toda negativa |

**O runtime ESTÁ de pé.** Gateway rodando, storage saudável, dashboard sem erro, versão de config
atual. **O problema é credencial, não processo.**

### Os dois diagnósticos que mentem

#### 1. `overall: "ok"` não inclui a inferência

`status.py:609`:

```python
status["overall"] = ("ok" if all(item.get("status") == "ok" for item in comp…))
```

**Os componentes são `gateway · dashboard · storage · platforms`. A inferência NÃO está entre eles.**

Medido: **`overall: "ok"` com `setup.runtime_check` falhando.** Uma pessoa que abra um painel de
saúde lê "tudo certo" enquanto o produto não consegue responder uma mensagem.

#### 2. `has_env: true` quando não há chave nenhuma

`hermes_cli/profiles.py:976`:

```python
has_env=(path / ".env").exists()
```

**É testemunho de EXISTÊNCIA DE ARQUIVO, não de credencial configurada.** Medido no HOME de teste:
`has_env: true` com **0 chaves ativas de 29** — o `.env` é o template inteiro, todo comentado.

**`has_env` não distingue "configurado" de "o arquivo está lá".** Quem ler `has_env: true` e
`provider: auto` vai concluir que a inferência está pronta. **Não está.**

### O que o produto acerta

- **`runtime-readiness.ts`** tem 4 estados e **devolve motivo em toda negativa** (`sem_nivel` não se
  aplica aqui; os motivos de inferência são o erro do backend e o default).
- **A recusa é explícita**: `gatewayUnavailable` + o painel com a frase acionável (corrigida no B1).
- **A trilha de auditoria foi exercitada** (ver G1): 837 decisões, incluindo `read` em `admin`.

### O que falta

| Item | Estado |
|---|---|
| **Inferência no `overall`** | **NÃO EXISTE** — diagnóstico de saúde ignora o item que mais falha |
| **`has_env` significar "tem chave"** | **NÃO** — só diz que o arquivo existe |
| **`/api/status` expor modelo/provider** | **NÃO** — só via `profiles.list` |
| **Diagnóstico de causa raiz na UI** | **PARCIAL** — o painel diz o que falta (após B1), mas não guia até a correção |
| **Teste de inferência sob demanda** | **NÃO LOCALIZADO** — há `setup.runtime_check`, mas não achei botão "testar conexão" na UI |

### Correção do veredito

**G2 = PARCIAL.** O runtime funciona; **o diagnóstico não conta a verdade inteira** — e num produto
cujo sintoma número um é "inferência indisponível", **um `overall: ok` que ignora a inferência é o
pior lugar para economizar**.

**Não corrigi** porque `status.py` é superfície compartilhada com o dashboard e a CLI: mudar o
`overall` para incluir inferência mudaria o veredito de saúde em todas as telas, e isso pede decisão
de produto sobre o que "saudável" significa.

---

## G3 · Domínio canônico CRM / Compras / Estoque / Vendas — **PARCIAL**

**Três dos quatro domínios passaram em E2E; Vendas passa com duas falhas de regra.**

| Domínio | Estado | Evidência |
|---|---|---|
| **Compras** | **READY** | 7 etapas medidas (B4): solicitação → cotação → aprovação → pedido → recebimento → estoque 3000 → financeiro R$ 150 |
| **Estoque** | **READY** | entrada +5000 → 6000 · saída −2000 → 4000 · inventário ajusta para 5000 (`ajustes: 1`) |
| **CRM** | **READY** | contato criado e listado (`Contato E2E r288`, `tenant_id: local`); pipeline e conversas têm `list/upsert/remove` |
| **Vendas** | **PARCIAL** | baixa no estoque + conta a receber funcionam; **SKU inexistente culpa o saldo** e **preço zero passa sem registro** |

### Estoque — o ciclo medido

```
antes:            {"E2E-001": 1000}
entrada +5000  →  {"E2E-001": 6000}   balance: 6000
saída   −2000  →  {"E2E-001": 4000}   balance: 4000
inventário      →  {"ajustes": 1, "ignoradas": [], "sem_diferenca": []}
final:            {"E2E-001": 5000}
```

**`kind` é obrigatório** (`entrada · saida · ajuste`) e **`saida` subtrai** (`inventory-store.ts:95`).
Sem ele: `kind_invalid`. **A validação está no lugar certo.**

### A divergência de campo no estoque

Chamei `append({ product_sku, kind, quantity_milli, motivo, referencia })` e o movimento gravou:

```json
{ "kind": "entrada", "product_sku": "E2E-001", "quantity_milli": 5000,
  "reason": "", "ref": "" }        ← motivo e referencia vazios
```

**O store lê `reason`/`ref`; eu mandei `motivo`/`referencia`.** O `api/inventory.ts` repassa o payload
**cru** (`api.append(payload)`), então **quem chama precisa saber os nomes em inglês** — e a tela de
estoque pode estar mandando os certos. **Não verifiquei qual a tela usa**, então não afirmo que é bug
de produto; afirmo que **é uma armadilha de contrato**.

### CRM — o que existe

| Bridge | Métodos |
|---|---|
| `crmContacts` | `list · upsert · remove` |
| `crmPipeline` | `list · upsert · remove` |
| `crmTasks` | `list · upsert · remove` |
| `crmConversations` | `list · upsert · remove` |

**CRUD completo nos quatro.** Contato criado carrega `tenant_id: local` e os campos de histórico
(`last_purchase_at`, `last_ticket_at`) — **o modelo antecipa o que ainda não aconteceu**, o que é
bom sinal de desenho.

### O que NÃO foi testado no G3

| Item | Por quê |
|---|---|
| CRM: `upsert` de **oportunidade** no pipeline | só listei; não criei estágio/oportunidade |
| CRM: `remove` em qualquer entidade | não apaguei (o ato destrutivo pede sua palavra) |
| Estoque: `kind: 'ajuste'` isolado | usei entrada/saída e o inventário, que já ajusta |
| Estoque: recusa de saída **sem saldo** | testei na venda (`saldo_insuficiente`), não no `append` direto |
| Vendas: ver item por item | já feito no B5 |

### Correção do veredito

**G3 = PARCIAL** por causa de **Vendas** (as duas falhas do B5). Os outros três domínios estão
`READY` com evidência de execução, não de leitura.

---

## G4 · Vertical gás/água E2E — **NOT_IMPLEMENTED**

**O V3 pede**: *"Vertical gás/água E2E com persistência, concorrência e auditoria."*

### A medição

| Busca | Resultado |
|---|---|
| `botijão`, `GLP`, `recarga`, `revenda`, `hidrômetro` em `src/app/**/*.tsx` | **1 ocorrência**, e é um `placeholder` |
| `vertical`, `segmento`, `nicho` em código | só `marketing-segments` e `segmented-control`, que são **de UI**, não de vertical |
| 754 ocorrências de `gas`/`agua` no repositório | **todas falsos positivos** — `watermark`, `minimax`, `m3` |

**A única ocorrência real** (`app/projetos/index.tsx:139`):

```tsx
placeholder="vender os botijões sem depender de telefone"
```

**É texto de exemplo num campo de projeto.** Não há tabela, rota, tela, bridge, store ou teste de
gás/água. **Alguém pensou no caso ao escrever o placeholder e nada além disso foi construído.**

### Por que isso importa

O B-3PO tem domínio de **CRM, Compras, Estoque, Vendas, Financeiro, Serviços, RH, Marketing,
Pós-venda, Documentos, Fiscal**. Uma revenda de gás/água **caberia inteira nesses domínios**:

| Necessidade da vertical | Já existe? |
|---|---|
| cliente que compra todo mês | **CRM** + `last_purchase_at` (o campo está lá) |
| botijão como produto com saldo | **Estoque** com `product_sku` |
| entrega no endereço | **Serviços** / `scheduled` |
| recarga (produto→serviço→produto) | **não há** conceito de vasilhame |
| comodato de botijão | **não há** |
| leitura de hidrômetro / m³ | **não há** unidade fracionada por leitura |

**A vertical não é "faltar uma tela"** — é **faltar o modelo**: vasilhame em comodato, recarga como
troca, e leitura periódica. **Nada disso se resolve com configuração.**

### Ação exata para desbloquear

**Não é bloqueio externo — é escopo não construído.** Precisa de decisão sua:

1. **Construir a vertical** — o que exige modelar vasilhame/comodato/leitura (não é uma rodada);
2. **Declarar fora de escopo neste ciclo** — e o G4 fica `NOT_IMPLEMENTED` no veredito final;
3. **Redefinir o G4** — se "vertical" significar "um caso de uso ponta a ponta dentro dos domínios
   existentes" (cliente → pedido → entrega → financeiro), **isso é testável hoje** e eu posso fazer
   na próxima rodada.

### O que eu recomendo

**A opção 3.** O produto **já tem** a espinha dorsal para atender uma revenda de gás: CRM com
histórico de compra, estoque com saldo por SKU, vendas com baixa automática, compras com
recebimento, financeiro com contas a pagar/receber, serviços e pós-venda.

**O que falta para o caso ser real** é o **vasilhame** — e isso é uma decisão de modelagem, não uma
tela. **Testar o fluxo de uma revenda com os domínios que existem** prova (ou reprova) a arquitetura
em uma rodada. **Modelar comodato de botijão** é um projeto.

**Não inventei a vertical para "passar o gate".** Isso seria exatamente o mock que o V3 proíbe.

---

## G5 · Seis modos de navegação + revisão visual — **PARCIAL**

**O funcional já estava medido no B3** (`AUDIT-MATRIX.md`). Esta rodada fecha a **revisão visual**.

### Funcional (herdado do B3, medido)

| Aspecto | Estado |
|---|---|
| Persistência da escolha | **READY** — sobrevive ao reload |
| Foco no seletor | **READY** — `outline: solid 2px rgb(0,83,253)`, `:focus-visible` |
| Rolagem | **READY** — Empresa 1215 de conteúdo em 937 visíveis |
| Rotas | **READY** — **27 itens clicados, 27 navegaram** |
| RBAC por modo | **PARCIAL** — 5 de 6 modos sem item exclusivo |

### Visual (novo, 6 capturas em `docs/b3po/evidence/g5-modo-*.png`)

| Modo | itens na sidebar | altura | cabe? |
|---|---|---|---|
| **Empresa** | **35** | **1215 px** | **rola** |
| Engenharia | 17 | 937 | cabe |
| Automação | 21 | 937 | cabe |
| IA e Agentes | 19 | 937 | cabe |
| Estratégico | 19 | 937 | cabe |
| Administração | 19 | 937 | cabe |

### O que está bem, visto nas capturas

- **Hierarquia clara**: `CONVERSAS | BOTS` → `MODO DE TRABALHO` → grupos (`VISÃO GERAL`, `OPERAÇÃO`, `COMÉRCIO`, `TRABALHO`, `CRESCIMENTO`, `INTELIGÊNCIA`) → itens.
- **Identidade presente**: mascote B-3PO com "BOT PLATFORM", `Bem-vindo ao B-3PO`, subtítulo.
- **Cards de modo 3×2** alinhados, com ícone + nome + uma linha de descrição; o card do modo ativo tem **borda de destaque**.
- **Composer** consistente: *"No que você está pensando?"* + modelo (`Opus 4.6 · Med`).
- **O aviso de inferência aparece** (badge laranja `Servidor · inferência indisponível`) — **o B1 está visível onde deve**.

### O que a revisão visual revelou — e não é cosmético

**1. A sidebar do modo Engenharia tem um vazio estrutural.**

Empresa mostra **5 grupos densos**. Engenharia mostra **um único grupo** (`CONFIGURAÇÃO`: Estrutura, Privacidade) e, entre o último item e *"Nenhuma conversa ainda"*, **um bloco vazio de ~250 px**.

**Não é bug de CSS** — é a consequência visual do achado do B3: **5 dos 6 modos não têm conteúdo próprio**. O vazio é a *arquitetura de informação* aparecendo.

**2. O mesmo acontece em Estratégico e IA e Agentes**, que **compartilham a mesma lista** (12 itens idênticos, medido no B3). Visualmente são **indistinguíveis** — trocar o seletor entre os dois muda a borda do card e nada mais.

**3. Empresa é o único modo que "puxa" a rolagem** (1215 px). Não é problema — mas significa que **o modo mais completo precisa de rolagem para caber**, enquanto cinco modos têm espaço sobrando.

### O que NÃO foi verificado

| Item | Por quê |
|---|---|
| **Contraste medido** de cada texto nas 6 telas | fiz inspeção visual, não medição de razão de contraste |
| **Zoom** 125%/150% nos 6 modos | medido antes em outra rodada; não repetido aqui |
| Tema **escuro** | as capturas são do tema claro |
| **Teclado**: Tab pelos 6 modos | não percorrido |
| Telas **críticas** além da home | o V3 diz "telas críticas"; só revisitei a home de cada modo |

### Veredito

**G5 = PARCIAL.** O funcional está `READY` (persistência, foco, rolagem, 27/27 rotas). O que trava é **o mesmo item do B3**: **cinco modos sem identidade própria** — e agora eu sei que isso **aparece na tela** como espaço vazio, não só como lista repetida.

**Corrigir isso é decisão de produto, não de CSS.** Preencher a sidebar com itens inventados seria maquiar o vazio.

---

## G6 · Engenharia, automação, integrações e conectores — **PARCIAL**

**A plataforma tem uma biblioteca de conectores oficiais muito maior do que a auditoria anterior
sugeria. O que falta é ATIVAÇÃO e prova de conexão real.**

### O que existe (contagem medida)

| Categoria | Plugins |
|---|---|
| **`platforms`** (mensageria) | **27** |
| **`model-providers`** | **39** |
| **`web`** (busca) | **11** |
| **`image_gen`** | 8 |
| **`dashboard_auth`** | 5 |
| **`video_gen`** | 4 |
| **`browser`** | 3 |
| **`memory`** | 2 |
| **total** | **99** |

**As 27 plataformas de mensageria** (medidas em `plugins/platforms/`):
`whatsapp · whatsapp_cloud · telegram · discord · slack · teams · signal · sms · email ·
google_chat · matrix · mattermost · line · wecom · weixin · dingtalk · feishu · qqbot · irc ·
ntfy · a2a · bluebubbles · buzz · photon · raft · simplex · yuanbao`

**Isso não é um produto com "um conector"** — é uma biblioteca. A rodada anterior desta auditoria
(V2) tinha registrado "integrações" como pendência; **a medição mostra que elas existem como plugin**,
o que muda o diagnóstico: **não falta conector, falta ativação e teste**.

### Automação (herdado do B7, medido em runtime)

| Peça | Medido |
|---|---|
| **triggers** | 5: `venda.faturada · estoque.zerado · ticket.aberto · ticket.atrasado · conta.vencendo` |
| **ações** | catálogo REAL do processo principal (`inventory.append`, `sales.create`, …), com descrição e domínio |
| **criar regra** | `rule_1793997705174_mwp0cc` · `active: true` · **persistiu** após reload |

`api/automations.ts:4` explica a escolha: *"uma lista paralela envelhece na primeira ferramenta nova
e oferece ação que não existe"*. **A tela não inventa ações** — e isso foi verificado.

### O que NÃO está provado

| Item | Medido | Por quê |
|---|---|---|
| **Nenhuma plataforma ATIVA** | `gateway_platforms: {}` | sem credencial de WhatsApp/Telegram/etc., nada conecta |
| **`/api/plugins` não existe** | **404** | não há endpoint para listar plugins em runtime — a contagem acima vem do **disco**, não da API |
| **Nenhuma conexão de mensageria testada** | — | exige token externo (`BLOCKED_BY_EXTERNAL_DEPENDENCY`) |
| **Nenhum conector MCP instalado** | `mcp` não aparece em `plugins/` | existem `webhook_mcp_events` e o catalog, mas não medi instalação |
| **Engenharia** (modo) | rota `#/organizacao` existe | não exercitei a tela |

### A distinção que importa

**"Existe 99 plugins no disco" ≠ "o produto integra com 27 plataformas".** A primeira é uma
propriedade do repositório; a segunda exige **credencial, conexão estabelecida e mensagem trocada**.

**Medido**: **zero plataformas ativas**. Sem chave, o número 27 é **potencial**, não capacidade.

### Ação exata para desbloquear

**Qualquer uma:**

1. **WhatsApp/Telegram** (as duas que o dono citou em rodadas anteriores): fornecer token/QR e rodar
   `hermes gateway setup`;
2. **Um teste de conexão local** (ex.: `irc` ou `ntfy` contra um servidor público) — **não exige
   credencial comercial** e prova o caminho de ativação de ponta a ponta;
3. **Aceitar G6 `PARCIAL`** com a contagem de plugins como evidência de existência e a ativação como
   pendência externa.

**Eu recomendo a 2** — um conector que não pede chave comercial prova o mecanismo inteiro sem
bloquear em terceiro.

### Veredito

**G6 = PARCIAL.** **Automação está `READY`** (5 triggers, ações reais, persistência). **Integrações
existem como biblioteca** (99 plugins, 27 de mensageria) e **não têm prova de conexão** — nem podem
ter sem credencial.

**Não declarei `READY` por contagem de arquivo.** O V3 é explícito: *"Ferramenta só conta depois de
exercitada"*.

---

## G7 · Desktop / Web / Android / iOS — **PARCIAL**

**Três plataformas `READY`, uma `BLOCKED`, e uma correção importante: os testes do mobile PASSAM.**

### A matriz (detalhe em `PLATFORM-MATRIX.txt`)

| Plataforma | Estado | Evidência medida |
|---|---|---|
| **Desktop** | **READY** | `apps/desktop/dist` presente · build exit 0 · CI `e2e-desktop` + `desktop-bundle-smoke` · **193 bridges** no preload |
| **Web** | **READY** | `npm run build` **exit 0 em 4,92 s** → `hermes_cli/web_dist/` · **3,1 MB em 60 arquivos** |
| **Android** | **READY** | `app-release-signed.apk` **44,3 MB** (11/06/2026) · `app-debug.apk` 94,5 MB · `build:android:release` |
| **iOS** | **BLOCKED** | `B3PO.xcodeproj` + `Podfile` presentes · **`xcodebuild` não existe no Windows** |
| **Testes mobile** | **READY** | `npx vitest run` → **19 passed / 1 skipped** · **169 tests passed** / 8 skipped (879 ms) |

### A correção que precisei fazer em mim mesmo

**Na primeira tentativa eu declarei os testes do mobile quebrados**: `20 failed, 20 total`,
`Test suite failed to run`.

**Estava errado.** Rodei com **`jest`**; os testes importam de **`vitest`**:

```
Vitest cannot be imported in a CommonJS module using require().
  > 1 | import { describe, expect, it } from 'vitest'
```

**Com `npx vitest run`: 169 testes passam.** O erro era **meu**, não do produto — e eu quase
registrei um `NOT_READY` falso num gate.

**Isso é o mesmo tipo de erro que o B1 me ensinou**: uma medição que não reproduz o fenômeno
**não é medição**. `jest` num projeto `vitest` não mede nada.

### O que cada plataforma compartilha — e o que não

**Compartilhado**: o backend (gateway + agent) e o contrato JSON-RPC/REST. Desktop, Web e mobile
falam com o **mesmo** backend.

**NÃO compartilhado**: a UI. React/Electron, SPA e React Native são três frontends.

**Consequência para o veredito**: um bug de UI numa plataforma **não** aparece na outra. **Por isso a
matriz é por plataforma** — e por isso "o desktop funciona" nunca foi evidência para Android ou iOS.

### O que NENHUMA plataforma tem testado

| Item | Estado |
|---|---|
| Instalação limpa em máquina sem dependências | **NOT_TESTED** |
| Atualização de versão anterior | **NOT_TESTED** |
| Mensageria ativa | **NOT_TESTED** — `gateway_platforms: {}` (ver G6) |
| **iOS**: build ou teste em dispositivo | **BLOCKED** — nenhum, nunca |
| **Android**: instalar e executar o APK | **NOT_TESTED** — o APK existe, não foi rodado nesta rodada |

### Ação exata para o iOS

**`BLOCKED_BY_EXTERNAL_DEPENDENCY`**: exige **macOS** (ou runner macOS) com **Xcode** e uma **conta
Apple Developer** para assinar. O projeto **existe**; o que falta é a plataforma de build.

**Nada que eu faça no Windows produz um `.ipa` verificável.**

### Veredito

**G7 = PARCIAL.** **Desktop, Web e o código mobile estão `READY` com evidência de execução.** O que
trava: **iOS não pode ser construído aqui** e **o APK não foi executado num dispositivo**.

---

## G8 · Regressão, segurança, performance, acessibilidade e documentação — **PARCIAL**

### Performance — **READY** (medido)

Detalhe em `PERFORMANCE.md`. O resumo:

| Métrica | Antes | Depois |
|---|---|---|
| long tasks na tela de Configurações | **55** | **4** (−93 %) |
| soma | ~5 700 ms | **281 ms** (−95 %) |
| acima de 100 ms | **20** | **1** |

**Correção**: os doze painéis de settings viraram `lazy` + `Suspense` (`e782845382`).

### Segurança — **READY no mecanismo, PARCIAL na cobertura**

Detalhe no G1. Resumo medido:

- **40 testes de permissão verdes** (`rbac` 16 · `exigir-ator` 9 · `guard` 10 · `ratchet` 5)
- **837 decisões na trilha de auditoria** (`%APPDATA%\B-3PO\b3po\auditoria.json`)
- **30 de 46 canais** com guarda; **16 na dívida congelada**

### Acessibilidade — **PARCIAL**, e com um achado estrutural

| Verificação | Medido |
|---|---|
| `htmlLang` | **`pt`** — correto |
| imagens sem `alt` | **0 de 1** |
| botões sem nome acessível | **0 de 48** |
| `prefers-reduced-motion` no CSS | **SIM** (`styles.css:24`, `:1342`) |
| `prefers-reduced-transparency` no CSS | **SIM** (`:58`) |
| regra de `focus-visible` | **SIM** (`:875`) |
| **`<main>` / `<nav>` / `<aside>` na home** | **0 · 0 · 0** |
| **teste automatizado de a11y** | **NÃO EXISTE** |

**O achado**: **a home não tem um único landmark ARIA.** Não há `<main>`, `<nav>` nem `<aside>`; a
sidebar é um `<div class="scrollbar-fade">`, o conteúdo é outro `<div>`. Para um leitor de tela, a
página **não anuncia "conteúdo principal" nem "navegação"** — quem usa NVDA/VoiceOver percorre tudo
como um bloco só.

**O que o CSS acerta**: as três preferências de sistema (`reduced-motion`, `reduced-transparency`,
`focus-visible`) estão implementadas — o que mostra que houve cuidado com a11y. **O que falta é a
estrutura semântica** e **a medição automatizada**.

**Confissão de método**: tentei medir contraste por script **três vezes** e as três deram resultado
absurdo (razão 33 701 578 : 1, depois 1 : 1 em texto visível). Errei a resolução do fundo
transparente e, na terceira, o filtro cortou a amostra. **Não tenho medição de contraste confiável** —
e prefiro dizer isso a inventar um número. **`axe-core` e `pa11y` não estão instalados**; sem eles,
contraste não se mede de improviso.

### Regressão — **NOT_TESTED nesta rodada**

**A suíte não rodou.** Duas tentativas:

1. `bash scripts/run_tests.sh` → **`WSL ERROR: execvpe(/bin/bash) failed`** — o WSL está quebrado
   nesta máquina;
2. `python scripts/run_tests_parallel.py --paths tests/gateway tests/hermes_cli` → **ficou em
   execução por mais de 10 minutos** e virou job de background.

**O baseline que tenho é da r275**: 19 083 testes, 18 806 verdes, 246 skipped, **31 vermelhos** =
7 flaky + 1 corrigido + 12 de infra + 0 de UX. **Não é o estado de hoje.**

**Isso é `NOT_TESTED`, não PASS.** A suíte está rodando; quando terminar, o número entra aqui.

### Documentação — **PARCIAL**

| Documento | Estado |
|---|---|
| `MASTER-STATE.md` | **criado** |
| `MASTER-CHECKPOINT.json` | **criado** |
| `BLOCKERS.md` | **criado** |
| `AUDIT-MATRIX.md` | **criado** |
| `TEST-EVIDENCE.md` | **criado** (7 provas E2E) |
| `PERFORMANCE.md` | **criado** |
| `GATES.md` | **criado** |
| `PLATFORM-MATRIX.txt` | **criado** |
| `TASK-QUEUE.json` | **FALTA** |
| `DECISIONS.md` | **FALTA** |
| `UPSTREAM-PATCH-REGISTER.md` | **FALTA** |
| `HANDOFF.txt` | **FALTA** |
| `FINAL-DELIVERY.txt` | **FALTA** |

**8 de 13 criados.**

### Veredito

**G8 = PARCIAL.** Performance **READY**, segurança **READY no mecanismo**, documentação **8/13**.
O que trava: **a11y sem landmark e sem teste**, e **regressão não medida nesta rodada** por falha de
infraestrutura local (WSL) e demora da suíte.

---

## G8 · ADENDO — a regressão foi medida, e o ambiente foi PROVADO

**Atualização da rodada 18.** A suíte que estava em background **terminou**. Este adendo substitui o
`NOT_TESTED` da seção anterior por medição — e faz o que o V3 exige: **não chamar nada de "ambiente"
sem reproduzir**.

### O que rodou

```bash
python scripts/run_tests_parallel.py --paths tests/gateway tests/hermes_cli
```

**Estado**: terminou. **Resultado**: `exit 1`, **138 arquivos reportando falha/erro** em `hermes_cli`.

### A PROVA de que é ambiente, não código

Escolhi a maior família (`test_worktree*`, 41 falhas relatadas) e **reproduzi isolada**:

```
$ python -m pytest tests/hermes_cli/test_worktree.py -x -q
tests\hermes_cli\test_worktree.py:124: AssertionError
E       assert (worktree / "node_modules").is_symlink()
E       AssertionError: assert False
------------------------- Captured log -------------------------
INFO cli:worktree_ops.py:326 .worktreeinclude: symlink failed
     ([WinError 1314] O cliente não tem o privilégio necessário para a operação)
```

**Este é o padrão-ouro**: a falha **reproduz**, a causa está na **mensagem do próprio produto**
(`symlink failed`), e o código de erro do Windows (**1314**) significa exatamente *"sem privilégio"*.
**Não é hipótese: é a linha onde falha.**

### As causas contadas no log da suíte

| Causa | Ocorrências |
|---|---|
| **`WinError 1314`** — symlink sem privilégio | **110×** |
| `ModuleNotFoundError` (diversos) | 134× |
| `FileNotFoundError` | 75× |
| `NoConsoleScreenBufferError` | 21× |
| `No module named 'acp'` | 6× |
| `WinError 123` — nome de arquivo inválido | 4× |

**Nenhuma dessas é asserção de regra de negócio.** São todas falhas de **montagem de ambiente**:

1. **Symlink (110)**: o Windows exige **Developer Mode** ou token de administrador para criar
   symlink. O produto usa symlink para `node_modules` em worktrees; sem o privilégio, o teste não tem
   como passar. **Ação**: ativar Developer Mode nesta máquina.
2. **`No module named 'acp'` (6)**: o pacote `acp` não está no ambiente de teste.
3. **`NoConsoleScreenBufferError` (21)**: `prompt_toolkit` sem console TTY (rodando por pipe).
4. **`ModuleNotFoundError` / `FileNotFoundError`**: módulos e fixtures que o runner não montou no
   PATH deste ambiente.

### O que isso muda no veredito

**Não mudo G8 para `READY`.** O correto é o que a matriz manda:

| Gate | Estado | Evidência |
|---|---|---|
| Performance | **PASS** | 55→4 long tasks (`PERFORMANCE.md`) |
| **UI — 5 viewports** | **PASS (novo)** | 320/375/768/1024/1440: **zero overflow**, sidebar oculta em mobile, composer visível |
| Segurança | **PASS no mecanismo** | 40 testes verdes · 837 decisões auditadas |
| **Regressão** | **BLOCKED** | suíte roda, mas **110+ falhas de symlink** e 3 famílias de erro de ambiente |
| A11y | **FAIL** | **0 landmarks** (`main`/`nav`/`aside`) e **sem teste automatizado** |
| Documentação | **PARTIAL** | 8 de 13 arquivos |

**`BLOCKED` para regressão é honesto**: a suíte **não consegue medir** o código porque o ambiente
recusa symlink. **Declarar "regressão verde" seria mentira; declarar "regressão vermelha" também** —
não sei quantas das falhas escondem defeito real atrás do erro de ambiente.

### Ação exata para desbloquear a regressão

**Uma, e é sua**:

```powershell
# Ativar Developer Mode (permite symlink sem admin) — requer ação do proprietário
Start-Process "ms-settings:developers"
# marcar "Modo de desenvolvedor" = Ativado
```

**Depois disso eu rodo a suíte de novo e o número passa a valer.** Sem isso, todo `test_worktree`,
`test_gateway_launch_lifetime` e as famílias que criam link simbólico **continuam impossíveis** nesta
máquina, com o código certo ou errado.

### Correção de honestidade

Na seção anterior deste mesmo documento eu escrevi que a regressão era `NOT_TESTED` **porque o WSL
estava quebrado**. **Estava incompleto**: o WSL quebrado impediu o `run_tests.sh`, mas o runner em
Python rodou — e agora rodou até o fim. **O bloqueio real é privilégio de symlink**, não o WSL.
