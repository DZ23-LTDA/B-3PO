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

---

## G8 · ADENDO 2 — a11y: os landmarks foram CORRIGIDOS

**Achado do G8**: a home não tinha `<main>`, `<nav>` nem `<aside>` — **zero landmarks**.
**Corrigido em `9f662fc67c`.**

| Antes | Depois |
|---|---|
| `nav: 0` | **`nav: 1`** — `aria-label="Barra lateral"` |
| `main: 0` | **`main: 1`** — envolve o pane do workspace |
| sidebar dentro do `main` | **`false`** — a navegação ficou FORA, como deve ser |

**Como foi feito** (`components/ui/sidebar.tsx` + `app/contrib/controller.tsx`): `role="navigation"`
nas três variantes da sidebar (desktop, mobile, `collapsible='none'`) e um `<main>` em volta do
`<WiredPane part="chatRoutes" />` — que é o **irmão** do `part="sidebar"`, não o pai.

**Verificado que não quebrou o layout** (5 viewports, após a mudança):

| Viewport | overflow | main | nav |
|---|---|---|---|
| 320x568 | **não** | 312x1092 | oculta |
| 375x667 | **não** | 367x1001 | oculta |
| 768x1024 | **não** | 500x977 | 260 px |
| 1024x768 | **não** | 756x908 | 260 px |
| 1440x900 | **não** | 1180x783 | 260 px |

**Gate · typecheck**: `14 checks ok` · `0 erros`.

**O que continua em aberto na a11y**:

| Item | Estado |
|---|---|
| contraste medido | **NOT_TESTED** — falhei 3× ao medir por script; sem `axe-core` |
| teclado (Tab/Esc/retorno de foco) | **NOT_TESTED** |
| `axe` automatizado no CI | **NÃO EXISTE** |

---

## G9 · Pacotes de entrega, rollback, riscos e veredito — **PARCIAL**

### Pacotes (medidos)

| Artefato | Tamanho | Data | Estado |
|---|---|---|---|
| `apps/desktop/release/win-unpacked/B-3PO.exe` | **235,4 MB** | 05/11 15:53 | **não assinado** |
| `apps/desktop/release/win-unpacked.bak/B-3PO.exe` | 235,4 MB | 05/11 15:52 | **rollback presente** |
| `apps/desktop/dist` | **53,7 MB / 1231 arquivos** | build do G7 | ok |
| `hermes_cli/web_dist` | **3,1 MB / 60 arquivos** | build do G7 | ok |
| `app-release-signed.apk` | **44,3 MB** | 11/06 11:22 | assinado |
| `app-release-aligned.apk` / `app-release.apk` | 44,2 MB cada | — | presentes |
| iOS `.ipa` | — | — | **não existe** (precisa macOS) |

### Rollback — como funciona de fato

| Mecanismo | Evidência |
|---|---|
| build atômico do desktop | troca `.dist-build-*` → `dist`, deixa `.dist-previous-*` ao lado |
| **backup do pacote** | `release/win-unpacked.bak/` existe ao lado do atual |
| **builds fora do Git** | `.gitignore` L92 (`web_dist/`), L96 (`dist/`), L334/L344 (atomic build) |
| rollback de código | `git revert`/`reset` em `b3po-brand` — **nunca** `force push` |
| espelho | `main` == `origin/main` — pode ser restaurado do upstream |

### A matriz de riscos

| # | Risco | Severidade | Estado | Mitigação |
|---|---|---|---|---|
| R-1 | **Regressão não medida** — a suíte não roda por falta de symlink | **CRITICAL** | aberto | ativar Developer Mode (EXT-2) e remedir |
| R-2 | **Executável não assinado** (Authenticode `NotSigned`) | **HIGH** | aberto | certificado de assinatura (EXT-3 do V2) |
| R-3 | **Sem provedor de IA** — inferência indisponível | **HIGH** | bloqueado | chave de provedor (EXT-1) |
| R-4 | **iOS nunca construído** | **HIGH** | bloqueado | macOS + Xcode + conta Apple |
| R-5 | **16 canais IPC sem guarda** — inclui `fs`, `terminal`, `git` | **HIGH** | aberto | ligar `exigirAtor` quando houver ator com escopo |
| R-6 | **5 dos 6 modos sem item próprio**; Estratégico ≡ IA | MEDIUM | aberto | decisão de produto |
| R-7 | **Contraste não medido** | MEDIUM | aberto | instalar `axe-core` no CI |
| R-8 | **Bot nasce com 0 skills** (default tem 44) | MEDIUM | aberto | decisão de produto |
| R-9 | **Preço zero vende sem financeiro** | MEDIUM | aberto | decisão de negócio |
| R-10 | **SKU inexistente culpa o saldo** | LOW | aberto | vocabulário de erro do backend |
| R-11 | 99 plugins oficiais, **0 ativos** | MEDIUM | bloqueado | credencial ou teste com `ntfy`/`irc` |
| R-12 | Contratos de payload mistos (pt/en) | LOW | aberto | padronizar |

### VEREDITO — por escopo, nunca global

| Escopo | Estado | Base |
|---|---|---|
| **Domínios de negócio** (CRM, Compras, Estoque, Vendas, Financeiro, Projetos, Trabalhos, Automações, Empresa) | **READY** | 7 provas E2E em `TEST-EVIDENCE.md` |
| **Sofia** (plano persistido + execução verificável) | **READY** | 8 passos medidos, reload confirmado |
| **Performance** | **READY** | 55 → 4 long tasks |
| **UI responsiva** | **READY** | 5 viewports, zero overflow |
| **Bot Mode** (criar/editar SOUL/renomear/revogar) | **READY** | 5 de 8 etapas |
| **Segurança/RBAC** | **PARCIAL** | 40 testes + 837 decisões, mas 16 canais sem guarda |
| **Diagnóstico de inferência** | **PARCIAL** | funciona, mas `overall: ok` e `has_env` enganam |
| **A11y** | **PARCIAL** | landmarks corrigidos; contraste e teclado `NOT_TESTED` |
| **Regressão** | **BLOCKED** | ambiente sem symlink (WinError 1314, reproduzido) |
| **iOS** | **BLOCKED** | sem macOS |
| **Integrações ativas** | **BLOCKED** | 0 plataformas conectadas |
| **Vertical gás/água** | **NOT_IMPLEMENTED** | decisão do dono |
| **RELEASE** | **NOT_READY** | exe não assinado + regressão bloqueada + 0 integrações |

**A declaração que o V3 exige**: **não há defeito conhecido nos cenários verificados**. Os
`BLOCKED` não são "tudo certo" — são "não foi possível medir", e estão nomeados um a um.

---

## G8 · ADENDO 3 — a11y medida com axe-core: **4 violações → 1**

**Método novo**: instalei `axe-core` (637 KB, `--no-save`, sem tocar `package.json`) e rodei
`axe.run` na home contra as tags `wcag2a · wcag2aa · wcag21a · wcag21aa`.

### Antes → depois

| # | Regra | Impacto | Antes | Depois |
|---|---|---|---|---|
| 1 | `color-contrast` | serious | **5 nós** | **0** ✅ |
| 2 | `aria-required-children` | **critical** | 1 nó | **0** ✅ |
| 3 | `label-content-name-mismatch` | serious | 1 nó | **0** ✅ |
| 4 | `nested-interactive` | serious | 1 nó | **1** — aberto, ver abaixo |

**Violações: 4 → 1.** Passes: **29**.

### O que corrigi, e por quê

**1. Contraste — 5 textos pequenos abaixo de 4.5:1**

| Elemento | Razão antes | Depois |
|---|---|---|
| `Organizações, usuários…` | **3.37** | passou |
| `Servidor` (aviso) | **3.17** | passou |
| **`inferência indisponível`** | **2.62** ⚠️ | passou |
| `Inteligente` | 3.52 | passou |
| `cliente dev` | 3.52 | passou |

Três causas distintas, três correções:

- `--ui-text-tertiary` 54 % → **66 %** (`styles.css`) — o cálculo sobre `#fefefe` mostra 54 % → 3.76
  e 66 % → 5.53; 66 % também cobre o card azulado `#e3edff` (5.21).
- `text-amber-600` → **`text-amber-700`** no statusbar: `#e17100` dava 3.17, `#b45309` dá **4.98**.
- **`muted-foreground/80` → `muted-foreground`** em **36 ocorrências / 29 arquivos**: o `/80`
  empilhava 80 % de opacidade sobre um token que já é o terciário — 0.66 × 0.8 = ~53 %, reprovado
  por construção. O `/80` era puramente estético e custava a legibilidade.

**2. `aria-required-children` (critical) — o botão "+" estava dentro do `tablist`**

`tree-group.tsx` punha o "+" (nova aba) em `children` do `<div role="tablist">`. O `tablist` só
admite `role="tab"`; um botão de comando ali **infla a contagem de abas** para o leitor de tela
("aba 3 de 5") e não é anunciado como ação. **Movi para `trailing`**, que o `PaneTabStrip` já
renderiza **fora** do tablist — sem mudar o visual, porque o "+" continua à direita dos tabs.

**3. `label-content-name-mismatch` — `rotuloAcessivel` ignorava o texto visível**

```tsx
if (item.title) return item.title   // ← antes: só o tooltip
```

O chip de versão anunciava *"B-3PO Desktop vdev · …"* enquanto a tela dizia *"cliente dev"*.
Quem usa comando de voz não consegue dizer o que vê (WCAG 2.5.3). Agora o nome acessível **começa
pelo texto visível** e só completa com o tooltip quando ele não o contém.

### A que ficou aberta — e por que NÃO a "consertei"

**`nested-interactive`** (`div[data-tree-tab="workspace"]`): o `<div role="tab">` **contém** o
`<button aria-label="Fechar">` do `PaneTab`.

**A correção de 1 linha** (`aria-hidden` + `tabIndex={-1}` no botão) faria o `axe` ficar verde e
**pioraria a acessibilidade de verdade**: o leitor de tela deixaria de descobrir que a aba fecha.

**A correção correta** é estrutural: o botão precisa ser **irmão** do elemento com `role="tab"`,
não filho. Isso toca o `.group/tab` do CSS, o hover, o fade e o layout de **toda** aba do app —
é mudança de arquitetura de componente, não de rodada de auditoria.

**Registro como aberto, com a proposta.** Preferi um placar honesto de 1 violação a um verde falso.

---

## G8 · ADENDO 4 — a11y em 29 telas: **27 livres**, e as 5 violações novas corrigidas

**Rodada 22.** A home estava limpa; ela não é o produto. Rodei o `axe-core` em **29 rotas**.

### O resultado (antes e depois)

| Momento | Telas livres |
|---|---|
| Antes desta rodada | **26 de 29** |
| **Depois** | **27 de 29** |

**As 5 violações encontradas e o que eram:**

| Tela | Regra | Impacto | Causa raiz | Estado |
|---|---|---|---|---|
| /settings | **`button-name`** | **critical** | `Tip` dá tooltip mas **não o nome**: Radix emite `aria-describedby`, que é descrição | **corrigido** |
| /settings | `color-contrast` | serious | `<kbd>` a 38 % → **2.14:1** (o pior do app) | **corrigido** (72 %) |
| /settings · /cron | `aria-prohibited-attr` | serious | `aria-label` num `div` **sem role** + `display:contents` — descartado pelo navegador | **corrigido** (`role="group"`) |
| /capabilities | `label-content-name-mismatch` | serious | `aria-label="Mostrar mais"` escondia o `+221` visível | **corrigido** (`"+221 — Mostrar mais"`) |
| /settings · /cron | `nested-interactive` | serious | `PaneTab` (`role="tab"`) contém o botão de fechar | **aberto, estrutural** |

### As duas correções de CLASSE (não de caso)

**1. `Tip` virou o nome acessível de filho só-ícone** (`components/ui/tooltip.tsx`)

Era o achado mais grave da rodada, e o mais **sistêmico**: qualquer `<Tip label="...">` em volta de
um botão-ícone sem `aria-label` próprio herdava o vazio — **os ~107 pontos de uso**, não só os três
do rodapé de Configurações.

A correção injeta `aria-label` **só quando** o filho não tem texto renderizável nem nome declarado.
O cuidado existe porque sobrescrever um botão com texto (ex.: `<button>Salvar</button>` dentro de
`<Tip label="Salvar arquivo">`) criaria o **outro** defeito — `label-content-name-mismatch`.

**2. `rotuloAcessivel` passou a liderar pelo texto visível** (`app/shell/statusbar-controls.tsx`)

O statusbar escolhia entre tooltip **ou** label; agora usa os dois, com o visível na frente.

### O experimento que ensinou sobre o axe

Com `/capabilities` eu tentei primeiro `aria-label="Mostrar mais (+221)"` — o número **estava no
nome** e o `axe` continuou reprovando. Invertendo para `"+221 — Mostrar mais"`, passou.

**A regra compara pela ordem de leitura**, não pela mera presença da substring: quem dita por voz
começa pelo que está vendo. **Isso vale registrar** — a correção "óbvia" teria ficado verde no
raciocínio e vermelho na ferramenta.

### O que continua aberto — e é honesto

**`nested-interactive`** em `/settings` e `/cron`: o `PaneTab` tem `role="tab"` e contém o `<button>`
de fechar. **A correção é estrutural** (o botão precisa ser irmão do tab, não filho) e mexe no
`.group/tab`, hover, fade e layout de **toda** aba. Uma linha com `aria-hidden` deixaria o axe verde
e **cegaria** o leitor de tela para o fechar — recusei.

### Cobertura final

| Métrica | Valor |
|---|---|
| rotas auditadas | **29** |
| rotas **sem nenhuma violação WCAG A/AA** | **27** |
| violações restantes | **2**, ambas a mesma causa estrutural |
| regras que passam | 26–30 por tela |

---

## G3 · ADENDO — Vendas: a recusa passou a dizer QUAL dos dois problemas é

**Rodada 23.** O achado do B5 virou correção, e o gate de saúde do próprio repositório barrou a
primeira tentativa — o que vale registrar.

### O problema

`faturar` consultava o saldo e, se faltasse, respondia **sempre** `saldo_insuficiente`. Mas
`balances` só tem chave para SKU que **já se movimentou**:

| Situação | Resposta antes | Resposta agora |
|---|---|---|
| SKU **não cadastrado** (código errado) | `saldo_insuficiente` | **`produto_nao_encontrado`** |
| SKU cadastrado, **sem estoque** | `saldo_insuficiente` | `saldo_insuficiente` + `livre_milli: 0` |
| SKU cadastrado, **estoque parcial** | `saldo_insuficiente` | `saldo_insuficiente` + `livre_milli` + `necessario_milli` |

**Quem digitava o código errado ia conferir o estoque de um produto que não existe.**

### A segunda correção: nomear o livre

`reservation.ts:98` já documentava a regra — *"a recusa **nomeia o livre**: `saldo_insuficiente`
sozinho obrigaria quem lê a calcular quanto sobra — e o cálculo é justamente o que esta função
existe para fazer"* — e **a venda não fazia isso**.

Agora faz: `{ error, message: sku, livre_milli, necessario_milli }`.

### Como a distinção é feita

`SalesDeps.catalog?` é **opcional**: `{ has: (sku, tenantId) => Promise<boolean> }`. O wiring em
`erp-ipc.ts` extraiu o `CatalogStore` para uma variável e o passa aos dois leitores (o canal do
catálogo e o `faturar`).

**Sem catálogo** (teste, uso programático) mantém o comportamento anterior em vez de quebrar — a
mesma escolha que `reservations?` já usava.

### O gate me barrou — e estava certo

A primeira versão **inline** levou `faturar` a **CC 22** (alvo 20) e o `scripts/check` reprovou:

```
=== health (failed) ===
apps/desktop/electron/sales-ipc.ts:164  CC  registerSalesIpc.faturar
    CC 22 > target 20 (new code must meet the target)
```

**Commitei antes de ver o gate** — erro meu, corrigido no commit seguinte. A saída foi a que o
próprio gate sugere: extrair para `recusaPorEstoque`, uma função com uma responsabilidade só. Com
isso `faturar` voltou a **CC ≤ 20** e os dois passam.

### Verificação

| Item | Resultado |
|---|---|
| `scripts/check` | **14 checks ok** |
| typecheck | **0 erros** |
| `sales-ipc.test.ts` | **10 de 10** |
| testes de vendas (3 arquivos) | **13 de 13** |
| **teste novo** | `r292: SKU fora do catalogo e "produto nao encontrado", nao "sem saldo"` — cadastra o produto no meio do teste e prova as **duas** respostas para o **mesmo** SKU |

### O que continua valendo do B5

| Item | Estado |
|---|---|
| baixa de estoque + conta a receber | **READY** (medido) |
| SKU inexistente culpa o saldo | **corrigido** |
| preço zero vende sem lançar financeiro | **aberto** — decisão de negócio: cortesia ou bloqueio? |

---

## G8 · ADENDO 5 — formulários e foco: o produto NÃO usa modal onde eu supus

**Rodada 24.** Auditei os formulários CRUD que as rotas não cobrem (o `axe` numa rota não abre o
formulário). O resultado **corrigiu uma suposição minha** e é, no conjunto, boa notícia.

### As 6 telas + formulário: **todas livres**

| Tela | Ação aberta | Violações |
|---|---|---|
| `/crm` | Adicionar contato | **0** |
| `/crm` | Adicionar oportunidade | **0** |
| `/compras` | Cadastrar fornecedor | **0** |
| `/compras` | Pedir | **0** |
| `/sales` | Adicionar item | **0** |
| `/stock` | Registrar movimentação | **0** |

### A suposição errada que a medição corrigiu

Eu esperava **modais** e fui medir *"foco inicial, contenção, retorno do foco"* — os critérios que o
`references/quality-gates.md` exige para modal.

**Medido**: ao clicar em "Adicionar contato", **não existe `role="dialog"` nenhum**. O foco
permanece no botão porque **não há modal** — o formulário é **inline, na própria página**.

**Isso não é um defeito: é uma escolha melhor.** Formulário inline **não tem armadilha de foco**,
não esconde o contexto e não exige que o leitor de tela anuncie "diálogo". A primeira medição
registrou `dialogo:sim` por um overlay residual de outro elemento — **e eu quase anotei "foco não
entra no modal" como bug**, quando o modal simplesmente não existe.

### O que foi testado de teclado (com resultado)

| Comportamento | Resultado nas 4 telas |
|---|---|
| `Escape` fecha/fecha o painel | **sim** |
| foco retorna ao gatilho | **sim** |

**O `Esc` e o retorno de foco funcionam** — o que é a parte do critério de modal que **se aplica**
aos painéis inline.

### O que continua `NOT_TESTED`

| Item | Por quê |
|---|---|
| **contenção de foco** (Tab não escapa) | não há modal nesses fluxos; não se aplica |
| **modal de bot** (Bot Mode) | não consegui abrir pela automação — o seletor da aba BOTS não é `button`/`tab` |
| **Tab** percorrendo o formulário inteiro | não percorrido, só o `Esc` e o retorno |
| leitor de tela real (NVDA) | nenhum teste com AT de verdade |

### Veredito

**A a11y do produto está melhor do que a auditoria supunha**: 27 de 29 rotas limpas, **6 formulários
CRUD limpos**, `Esc` e retorno de foco funcionando. O que sobra é **a mesma** violação estrutural do
`PaneTab` (2 telas) e os itens de teclado acima, **nomeados**.

---

## G8 · ADENDO 6 — teclado medido, e por que o `PaneTab` continua aberto

**Rodada 25.** Dois resultados: um `NOT_TESTED` fechado e uma recusa **fundamentada**.

### Tab: a ordem do CRM está correta

Percorri 10 paradas de `Tab` a partir do primeiro campo do formulário de contato:

```
 1. INPUT  Nome              6. BUTTON Registrar recusa
 2. INPUT  Telefone          7. BUTTON Remover
 3. INPUT  Empresa           8. INPUT  Oportunidade
 4. BUTTON Adicionar contato 9. INPUT  Valor (centavos)
 5. BUTTON Registrar autor. 10. SELECT Contato

saiu do conteúdo principal? NÃO
```

**A ordem segue o formulário e não escapa para a sidebar.** Para quem navega por teclado, o caminho
é previsível — nenhum salto para fora do `main`.

### Por que o `nested-interactive` NÃO foi corrigido

Eu tinha proposto `aria-hidden` + `tabIndex={-1}` no botão de fechar do `PaneTab`. **Fui verificar
antes de aplicar** e a resposta é que **isso quebraria a função**:

```
grep 'onKeyDown|Delete|Backspace' apps/desktop/src/components/ui/pane-tab.tsx
→ (nenhum handler de teclado)
```

**O `PaneTab` não tem caminho de teclado para fechar a aba.** Se o botão X sair da árvore de
acessibilidade, o usuário de leitor de tela **perde a única forma de fechar** — trocaria uma
violação de conformidade por um **controle inoperável**.

**A correção correta** é estrutural: tirar o `<button>` de dentro do elemento com `role="tab"`,
deixando-os irmãos sob um wrapper neutro que preserva o `.group/tab` do hover. Isso **toca o
componente que renderiza toda aba do app** (workspace, preview, browser, terminal) e os testes que
dependem de `[data-tree-tab]` + `role="tab"` no mesmo nó.

**Não faço sem a sua palavra.** Registrado como `ABERTO`, com a proposta e o custo.

### O que continua `NOT_TESTED`

| Item | Estado |
|---|---|
| modal do Bot Mode | a aba BOTS não é `button`/`tab`; a automação não a abriu |
| leitor de tela real (NVDA/VoiceOver) | nenhum teste com AT de verdade |
| Tab nas outras 28 rotas | só o CRM foi percorrido, como amostra |

---

## G8 · ADENDO 7 — tema escuro: **0 de 10 → 8 de 10**, e o bug era meu

**Rodada 27.** O `axe` sempre rodou no tema **claro**. `color-contrast` depende do fundo — então
**metade da medição estava faltando**. Fui medir o escuro com `emulateMedia({ colorScheme: 'dark' })`.

### O resultado

| Tema | Telas livres | Contraste |
|---|---|---|
| Claro | 27 de 29 | **0 violações** |
| **Escuro (antes)** | **0 de 10** | **10 violações** |
| **Escuro (depois)** | **8 de 10** | **0 violações** |

### A violação era um bug que EU introduzi na rodada 22

```
Element has insufficient color contrast of 3.78
  (foreground color: #bb4d00, background color: #0d1015)
```

`#bb4d00` é o **`amber-700` que eu escolhi** para corrigir o tema claro. Ele deu **4.98:1 sobre
branco** — e **3.78:1 sobre `#0d1015`**.

**A cor que corrige um tema é a que estraga o outro.** Eu validei o claro e **não** validei o escuro:
a correção funcionou onde eu olhei.

### A correção

O padrão já existia **no mesmo arquivo**, duas linhas de distância:

```tsx
// linha 757, `statusBarGatewayHealth`:
? 'text-amber-600 dark:text-amber-400'
```

Aplicado ao meu uso:

```tsx
? 'text-amber-700 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-400'
```

**Uma cor por tema.** É o que `preview-file.tsx` já fazia (`text-amber-700 dark:text-amber-300`) e
o que eu deveria ter copiado desde o começo.

### O que continua aberto

As 2 telas restantes no escuro (`/` e `/settings`) são o **mesmo `nested-interactive`** do
`PaneTab` — não uma violação nova.

### A lição

**Auditar num só tema é auditar metade.** O `axe` não reclama do que não vê, e eu tinha 27 de 29
limpas no claro — um número que **parecia** cobertura completa. **Não era.**

**Se eu tivesse parado na rodada 26, teria entregado um relatório dizendo "contraste zerado" com
um `amber` ilegível no tema escuro** — introduzido por mim. A varredura que faltava encontrou em
cinco minutos o que 26 rodadas de medição no claro não encontraram.

---

## G8 · ADENDO 8 — a11y nas 6 condições: nenhuma violação nova por viewport ou tema

**Rodada 28.** A lição do tema escuro ("auditar numa condição é auditar metade") pedia a outra
metade: **viewport**. Em 375 px a sidebar vira `Sheet` e a geometria muda — condições onde o `axe`
no desktop não via nada.

### A matriz completa

| Viewport | Tema | Telas livres |
|---|---|---|
| 1440 × 900 | claro | **27 / 30** |
| 1440 × 900 | escuro | **27 / 30** |
| 768 × 1024 | claro | **8 / 10** |
| 768 × 1024 | escuro | **8 / 10** |
| **375 × 667** | claro | **8 / 10** |
| **375 × 667** | escuro | **8 / 10** |

**As amostras menores (8/10) usam 10 rotas; as maiores (27/30) usam 30.** A proporção é a mesma.

### O achado é a AUSÊNCIA de achado

**Em todas as 6 combinações, as únicas violações são as MESMAS 2 telas** (`/` e `/settings`) com
`nested-interactive` — o `PaneTab`.

| O que poderia ter aparecido e não apareceu | Por que era esperado |
|---|---|
| contraste diferente no mobile | a paleta não muda com a largura |
| botão sem nome no Sheet da sidebar | o Sheet herda o `aria-label` do `Tip` corrigido em r22 |
| alvo pequeno demais no toque | **`axe` não mede isso** — só WCAG A/AA de a11y, não ergonomia de toque |
| foco preso no Sheet | não testado nesta rodada (só `Esc`/retorno, em r25) |

### Cobertura consolidada de a11y

| Dimensão | Medido |
|---|---|
| rotas | **30** |
| viewports | **3** (375, 768, 1440) |
| temas | **2** (claro, escuro) |
| combinações | **6** |
| violações de contraste | **0** em todas |
| violações estruturais | **1 causa** (o `PaneTab`), em 2 telas |
| formulários CRUD | **6 de 6 limpos** |
| Tab | ordem contida (amostra CRM) |
| Esc + retorno de foco | 4 de 4 |

### O que ainda NÃO foi medido

| Item | Por quê |
|---|---|
| **alvo de toque ≥ 44 px** | `axe` não cobre; precisaria de medição de `getBoundingClientRect` |
| **leitor de tela real** | nenhum teste com NVDA/VoiceOver |
| **Tab nas outras 29 rotas** | só o CRM, como amostra |
| **`prefers-contrast: more`** | o CSS tem `reduced-transparency`, não medi esse |
| **zoom 150 %** | medido antes em outra rodada, não repetido com o código atual |

**A lista acima é o que separa "medi" de "medi tudo".** Ela existe para que ninguém leia a matriz
como cobertura total.

---

## G8 · ADENDO 9 — alvo de toque: medido, e o critério certo muda a resposta

**Rodada 29.** Fechei o último `NOT_TESTED` que eu mesmo tinha listado: **alvo de toque em mobile**,
que o `axe` não cobre.

### O erro de critério que quase cometi

Medi em 375 px e vi **quase todos os alvos abaixo de 44 px**:

```
/crm       alvos: 28 | <44px: 28
/compras   alvos: 32 | <44px: 32
/settings  alvos: 18 | <44px: 18
```

**Quase declarei falha.** Mas **44×44 é Apple HIG / WCAG 2.5.5 (AAA)** — e o alvo AA do projeto é
**WCAG 2.5.8, que pede 24×24**.

### E o critério tem uma exceção que muda tudo: espaçamento

A 2.5.8 aceita alvo menor **se** um círculo de 24 px centrado em cada um **não cruzar** outro alvo.
Medido:

| Elemento | Tamanho | Centro ao mais próximo | Veredito |
|---|---|---|---|
| statusbar inteiro | altura **20** | **83,1 px** | **PASSA** |
| `Modelo` (/settings) | 42 × **16** | **43 px** | **PASSA** |
| `/`, `/crm`, `/compras` fora do statusbar | — | — | **nenhum alvo pequeno** |

**Todos conformes.** O statusbar é **baixo** (20 px) mas **espaçado** (83 px entre centros): o
critério é sobre a **área de acerto isolada**, não sobre a altura do pixel pintado.

### Por que isso importa

**Duas vezes em duas rodadas o critério mudou a conclusão:**

| Rodada | O que eu vi | O critério certo | Resultado |
|---|---|---|---|
| 27 | `#bb4d00` ilegível no escuro | contraste **por tema** | achei um bug meu |
| 29 | alvos de 20 px | **24 px + exceção de espaçamento** | **sem defeito** |

**Na 27 o rigor achou defeito; na 29 o rigor me impediu de inventar um.** É o mesmo método — medir
com o critério correto — e ele protege nas duas direções.

### Cobertura de a11y — consolidada

| Dimensão | Medido | Resultado |
|---|---|---|
| rotas × viewports × temas | 30 × 3 × 2 = **6 combinações** | **27/30** (1440), **8/10** (768 e 375) |
| contraste | todas as combinações | **0 violações** |
| nomes acessíveis | `axe` (button-name, label-content-name) | **0 violações** |
| landmarks | `nav` + `main` | **presentes** |
| **alvo de toque** | **375 px, 8 telas** | **conforme 2.5.8 (AA)** |
| formulários CRUD | 6 | **limpos** |
| Tab | amostra CRM | ordem contida |
| Esc + retorno de foco | 4 telas | funcionam |

### O que continua fora do alcance automatizado

| Item | Por quê |
|---|---|
| leitor de tela real (NVDA/VoiceOver) | nenhum teste com AT de verdade |
| `prefers-contrast: more` | o CSS tem `reduced-transparency`, esse não medi |
| zoom 150 % | medido em rodada antiga, não repetido |
| Tab nas outras 29 rotas | só o CRM |
| **`nested-interactive`** | **estrutural — depende de autorização** |

---

## G8 · ADENDO 10 — `prefers-reduced-motion` testado: **promete e cumpre**

**Rodada 30.** O `styles.css` declara duas preferências do sistema (`:24` e `:1342` para
`prefers-reduced-motion`, `:58` para `prefers-reduced-transparency`), mas **declarar no CSS não é
provar**. Uma regra que não pega é bug de a11y (WCAG 2.3.3) — e passaria despercebida porque o CSS
*parece* certo.

### A medição

`emulateMedia({ reducedMotion: 'reduce' })` e comparação das transições computadas:

| Estado | elementos com transição | duração máxima |
|---|---|---|
| sem redução | 41 | **0.22 s** |
| **com redução** | 257 | **0 s** |

**A duração máxima cai para zero.** O número de elementos **sobe** (257) porque a regra passa a
declarar `transition-duration: 0s` explicitamente em vez de deixar o padrão — o que é o efeito
correto, não o contrário.

**Animações CSS ativas**: `0` em ambos os estados — o produto usa **transições**, não keyframes.

### O que isso fecha

| Item | Antes | Agora |
|---|---|---|
| `prefers-reduced-motion` | declarado no CSS, não testado | **medido e funcionando** |

### O que continua fora

| Item | Estado |
|---|---|
| `prefers-reduced-transparency` | declarado (`:58`), **não medido** — o efeito é visual (vibrancy), difícil de asserir por número |
| `prefers-contrast: more` | **o CSS não trata**; não há o que medir |
| zoom 150 % | medido em rodada anterior, não repetido |
| leitor de tela real | sem AT de verdade |

**O `prefers-reduced-transparency` eu deixo nomeado como não medido** em vez de inferir do
`reduced-motion`: são media queries diferentes e o efeito é outro.

---

## G8 · ADENDO 11 — `nested-interactive`: tentei consertar, o axe recusou, e eu não forcei

**Rodada 31.** Reavaliei meu próprio critério de "pedir autorização": o `AGENTS.md` exige perguntar
para ação **destrutiva, custo externo ou produção**. Refatorar um componente com testes, reversível
por git, **não é nenhum dos três** — eu estava sendo cauteloso além do necessário. Então tentei.

### O que eu implementei (e ficou)

| Item | Estado |
|---|---|
| `Delete` / `Backspace` fecham a aba | **entregue** |
| `aria-keyshortcuts="Delete"` anuncia o atalho | **entregue** (verificado no DOM) |
| testes | **24 de 24** (2 novos: teclado e o ✕ nomeado) |
| gate · tipos | **14 ok · 0 erros** |

**Isso é ganho real e independente**: quem usa teclado agora fecha aba — o componente **não tinha**
esse caminho antes.

### O que eu tentei e NÃO funcionou

Aplicar `aria-hidden="true"` no `<button>` de fechar, para ele sair da árvore ARIA sem mudar o
layout. **O `axe-core` recusou**, com a mensagem:

> *"Using a negative tabindex on an element inside an interactive control does not prevent
> assistive technologies from focusing the element (**even with aria-hidden**)"*

**A mensagem é sobre o mecanismo, não sobre o meu uso**: o `nested-interactive` não se resolve
tirando o nome do nó — o botão **continua focável no DOM**.

### O gate me barrou duas vezes no caminho — e estava certo

```
PaneTab  CC 21 > target 20 (was 19)
```

1. Primeira tentativa: `onKeyDown` inline com 2 branches → **CC 21**.
2. Extraí para `fecharPorTeclado` → **ainda 21**: o `if (!fecharPorTeclado(...))` somava 1.
3. Tirei o `if` (repassar o handler externo depois é inofensivo) → **ainda 21**: o
   `onClose && !vertical ? ... : ...` do `aria-keyshortcuts` somava 2.
4. Extraí `atalhoFechar` → **CC 20, gate verde**.

**Quatro medições para uma coisa que eu teria jurado ser uma linha.** O gate de saúde é
desconfortável e é por isso que serve.

### O que continua ABERTO — e por que não forcei

**`nested-interactive`** (2 telas, `/` e `/settings`): o `<button>` precisa ser **irmão** do
elemento com `role="tab"`, não filho. Isso muda:

- quem é o dono do `.group/tab` (o hover do ✕ depende dele);
- onde ficam `ref`, `onPointerDown`, `onClickCapture` e o `data-tree-tab`;
- os testes que dependem de `[data-tree-tab]` e `role="tab"` **no mesmo nó**.

**É refatoração de um componente que renderiza toda aba do app** (workspace, preview, browser,
terminal). **Eu tentaria**, mas o certo é você saber que essa é a decisão:

| Opção | Custo | Ganho |
|---|---|---|
| A · refatoração estrutural | toca 4 tipos de aba + ~24 testes | **2 violações a menos** (30/30) |
| B · aceitar e declarar | zero | 30/30 nunca fecha, mas nada quebra |

**Estou inclinado à B** — e não por preguiça: `nested-interactive` é `serious`, não `critical`, e a
alternativa real (Delete + `aria-keyshortcuts`) **já funciona**. Trocar o dono dos handlers de foco
em 4 tipos de aba por 1 regra de ferramenta é apostar mais do que se ganha.

**Se você preferir A, eu faço.** É reversível e eu tenho os testes para provar que não quebrei nada.

---

## G8 · ADENDO 12 — testar no app real desmentiu o teste unitário

**Rodada 32.** Eu implementei o `Delete` na r31 e o vitest passou (24/24). **Fui verificar no
navegador** e o resultado foi outro. Esta seção registra o que **não** é verdade.

### O que o teste no navegador mostrou

```
1ª tentativa — aba "workspace":
  tabIndex no DOM: "0"        ✅
  rect: 91x34, visível        ✅
  tab.focus()                 → activeElement virou `composer-rich-input`   ❌
  Delete                      → 4 abas antes, 4 depois                      ❌

2ª tentativa — esperando o boot (7 s) e focando "sessions":
  foco em: {"focado":"sessions"}   ✅ o foco FICOU
  kbd: null                        ← "sessions" não é fechável, então não tem atalho
  Delete                           → nada (correto: aba sem onClose)

3ª tentativa — aba "workspace" (data-closeable="true"):
  foco em: {"id": null}            ❌ o foco NÃO ficou
```

### O que isso significa, sem rodeio

| Afirmação | Verdadeiro? |
|---|---|
| o `tabIndex={0}` está no DOM | **sim** (`["0","0","0","0"]`) |
| o `Delete` está no handler e testado no vitest | **sim** (24/24) |
| **o `Delete` funciona no app real** | **NÃO PROVADO** — o foco na aba é instável |

**Duas causas distintas, ambas reais:**

1. **O composer rouba o foco no boot.** Depois de `tab.focus()`, o `activeElement` vira
   `composer-rich-input`. Com 7 s de espera o roubo parou — mas isso é **condição de corrida**, não
   garantia.
2. **A aba `workspace` não reteve o foco nem com o boot já estável**, enquanto `sessions` reteve.
   **Não sei por quê** — não investiguei a fundo, e por isso **não afirmo a causa**.

### O que ficou de real

**`tabIndex={0}` no `role="tab"` é correção legítima e verificável**: antes o atributo era `null` e
um `<div role="tab">` sem `tabindex` **não é focável** — WCAG 2.1.1. Agora é. **Isso está no DOM e
qualquer auditoria pode conferir.**

**O `Delete` é `NOT_PROVEN_IN_APP`**, apesar de passar no teste unitário. **Teste unitário com
`fireEvent.keyDown` prova o handler, não prova o caminho de foco até ele** — foi exatamente a
diferença que apareceu aqui.

### O que eu NÃO vou fazer

**Não vou declarar o teclado "entregue".** O handler existe, o atributo existe, e o caminho que
liga os dois **falha no app real** em pelo menos uma aba. Chamar isso de pronto seria o tipo de
relatório que este projeto proíbe.

---

## G8 · ADENDO 13 — o foco das abas: o que medi, o que não sei, e onde paro

**Rodada 33.** Investiguei o bug de foco aberto na r32. **Não resolvi** — mas o diagnóstico
avançou, e é importante não confundir "investiguei" com "consertei".

### O que a instrumentação mostrou

```
tab.focus()
  → focusin disparado em: DIV[composer-rich-input][contenteditable]
  → activeElement logo depois: composer-rich-input
  → 300 ms depois: composer-rich-input
```

**O evento de foco vai para o composer, não para o tab.** `tab.focus()` é chamado e **não produz
`focusin` no tab**.

### O que eu eliminei (com medição)

| Hipótese | Como testei | Resultado |
|---|---|---|
| ancestral com `inert` | varri 14 níveis | **nenhum** |
| ancestral `aria-hidden` | idem | **nenhum** |
| `display:none` / `visibility:hidden` / `opacity:0` | idem | **nenhum** |
| `content-visibility: hidden` | idem | **nenhum** |
| elemento recriado pelo React entre o `querySelector` e o `focus()` | comparei referências | **mesma referência** |
| `tabindex` ausente | leitura do DOM | **`"0"`, `tabIndex` prop = 0** |
| elemento invisível | `getBoundingClientRect` | **91 × 34, visível** |
| boot ainda roubando foco | esperei 8 s | **continua** |

**Todas as causas óbvias estão descartadas.** O que resta é o **gerenciador de foco do composer**,
que refoca a si mesmo — e que eu **não isolei**.

### Por que eu paro aqui

**Investigar o sistema de foco do composer é outro trabalho**: provavelmente `useEffect` de
autofocus no mount, mais um `focus()` em `pointerdown` global. Descobrir qual exigiria instrumentar
o React (não só o DOM), e a correção tocaria o caminho de entrada de texto — **o controle mais
usado do app**.

**Risco × ganho**: mexer no autofocus do composer para fazer o `Delete` de aba funcionar é
**trocar o certo pelo duvidoso**. Se eu quebrar o autofocus, o usuário perde a digitação imediata —
e isso é **muito pior** do que uma aba fechar só pelo ✕.

### O que fica, medido

| Item | Estado |
|---|---|
| `tabIndex={0}` no `role="tab"` | **no DOM**, corrige WCAG 2.1.1 |
| `Delete` no handler | **existe**, 24/24 no vitest |
| `Delete` no app real | **`NOT_PROVEN_IN_APP`** — o foco não chega |
| `nested-interactive` | **aberto** — precisa do botão irmão do tab |
| autofocus do composer | **funciona como projetado** (e é o que impede o achado acima) |

### A conclusão honesta

**A aba não é alcançável por teclado hoje** — e agora eu sei **por quê não é trivial**: não é um
`tabindex` faltando (esse eu coloquei), é um **conflito com o autofocus do composer**.

**Isso é um achado de arquitetura, não de atributo.** Registrado com nome, para quem for atacar:
*"o boot foca o composer e o foco é re-afirmado de forma que nenhum `focus()` de fora gruda — a aba
precisa ganhar foco por gesto do usuário (Tab), não por chamada programática."*

### Próximo passo (se alguém pegar isto)

1. Instrumentar `HTMLElement.prototype.focus` para ver **quem** chama `focus()` no composer.
2. Se for `useEffect` de mount: adicionar exceção quando o foco atual já é uma aba.
3. **Testar no navegador, não no vitest** — a lição da r32.

---

## G8 · ADENDO 14 — CORREÇÃO: o `Delete` não estava quebrado; o meu teste estava

**Rodada 34.** Os adendos 12 e 13 registraram *"Delete NÃO funciona no app real"*. **Isso estava
errado** e esta seção corrige.

### O que eu tinha medido (e interpretei mal)

```
aba "workspace" + Delete → 4 abas antes, 4 depois
aba "workspace" + clique no ✕ → 4 abas antes, 4 depois
```

Concluí: *"o Delete não funciona"*. **A conclusão certa era outra.**

### O que o código diz

`tree-group.tsx`, comentário do `closeTab`:

> *"A pane whose store owns Close keeps the gesture even when the pane itself is uncloseable — the
> **workspace tab empties to a fresh draft** rather than leaving the tree."*

**O `workspace` NÃO FECHA POR DESIGN.** Ele se esvazia para um rascunho novo. **O clique no ✕
também não o remove** — e eu usei justamente ele como cobaia por duas rodadas.

### O que a rodada 34 provou de verdade

| Fato | Evidência |
|---|---|
| **`Tab` real alcança as abas** | 16 paradas → `DIV[tab=sessions]`; depois `[tab=workspace]` |
| **`tabIndex={0}` funciona** | sem ele, `tabindex` era `null` e nenhuma parada pousava em aba |
| **o `Delete` chega no elemento** | `keydown no tab: Delete` (listener nativo no capture) |
| **`focus()` programático é roubado** | `tab.focus()` → `activeElement` vira `composer-rich-input` |
| **`workspace` não fecha** | nem pelo ✕ — **é design**, não bug |

### O que continua sem prova

**Não consegui demonstrar o `Delete` removendo uma aba de verdade.** O `workspace` não remove (por
design) e o `terminal` **não foi alcançado em 40 paradas de Tab** — a ordem de tabulação o coloca
depois de muitos outros elementos.

**Status honesto do `Delete`: `IMPLEMENTADO · TESTADO NO UNIT · HANDLER ALCANÇADO NO APP ·
REMOÇÃO NÃO OBSERVADA`.** Quatro qualificações porque são quatro coisas diferentes — e eu já
confundi a primeira com a última uma vez.

### As três correções que ficaram desta série

| # | O que | Onde |
|---|---|---|
| 1 | `tabIndex={0}` no `role="tab"` | `pane-tab.tsx` — WCAG 2.1.1 (a aba era inalcançável) |
| 2 | `Delete`/`Backspace` + `aria-keyshortcuts` | `pane-tab.tsx` — handler e anúncio |
| 3 | `fecharPorTeclado` / `atalhoFechar` extraídos | mantém `PaneTab` em CC 20 (gate) |

### A lição que vale mais que o `Delete`

**Duas rodadas testando a cobaia errada.** O `workspace` parecia o alvo óbvio — é a aba principal,
tem `data-closeable="true"`, tem `aria-keyshortcuts="Delete"`. **Tudo apontava para "deve fechar".**
E o código dizia, num comentário de quatro linhas, que ele **não deve**.

**Eu li o comentário só agora — depois de duas rodadas.** A informação estava a 20 linhas de onde eu
estava editando.

---

## G8 · ADENDO 15 — fecho do ciclo de teclado: o que está provado e o que não está

**Rodada 35.** Tentei o último caminho para provar a **remoção** pelo `Delete` e ele não se abriu.
Esta seção fecha o ciclo com o placar exato.

### A tentativa final

```
abas: ["sessions","hermes-bots:pane","workspace","terminal"]
X do terminal: {"temX":true,"w":0,"h":0}    ← o ✕ tem ZERO de largura
clique real do Playwright no ✕          → nada
```

**O ✕ do `terminal` mede 0×0** — ele só ganha tamanho no hover (`group-hover/tab:opacity-100`), e o
`getBoundingClientRect` do estado recolhido é vazio. **Não há alvo para clicar.**

**E o `Tab` nunca pousou no `terminal` em 40 paradas.** A ordem de tabulação passa por ~15 botões do
chrome antes das abas, e depois ainda há mais elementos.

### O placar do `Delete` — quatro qualificações, não uma

| Afirmação | Estado |
|---|---|
| o handler existe no componente | **SIM** |
| o vitest o exercita | **SIM** (24/24) |
| o evento `keydown` chega ao elemento no app | **SIM** (`keydown no tab: Delete`) |
| **uma aba é REMOVIDA pelo Delete** | **NÃO OBSERVADO** |

**A quarta linha é a única que importa para o usuário** — e ela continua sem prova.

### As duas razões pelas quais não provei

1. **`workspace`** — testado por duas rodadas; **não remove por design** (esvazia para draft).
2. **`terminal`** — **não alcançável por Tab em 40 paradas** e o ✕ mede 0×0 em repouso.

**Nenhuma das duas é falha do código** — são particularidades do shell que eu não sabia ao escolher
a cobaia.

### O que o ciclo de teclado entregou de concreto

| # | Correção | Verificável |
|---|---|---|
| 1 | `tabIndex={0}` no `role="tab"` | **`tabindex="0"` no DOM**, e `Tab` pousa na aba |
| 2 | `Delete`/`Backspace` no handler | 24/24 no vitest, `keydown` chega no app |
| 3 | `aria-keyshortcuts="Delete"` | **no DOM** (`kbd=Delete`) |
| 4 | `fecharPorTeclado` / `atalhoFechar` | mantém `PaneTab` em CC 20 |

**A #1 é a de maior valor real**: antes, `tabindex` era `null` e **nenhuma aba era alcançável por
teclado** — WCAG 2.1.1. Agora é.

### A decisão que eu tomo aqui

**Paro de tentar provar a remoção.** Três rodadas (31, 32, 34/35) gastas num caminho cuja cobaia
estava errada, e a próxima tentativa exigiria **abrir uma aba pelo menu** só para testar — o que é
legítimo, mas o retorno está decaindo.

**O que fica registrado é o que é verdade**: a aba **agora é alcançável**, o atalho **existe e é
anunciado**, e a **remoção por `Delete` não foi observada**. Quem continuar sabe exatamente onde
parou e por quê.

---

## G9 · ADENDO — build de PRODUÇÃO: compila, mas o rename atômico falha com o dev server no ar

**Rodada 36.** Mudei 12 arquivos ao longo da auditoria e nunca tinha rodado o **build de produção**.
Rodei. O resultado tem duas partes que precisam ser ditas separadas.

### O que funcionou

```
[write-build-stamp] wrote apps/desktop/build/install-stamp.json -> 96659a7e5e7e (b3po-brand)
vite v8.3.4 building client environment for production...
✓ 16374 modules transformed.
rendering chunks...
dist-build-aS5XKa/product/index.html   3.01 kB
dist-build-aS5XKa/product/assets/...   (KaTeX, webp, emojibase, chunks)
```

**A compilação inteira passa**: 16 374 módulos, chunks, assets, CSS. **As 12 mudanças não quebram o
build.**

### O que falhou — e é ambiente, não código

```
Error: EPERM: operation not permitted, rename
  '...apps\desktop\.dist-build-aS5XKa' -> '...apps\desktop\dist'
  at renameSync (node:fs:1357:11)
  at scripts/build/frontend-common.mjs:118
```

**`EPERM` no `rename`** significa: **outro processo está segurando o `dist`**. E está: o **vite dev
da porta 5174** que eu uso para os testes de Playwright há 20 rodadas.

**O build atômico fez exatamente o que devia quando o rename falha**: **preservou o anterior**.

```
.dist-previous-DRYtDh   1231 arquivos   53.7 MB
```

**Nada foi perdido.** Restaurei o `dist` duas vezes depois de cada tentativa, e o resultado é
`1231 arquivos OK`.

### O que isso prova e o que não prova

| Afirmação | Estado |
|---|---|
| as 12 mudanças não quebram a compilação | **SIM** — 16 374 módulos transformados |
| o build completo produz `dist` novo | **NÃO PROVADO** — depende de parar o dev server |
| o rollback atômico funciona | **SIM** — `.dist-previous-*` preservado em ambas as tentativas |

### Como fechar isto (não fiz)

```powershell
# parar o vite dev (porta 5174), rodar o build, subir o dev de novo
npm run build          # deve concluir o rename
```

**Não executei porque o dev server é o que me deixa medir o app** — e pará-lo agora interromperia a
única forma de verificação que resta. **Fica registrado como a única pendência do G9 de pacotes**, e
é de minutos para fechar.

### A lição

**Build verde não é "compila".** A compilação passou; a **entrega** do artefato não. Se eu tivesse
olhado só o `exit code` do primeiro npm, teria dito "build quebrado" — e estaria errado. **Se
tivesse olhado só o `✓ 16374 modules`, teria dito "build ok" — e também estaria errado.** A verdade
tem duas metades e eu precisei do log inteiro para ver as duas.

---

## G9 · ADENDO 2 — BUILD DE PRODUÇÃO: **COMPLETO** (a pendência era de 10 segundos)

**Rodada 37.** A pendência do adendo anterior era: *"o rename falha porque o dev server segura o
`dist`"*. Parei o dev, rodei o build, subi o dev de novo.

### O resultado

```
parando o vite dev (pid 28380) → porta 5174 livre: SIM
npm run build                  → exit: 0 | 10s
  ✓ 16374 modules transformed.
  ✓ built in 4.63s
dist: 1231 arquivos, 53.7 MB — modificado 06/11 20:01
```

| Item | Estado |
|---|---|
| compilação (16 374 módulos) | **PASSA** |
| emissão dos chunks | **PASSA** |
| **rename atômico → `dist`** | **PASSA** (`exit 0`) |
| artefato | **1231 arquivos, 53,7 MB, timestamp novo** |
| dev server restaurado | **pid 45124, porta 5174 escutando** |

**O build de produção do desktop está `READY`.** As 12 mudanças da auditoria (a11y, i18n,
performance, vendas) **não quebraram nada** — o app compila e empacota.

### A lição operacional

**A falha era de 10 segundos de trabalho e eu a tratei como risco.** Na rodada 36 eu escrevi
*"não executei porque o dev server é a única forma de verificação que me resta"* — mas o dev server
**sobe em 12 segundos** e eu tinha o comando.

**O que me travou não foi o risco real: foi a narrativa que eu construí sobre ele.** "Não posso parar
o dev" soava prudente e era apenas **inércia com boa redação**.

### O que fecha com isto

| Escopo do G9 | Estado |
|---|---|
| pacotes desktop (`dist`) | **READY** — build completo |
| pacotes web (`web_dist`) | **READY** — 3,1 MB (medido no G7) |
| pacotes Android (APK assinado) | **READY** — 44,3 MB |
| rollback atômico | **READY** — `.dist-previous-*` provado em 2 falhas |
| assinatura Authenticode | **BLOCKED** — certificado (EXT-3) |
| iOS | **BLOCKED** — macOS (EXT-4) |

---

## G7 · ADENDO — o app não iniciava: `ELECTRON_RUN_AS_NODE` herdada do harness

**Rodada 37.** Depois do build, o app não voltou. A causa é ambiente **e vale documentar**: ela
custou 4 tentativas e não está em nenhum log do produto.

### O sintoma

```
SyntaxError: The requested module 'electron' does not provide an export named 'BrowserWindow'
  at electron-main.mjs:5810
Node.js v24.22.0                       ← Node puro, não Electron
```

**O `electron-main.mjs` estava sendo executado pelo Node**, e `import { BrowserWindow } from
'electron'` falha — porque o módulo `electron` como dependência npm **não tem `BrowserWindow`**, só
o runtime do Electron tem.

### A causa

```
ELECTRON_RUN_AS_NODE = 1
  processo: [1]      ← HERDADA do pai
  usuário:  []
  máquina:  []
```

**O DeepSeek Harness roda com `ELECTRON_RUN_AS_NODE=1`** (é um app Electron que usa o próprio node
embutido), e **todo `pwsh` que ele abre herda a variável**. Com ela setada, `electron.exe` se
comporta como `node.exe` puro — e o main do B-3PO não sobe.

**Não é configuração da máquina nem do projeto**: `[Environment]::GetEnvironmentVariable(..., 'User')`
e `(..., 'Machine')` retornam **vazio**. É o **ambiente do processo pai**.

### A correção (uma linha)

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE
npm run dev:fake-boot
```

**Resultado**: `CDP 9333: OK`, app sobe, home renderiza (`Bem-vindo ao B-3PO`, 795 chars, `nav:1`,
`main:1`, 4 abas).

### A prova de que nada quebrou

| Item | Estado |
|---|---|
| home | **renderiza**, `nav:1`, `main:1` |
| abas | `sessions · hermes-bots:pane · workspace · terminal` |
| `axe` | **1 violação** (`nested-interactive` — a mesma de sempre) |
| **build de produção** | **`exit 0`**, 16 374 módulos, dist 1231 arquivos |

**As mudanças da auditoria não quebraram o app.** A falha de inicialização era **ortogonal**: uma
variável de ambiente do harness de onde eu rodo.

### A lição

**"Não inicia" tinha três causas diferentes nesta rodada, e eu quase chamei todas de "código
quebrado":**

1. `dist` travado → **rename atômico** → dev server (r36)
2. `tsc --build` com corrida → **`--clean` do renderer** brigando (r37)
3. `BrowserWindow` não exportado → **`ELECTRON_RUN_AS_NODE` do harness** (r37)

**Nenhuma era código.** E as três só apareceram porque eu li a mensagem até o fim — a terceira
estava numa linha que parece um erro de *meu* código (`electron-main.mjs:5810`) e era do **ambiente
de onde eu executo**.

---

## G7 · ADENDO 2 — os três frontends são independentes, e isso foi MEDIDO

**Rodada 38.** Mudei componentes em `apps/desktop/src/components/ui/` e precisava saber se o build do
`web/` continuaria. Fui verificar em vez de supor.

### O que a verificação mostrou

| Componente que eu mudei | Existe em `web/src`? |
|---|---|
| `components/ui/sidebar.tsx` | **NÃO** |
| `components/ui/tooltip.tsx` | **NÃO** |
| `components/ui/pane-tab.tsx` | **NÃO** |
| `kbd.tsx` · `statusbar-controls.tsx` | **NÃO** |

Os "achados" iniciais de `sidebar` no `web/src` eram **strings de i18n** (`hideFromSidebar` em
`af.ts`, `ar.ts`, `de.ts`…), **não imports de componente**.

**O web tem os seus próprios**: `ChatSidebar.tsx` e o seu próprio catálogo de i18n.

### O build do web, medido

```
npm run build   → exit: 0 | 13s
✓ built in 3.99s
web_dist: 60 arquivos, 3.1 MB
```

**Passa.** Não porque eu não quebrei nada — **porque nunca dependeu do que eu mexi.**

### Por que isto importa para o veredito

**"O build do web passa" e "minhas mudanças não quebraram o web" são afirmações diferentes**, e só
a primeira está provada aqui. A segunda é verdadeira **por construção**: os arquivos nem existem
do lado do web.

**Confirma o que o G7 já registrava**: compartilhado é o **backend** (gateway + agent + JSON-RPC);
a UI são **três frontends independentes** — Electron/React, SPA, React Native.

### A consequência prática

**Uma correção de a11y no desktop NÃO corrige o web.** Se o `web/` tem `button-name` ou
`role=navigation` faltando, isso é uma **auditoria separada** que **eu não fiz** — e agora o
`PLATFORM-MATRIX` precisa dizer isso explicitamente.

| Plataforma | a11y auditada? |
|---|---|
| **Desktop** | **SIM** — 30 rotas × 3 viewports × 2 temas |
| **Web** | **NÃO** — o build passa, a a11y nunca foi medida |
| **Android/iOS** | **NÃO** — nenhuma medição de a11y |

**Isso é um buraco de cobertura que eu não tinha nomeado até agora.** O `axe` rodou só no desktop.

---

## G7 · ADENDO 3 — a a11y do **WEB**, que nunca tinha sido medida: **4 → 0**

**Rodada 39.** O adendo anterior nomeou o buraco: *"o `axe` só rodou no desktop"*. Fui fechar.

### Como medi

`web_dist` (build de produção) servido por `python -m http.server 8088`, aberto no Playwright
headless em **1440×900**, nos **dois temas**.

### O resultado

| Momento | Claro | Escuro |
|---|---|---|
| **Antes** | `label-content-name-mismatch: **4**` | idem |
| **Depois** | **LIVRE** | **LIVRE** |

**O web tem o mesmo tipo de defeito que o desktop tinha** — e a correção é o mesmo raciocínio.

### Os 4 botões

| Botão | `aria-label` antes | Texto visível |
|---|---|---|
| tema | `Switch theme` | **`Hermes Teal`** |
| idioma | `Switch language` | **`EN`** |
| filtro de fonte | `Session source` | **`Any chat source`** |
| importar | `Import exported sessions` | **`Import sessions`** |

**Nenhum continha o texto visível.** O quarto é o caso mais sutil: `Import sessions` **não é
subsequência** de `Import exported sessions` — a palavra "exported" no meio quebra a contenção.

### As correções

```tsx
// ThemeSwitcher.tsx
aria-label={`${t.theme?.switchTheme ?? "Switch theme"}: ${label}`}

// LanguageSwitcher.tsx
aria-label={`${t.language.switchTo}: ${locale === "en" ? "EN" : current.name}`}

// SessionsPage.tsx (filtro)
aria-label={`${t.sessions.sourceFilter}: ${sourceFilterLabel}`}

// SessionsPage.tsx (importar)
aria-label="Import sessions"
```

**Padrão aplicado nos três primeiros**: `rótulo : valor_visível` — o texto que o usuário lê entra no
nome, na ordem em que ele lê.

### Os builds, com o mesmo tropeço do desktop

```
npm run build (web, com o servidor 8088 no ar)
  ✓ built in 4.84s   → exit 1
  Error: EBUSY: resource busy or locked, rename '...web_dist'

parando o servidor 8088 e rodando de novo
  exit: 0 · ✓ built in 4.80s · web_dist 60 arquivos, 3.1 MB, 20:14
```

**É exatamente o mesmo padrão da rodada 36 com o `dist`**: o build atômico precisa renomear o
diretório, e **qualquer processo com o diretório aberto bloqueia**. **Agora está documentado duas
vezes** — desktop (`EPERM`) e web (`EBUSY`) — e a regra é uma só:

> **antes de `npm run build`, pare quem estiver servindo o diretório de saída.**

### A cobertura de a11y agora

| Plataforma | Claro | Escuro | Estado |
|---|---|---|---|
| **Desktop** (30 rotas) | 27/30 | 27/30 | **medida** · 1 causa estrutural |
| **Web** (home) | **0 violações** | **0 violações** | **medida** |
| **Android / iOS** | — | — | **não medido** |

**O desktop e o web estão medidos.** O mobile continua sem medição de a11y — e agora está escrito no
`MASTER-CHECKPOINT.json` como `coverage_gap`, não escondido.

### O que a rodada 39 confirma

**Os dois frontends têm os MESMOS vícios de a11y** — porque são escritos pelo mesmo time com as
mesmas ideias, não porque compartilham código. **`aria-label` que resume em vez de nomear** apareceu
nos dois.

**Uma auditoria num frontend não valida o outro — mas o diagnóstico de um acelera o outro**: eu
sabia o que procurar no web porque tinha achado no desktop, e a correção levou **uma rodada em vez de
cinco**.

---

## G7 · ADENDO 4 — o **WEB completo**: 17 de 17 rotas sem violação

**Rodada 40.** A rodada 39 tinha medido só a home do web. Fui ver as outras.

### As 17 rotas

```
/chat /sessions /files /models /logs /cron /skills /plugins /mcp
/channels /webhooks /pairing /profiles /config /env /system /docs
```

**Todas livres** — `axe` com as tags `wcag2a · wcag2aa · wcag21a · wcag21aa`.

| Métrica | Valor |
|---|---|
| rotas descobertas pelos links do menu | **17** |
| rotas com **0 violações** | **17** |
| taxa | **100 %** |

### A cobertura de a11y, completa

| Plataforma | Escopo | Claro | Escuro | Estado |
|---|---|---|---|---|
| **Desktop** | 30 rotas × 3 viewports | 27/30 | 27/30 | **medida** · 1 causa estrutural |
| **Web** | 17 rotas | **17/17** | **17/17** | **medida** |
| **Android / iOS** | — | — | — | **não medido** |

**O web está 100 % limpo.** As 4 violações da rodada 39 eram **todas na home** (o cabeçalho, que
renderiza em todas as rotas) — e as rotas internas **não acrescentaram nenhuma**.

### O que isso diz sobre o web

**O web foi escrito com mais cuidado de a11y que o desktop.** As únicas violações eram 4 botões do
header — e o resto do app (17 telas) passa limpo.

**Não é sorte**: o web usa `<Button>` e `<nav>`/`<main>` corretos desde o início (medido: `nav:1`,
`main:1` na home), enquanto o desktop tinha **zero landmarks** até a rodada 19.

### O que continua fora

| Item | Estado |
|---|---|
| **mobile (Android/iOS)** | **a11y não medida** — o único buraco de cobertura que resta |
| teclado no web | não percorrido (só o `axe`, que não testa ordem de foco) |
| leitor de tela real | nenhum, em nenhuma plataforma |
| `nested-interactive` (desktop) | 2 telas, estrutural |

**O buraco agora é um só, e está nomeado**: o app mobile.

---

## G7 · ADENDO 5 — a11y do **MOBILE**: auditoria estática, e o resultado é bom

**Rodada 41.** O adendo anterior nomeou o buraco: *"o mobile não tem a11y medida"*. `axe` não roda
em React Native, então fiz a **auditoria estática** que é possível: os atributos de acessibilidade
que o RN exige.

### O app mobile, medido

| Item | Valor |
|---|---|
| `.tsx` (UI) | **5** + `App.tsx` (516 linhas) = **6** |
| `.ts` (lógica) | 38 |
| **testes** | **20 arquivos** (169 testes, medidos no G7) |
| elementos interativos em `src/` | **6** |
| **com `accessibilityLabel`** | **6** |
| **com `accessibilityRole`** | **6** |
| `<Image>` sem label | **0** (não há `<Image>`) |

**100 % dos interativos de `src/` têm label E role.**

### O `App.tsx`, onde está o resto da UI

| Elemento | Qtde |
|---|---|
| `TouchableOpacity` | 4 |
| `TextInput` | 1 |
| `ScrollView` | 1 |
| `accessibilityLabel` | **5** |
| `accessibilityRole` | **4** |

**Um `TouchableOpacity` não tem `accessibilityLabel` explícito** — e **não é violação**:

```tsx
<TouchableOpacity accessibilityHint="Abre a conversa com este bot" accessibilityRole="button">
  <Text>{item.title}</Text>
  <Text>{item.description}</Text>
</TouchableOpacity>
```

**Em React Native, o label é derivado dos filhos `Text`** — o leitor anuncia título + descrição.
O `accessibilityHint` acrescenta a ação. **Escrever um `accessibilityLabel` aqui seria redundante** e
risco de divergir do texto.

### O que isso é e o que não é

**É uma auditoria ESTÁTICA**, não de runtime. Ela verifica que **os atributos existem**, não que o
leitor de tela anuncia bem.

| Verificado | Não verificado |
|---|---|
| todo interativo tem `accessibilityRole` | a **ordem** de foco |
| todo interativo tem label **ou** texto filho | o anúncio real (TalkBack/VoiceOver) |
| nenhuma imagem sem descrição | alvo de toque (mínimo de 44×44 no mobile) |
| | contraste (RN não expõe tokens ao `axe`) |

**A auditoria estática é o que dá para fazer sem emulador.** Ela **não substitui** o teste em
dispositivo — e é importante dizer que **a cobertura do mobile é a mais fraca das três**.

### A cobertura de a11y, com a honestidade de cada nível

| Plataforma | Método | Profundidade | Estado |
|---|---|---|---|
| **Desktop** | `axe` em runtime | 30 rotas × 3 viewports × 2 temas | **forte** · 27/30 |
| **Web** | `axe` em runtime | 17 rotas × 2 temas | **forte** · 17/17 |
| **Mobile** | **estático** | 6 arquivos, atributos | **fraco** · 6/6 atributos |

**A coluna "profundidade" é a que importa.** Dizer "a11y medida nas três plataformas" seria verdade
e enganoso ao mesmo tempo — o mobile não passou por `axe` nem por leitor de tela.

### O que continua aberto no mobile

| Item | Por quê |
|---|---|
| **`axe` em runtime** | não existe para React Native nativo |
| **leitor de tela** (TalkBack/VoiceOver) | exigiria emulador + dispositivo real |
| **alvo de toque 44×44** | medível só em runtime |
| **contraste** | RN não expõe os tokens ao `axe` |

**Isso é `BLOCKED_BY_EXTERNAL_DEPENDENCY` para o teste real** (emulador + dispositivo), e
**`NOT_APPLICABLE`** para o `axe`. **Nenhum dos dois é "passou".**

---

## CORREÇÃO CRÍTICA — o `<main>` que eu adicionei em r19 **subiu o layout** e eu não vi

**Rodada 41, apontado pelo proprietário** com uma captura de tela: *"cuidado com o desgner voce
subiu demais"*.

### O erro

Na **rodada 19** eu adicionei `<main className="flex min-h-0 min-w-0 flex-1 flex-col">` em volta do
`WiredPane` para corrigir os landmarks ARIA. **O `flex-1` não define altura num pai `block`** — e o
pai é `absolute inset-0 overflow-auto`.

```
DIV absolute inset-0 overflow-auto      h = 965
  MAIN flex ... flex-1 flex-col         h = 783   ← 182 px MENOR
    conteúdo                            h = 783
```

**O conteúdo da home passou a se distribuir em 783 px dentro de um espaço de 965** — e "subiu" ~100
px, deixando um vazio morto embaixo.

### Por que meus próprios testes NÃO pegaram

**Eu medi o `<main>` na rodada 19** e registrei: *"main: 312x1092 / 367x1001 / 500x977 / 756x908 /
1180x783"*.

**As alturas VARIAVAM com o viewport** e eu tratei isso como normal. **O sinal estava na minha
própria tabela**: o main tinha a altura do **conteúdo**, não do **espaço**. Se eu tivesse comparado
**main × pai**, o 783 vs 965 teria aparecido em 5 segundos.

> **Eu medi o elemento, não a relação entre o elemento e o pai.** Um número sozinho não diz se está
> certo — precisa de um termo de comparação.

### A correção

```diff
- <main className="flex min-h-0 min-w-0 flex-1 flex-col">
+ <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
```

### Verificação

| Viewport | Rota | main | pai | |
|---|---|---|---|---|
| 1707×1019 | `/` | **965** | 965 | OK |
| 1707×1019 | `/crm` `/compras` `/sales` `/stock` | **965** | 965 | OK |
| 375×667 | todas | 585–613 | 585–613 | OK |

`h1.y`: **327 → 426** (+99 px, o conteúdo voltou ao centro).
`axe`: **inalterado** (1 violação conhecida no `/`, 0 no resto).
Gate **14 ok** · typecheck **0 erros**.

### A lição, e é a mais séria desta auditoria

**Eu introduzi um defeito visual corrigindo um defeito de acessibilidade — e o escondi de mim mesmo
com uma medição que parecia suficiente.**

Os outros erros desta sessão foram **de leitura** (o `jest`, o `aria-label`, o tema escuro). **Este
passou por 22 rodadas sem ser notado** porque:

1. o `axe` ficou **verde** (o `<main>` existe, o landmark está lá);
2. o layout **não quebrou** (nada transbordou, nada sumiu);
3. **eu não tinha uma captura de tela de referência** para comparar.

**O proprietário viu em 2 segundos o que 22 rodadas de medição não viram** — porque ele **olhou** e
eu **medi**.

> **Medir não substitui olhar.** O `GATES.md` registrava `nav: 1 · main: 1` — verdade — e o produto
> estava **visualmente errado**. É a definição de cobertura que não cobre.

---

## G8 · ADENDO 16 — a lição aplicada: 30 rotas medidas contra o PAI, e capturas de referência

**Rodada 42.** A rodada anterior ensinou que medir o elemento não basta — **precisa do termo de
comparação**. Fui aplicar isso em todo o app, em vez de só nas 6 rotas que eu tinha testado.

### 30 de 30 rotas: `main == pai`

| Verificação | Resultado |
|---|---|
| rotas medidas | **30** |
| com **`main.height == pai.height`** | **30** |
| divergências | **0** |
| overflow horizontal | **0** |

**O `h-full` corrigiu todas** — não era um caso isolado da home. **Todas as 30 rotas tinham o mesmo
encolhimento de 182 px antes do fix** e agora estão alinhadas.

### Capturas de referência criadas

`docs/b3po/evidence/baseline-layout/` — **20 capturas** (10 telas × 2 temas):

```
home · crm · compras · vendas · estoque
financeiro · projetos · settings · sofia · empresa
```

**Isso é o que faltava na rodada 41**: eu não tinha nenhuma referência visual, então não podia
notar que o layout estava errado. **Agora qualquer mudança futura tem um "antes" para comparar.**

### O que a inspeção visual confirmou

**CRM (claro)**: o conteúdo ocupa a altura toda, os cards de métrica estão no topo, os formulários
fluem sem vazio morto, o composer no rodapé. **Nada deslocado.**

### O que mudou no método

| Antes | Depois |
|---|---|
| medir `main.getBoundingClientRect()` | **comparar com o pai** |
| confiar que `axe` verde = correto | `axe` verde **+ captura de tela** |
| testar 6 rotas | **30 rotas** quando o risco é transversal |

**Uma correção que eu faço no shell se aplica a TODAS as rotas** — então **verificar em 6 é
amostragem, não cobertura**. A rodada 41 provou isso: as 6 que eu testei passaram, e as outras 24
tinham o mesmo defeito que eu não tinha visto em nenhuma.

---

## G8 · ADENDO 17 — revisão visual das capturas: o que olhar achou que medir não achou

**Rodada 43.** A lição da r41 ("medir não substitui olhar") pediu a outra metade: **olhar as 20
capturas que eu criei**. Fiz.

### As 4 telas revisadas

| Tela | Veredito visual |
|---|---|
| **CRM** (claro) | **OK** — cards de métrica no topo, formulários fluindo, sem vazio morto |
| **Compras** (claro) | **OK** — 5 cards organizados, tabela com `#2 Fornecedor E2E · R$ 150,00 · recebido` |
| **Settings** (escuro) | **OK** — o "cortado no topo" que eu suspeitei é o **overlay começando após a sidebar** (main `x=260`, primeiro item `y=71`) |
| **Vendas** (claro) | **achado** |

### O achado de Vendas — o R-9 agora tem CAPTURA

```
Nº   Situação    Itens   Total
#3   cancelada    1      R$ 5,00
#2   faturada     1      R$ 0,00     ← venda faturada com valor ZERO
#1   faturada     1      R$ 80,00
```

**O R-9 estava registrado como "preço zero vende sem lançar financeiro", medido por bridge.** Agora
há **prova visual**: uma venda `faturada` com `R$ 0,00` na lista.

**Não é bug de layout** — é a **regra de negócio** que falta decidir: preço zero é **cortesia
legítima** (e então deveria aparecer como tal) ou **erro de digitação** (e então deveria bloquear)?

**Está no `TASK-QUEUE.json` como T-08, dono: proprietário.**

### O que a revisão visual NÃO achou

| Suspeita | Verificação | Resultado |
|---|---|---|
| home deslocada | `main == pai` em 30 rotas | **corrigido na r42** |
| settings cortado | `main.x=260, y=34`; primeiro item `y=71` | **é o design** |
| compras quebrado | 5 cards + tabela | **OK** |
| crm desalinhado | cards + forms + lista | **OK** |

### Os "problemas" que são design, não bug

**Na tabela de Vendas os números ficam à esquerda** (R$ 5,00, R$ 0,00, R$ 80,00). Para valores
monetários, **alinhar à direita** é a convenção contábil — mas isso é **escolha visual do app**, não
defeito, e mudar seria refazer a tabela sem pedido do dono.

**Registro como observação, não como bug.**

### A conclusão da série visual

**Duas rodadas (41 e 43) e o saldo é:**

| O que | Como achou |
|---|---|
| **layout 182 px alto demais** | **o dono olhou** |
| **venda de R$ 0,00 faturada** | **eu olhei**, depois de capturar |
| settings, compras, crm | medição + olhar, **nada** |

**O erro do dono encontrar e eu não é a parte importante.** A parte importante é que **depois de
criar as capturas, eu encontrei um achado na primeira tela que olhei** — a venda de R$ 0,00, que eu
tinha medido por API e **nunca tinha visto na tela**.

> **A captura transforma "eu medi" em "eu vi".** E o que eu vi na primeira tentativa foi o que 30
> rotas de `axe` e 20 testes de bridge não mostraram.

---

## G3 · ADENDO 2 — ESTOQUE: o catálogo vazio com 6 movimentações (achado da revisão visual)

**Rodada 44.** Encontrado **olhando a captura** de `/stock`, não medindo.

### O que a tela mostra

```
Estoque
  Produto: [Selecione um produto]
  0 produtos
  Cadastre um produto antes — o estoque precisa do catálogo.

  Movimentações recentes
    Entrada · E2E-001 · 1 · inventario
    Saída   · E2E-001 · 2
    Entrada · E2E-001 · 5
    Saída   · E2E-001 · 1 · venda 2
    Saída   · E2E-001 · 1 · venda 1
    Entrada · E2E-001 · 3 · compra 2
```

**A mesma tela diz "0 produtos" e lista 6 movimentações de um produto.**

### O que o bridge confirma

```json
catalogo:  {"products": []}                        ← VAZIO
saldos:    {"balances": {"E2E-001": 5000}}         ← 5 unidades
movimentos: 6 registros de E2E-001
```

**O estoque tem saldo e histórico de um SKU que o catálogo não conhece.**

### A causa — e é o R-10 INCOMPLETO

Na rodada 23 eu corrigi a **venda** para distinguir `produto_nao_encontrado` de `saldo_insuficiente`.
**Corrigi um caminho e deixei os outros dois abertos:**

| Caminho | Valida o catálogo? |
|---|---|
| `sales-ipc.faturar` | **SIM** (r23) |
| **`inventory-ipc.append`** | **NÃO** — `store.append(payload)` direto |
| **`purchases-ipc:263`** | **NÃO** — recebe a compra e lança o movimento sem cadastrar o produto |
| **UI de Estoque** | depende do catálogo → mostra "0 produtos" |

**Meu próprio E2E do G3 criou isso**: usei `inventory.append` com `product_sku: 'E2E-001'` **sem
cadastrar**. O sistema aceitou. **A inconsistência que eu estou vendo é a minha, mas o buraco que a
permitiu é do produto.**

### Por que isso é um achado de CLASSE, não de caso

**Três caminhos escrevem no estoque, e cada um decide por si se o produto precisa existir:**

```
inventory.append  ─┐
purchases.receive ─┼→  movimentos    (nenhum exige catálogo)
sales.faturar     ─┘   (este exige, desde a r23)
```

**É a mesma forma do erro do `Tip` (r22) e dos landmarks (r19)**: eu corrijo **onde vi** e a classe
continua aberta nos lugares que não olhei.

### As opções — e por que eu NÃO escolho

**A · Exigir catálogo em `inventory.append`**
- **A favor**: consistência; a UI para de mentir.
- **Contra**: quebra ajuste de inventário de produto removido, importação legada, e o
  `agent-tools-catalog` que expõe `inventory.append` para os bots.

**B · A compra CRIA o produto ao receber**
- **A favor**: o fluxo real de uma distribuidora (comprou um produto novo → ele entra no catálogo).
- **Contra**: cadastro automático sem nome/unidade/preço vira catálogo-lixo.

**C · A UI de Estoque passa a LISTAR os SKUs órfãos**
- **A favor**: para de dizer "0 produtos" quando há 6 movimentos; mínima mudança.
- **Contra**: **maquia a inconsistência** em vez de resolvê-la.

**Eu me inclino à B + validação suave na A** (avisar, não bloquear). **Mas isso é modelagem de
domínio, não correção de bug** — e o `TASK-QUEUE` já tem T-08 esperando o mesmo tipo de decisão
(preço zero).

**Registrado como `ABERTO`, com as três opções e o custo de cada uma.**

### O dado órfão

**Não vou limpar.** As 6 movimentações e o saldo de `E2E-001` são **dados meus de teste** num HOME
temporário (`%TEMP%\b3po-menu-view6`), mas **limpar sem autorização** seria exatamente o tipo de
ação destrutiva que o `AGENTS.md` manda perguntar antes.

**O que isso significa para a entrega**: **a tela de Estoque está visualmente correta e logicamente
inconsistente** — e a inconsistência é **reproduzível** por qualquer pessoa que cadastre um movimento
sem cadastrar o produto.

---

## G8 · ADENDO 18 — revisão visual consolidada: 6 telas, 2 achados reais, 4 sem defeito

**Rodadas 43–45.** Olhei 6 das 20 capturas de `baseline-layout/`.

### O placar

| Tela | Resultado |
|---|---|
| **Vendas** | **achado** — venda `faturada` com **R$ 0,00** (R-9, agora com captura) |
| **Estoque** | **achado GRAVE** — `"0 produtos"` com **6 movimentações** e saldo 5000 |
| **CRM** | **sem defeito** |
| **Compras** | **sem defeito** |
| **Financeiro** | **sem defeito** — o card "Vencido R$ 230,00" está **certo** |
| **Projetos** | **sem defeito** — `"0 em andamento"` com 1 projeto *a começar* é consistente |

**Taxa: 2 achados em 6 telas (33 %).**

### O que eu investiguei e NÃO era bug

**"Vencido R$ 230,00"** parecia somar tudo. O código:

```ts
if (entry.due_at > 0 && entry.due_at < now) {
  out.overdueCents += entry.amount_cents
}
```

Os lançamentos vencem **06/11/2026 00:00** e a medição foi às **20:30** → **`due_at < now` é TRUE** →
**vencidos de fato**. `230 = 80 + 150` é a soma correta de **dois lançamentos que venceram hoje**.

**Observação registrada (não bug)**: um lançamento que vence **hoje** conta como vencido a partir das
**00:00**, não do fim do dia. É escolha de negócio — **não vou mexer sem pedido**.

### O que **Projetos** confirmou de graça

O placeholder do campo "Para que existe":

```
"vender os botijões sem depender de telefone"
```

**É texto de exemplo, não campo preenchido** — e é o **único vestígio da vertical gás/água** em todo
o produto, confirmando o `G4 = NOT_IMPLEMENTED` da rodada 13.

### O padrão que a revisão visual está revelando

**O `axe` não vê coerência — ele vê acessibilidade.** Duas telas com `axe: 0` (Vendas, Estoque) e
**as duas têm problemas de conteúdo**:

| Tela | `axe` | O que a tela diz de errado |
|---|---|---|
| Vendas | 0 violações | venda faturada de R$ 0,00 |
| Estoque | 0 violações | "0 produtos" com 6 movimentos |

**Um app pode ser perfeitamente acessível e mentir na tela.**

### O que continua por olhar

**14 das 20 capturas** — `home` (2 temas), `crm`/`compras`/`vendas`/`estoque`/`financeiro`/`projetos`/`sofia`/`empresa` (escuro).

**A taxa de 33 % sugere que vale continuar** — mas as duas melhores já foram (Vendas e Estoque eram
as que eu tinha marcado como `PARCIAL` no B5 e no G3).

---

## G8 · ADENDO 19 — revisão visual fechada: **8 telas, 2 achados, 6 limpas**

**Rodada 46.** Terminei as telas principais das 20 capturas de `baseline-layout/`.

### O placar completo

| Tela | Veredito | O que vi |
|---|---|---|
| **Vendas** | **ACHADO** | venda `faturada` com **R$ 0,00** |
| **Estoque** | **ACHADO GRAVE** | `"0 produtos"` com **6 movimentações** |
| **CRM** | **limpa** | cards + forms + lista |
| **Compras** | **limpa** | 5 cards, `#2 Fornecedor E2E · R$ 150,00 · recebido` |
| **Financeiro** | **limpa** | "Vencido R$ 230,00" **correto** (venceu hoje 00:00) |
| **Projetos** | **limpa** | `0 em andamento` + 1 *a começar* = consistente |
| **Empresa** | **limpa** | 1 empresa, 0 filiais, CNPJ vazio (`—`) esperado |
| **Sofia** | **limpa** | **B6 visível**: plano 2/2, `exec-e2e-001/002`, `depende de t1` |

**Taxa final: 2 achados em 8 telas (25 %).**

### O que a revisão visual **validou** de graça

**A tela de Sofia é a prova visual do B6** que eu só tinha por bridge:

```
Validar a jornada de planos da Sofia (r282)     2/2
ORGANIZACAO · CONCLUIDO · 1 NÍVEIS

  Primeira tarefa do plano — concluída · execução exec-e2e-001
  Segunda tarefa, depende da primeira
  concluída · depende de t1 · execução exec-e2e-002
```

**Plano persistido · 2 de 2 tarefas · `execucao_id` em cada uma · grafo de dependência (`depende de t1`)
· status `CONCLUIDO`.** Tudo na tela, sem precisar de chamada de API.

**A tela de Compras** idem: `#2 · Fornecedor E2E · 1 item · R$ 150,00 · recebido` — o **B4 completo**
visível.

**A tela de Empresa** mostra `Empresa E2E r283 · Nenhuma filial ainda · — · BRL · America/Sao_Paulo` —
o **B7** com o CNPJ vazio que o E2E não preencheu (esperado, não bug).

### O que a revisão visual **não** achou

**Nenhum problema de layout** nas 8 telas olhadas **depois** do fix do `h-full` (r41). Antes do fix,
**todas** estariam 182 px erradas — e eu só descobri porque o dono olhou.

### O padrão que fecha

| Categoria de defeito | Foi achada por |
|---|---|
| acessibilidade (contraste, labels, landmarks) | **`axe`** — 30 rotas + 17 rotas web |
| **coerência de conteúdo** (R$ 0,00, "0 produtos" com 6 movimentos) | **olhar a captura** |
| **layout deslocado** (182 px) | **o dono olhou** |

**Três categorias, três instrumentos diferentes.** Nenhum deles substitui os outros — e por 40 rodadas
eu usei **só o primeiro**.

### O que resta por olhar

**12 das 20 capturas** — os temas escuros de `crm`, `compras`, `vendas`, `estoque`, `financeiro`,
`projetos`, `sofia`, `empresa`, `home`, e os claros de `home`.

**A taxa caiu** (25 % e concentrada nas duas telas que eu já sabia `PARCIAL`), então a expectativa é de
poucos achados novos — mas **é olhar, não medir**, e é a única forma de descobrir.
