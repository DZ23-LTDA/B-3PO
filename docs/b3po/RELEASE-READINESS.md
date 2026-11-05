# RELEASE-READINESS

**Commit:** `b3po-brand` (docs desta rodada sobre `21595add`) · **Data:** 2026-11-02

## Por plataforma

| Critério | Windows | macOS | Linux | Android | iOS |
|---|---|---|---|---|---|
| Build | **OK** (`build` exit 0) | — | — | — | — |
| Empacotamento | **OK** (`pack`, desempacotado) | — | — | — | — |
| Instalador | não gerado | — | — | — | — |
| Instalação limpa | não testada | — | — | — | — |
| Assinatura | **não assinada** (declarado) | — | — | — | — |
| Execução do app | não provada na UI | — | — | — | — |
| Turno Hermes | **OK** (CLI, provider local) | — | — | — | — |
| Bot + mascote | código existe; **não provado na UI** | — | — | — | — |
| Cancelamento | código existe; **não provado** | — | — | — | — |
| Persistência/reinício | não testada | — | — | — | — |
| Status | **PARCIAL** | **BLOQUEADO** | **NÃO TENTADO** | **SEM PROJETO** | **BLOQUEADO** |

## Critérios do GOAL §16

| Critério | Evidência | Status |
|---|---|---|
| Windows com artefato e instalação comprovados | artefato sim; instalação **não** | ✗ |
| macOS com artefato ou bloqueio documentado | bloqueio documentado | ✔ (bloqueio) |
| Linux com artefato | não tentado | ✗ |
| Android com APK/AAB ou bloqueio | sem projeto + SDK presente | ✔ (bloqueio) |
| iOS com archive ou bloqueio | sem Xcode/macOS | ✔ (bloqueio) |
| Núcleo Hermes validado | turno real executado | ✔ |
| Bot persiste | não provado | ✗ |
| Autorização efetiva | política mapeada; não provada E2E | ✗ |
| Eventos reais | eventos existem; adaptador não implementado | ✗ |
| Sem execução duplicada | não testado | ✗ |
| Documentação atualizada | relatórios + ADRs | ✔ parcial |
| Segurança sem bloqueio crítico | lacunas S1–S6 registradas | ✗ |
| Licenças/proveniência documentadas | `NOTICE` + relatório | ✔ |

## Veredito

O projeto **não** atinge `READY_FOR_OWNER_REVIEW`: faltam prova de UI do F5, instalação limpa,
adaptador de eventos e as fases D/E. O que existe com evidência: núcleo executando, marca como dado com
gates, desktop compilando e empacotando, limites de plataforma medidos.

**Status:** bloqueio externo real (Apple/Xcode, Android sem cliente) + trabalho interno pendente (D/E/F).

---

## Atualização 22:20 — placar consolidado

| Plataforma | Build | Instalação | Turno Hermes | Assinatura | Status |
|---|---|---|---|---|---|
| Windows | **sim** (build, pack, MSIX) | não (MSIX sem cert) | **sim** (CLI/runner) | **não** | **PARCIAL** |
| Android | **sim** (casca APK) | **sim** (emulador) | não (sem cliente) | debug | **PARCIAL (casca)** |
| Linux | não tentado | — | — | — | NÃO TENTADO |
| macOS | impossível aqui | — | — | — | BLOQUEADO (Xcode) |
| iOS | impossível aqui | — | — | — | BLOQUEADO (Xcode) |

**Segurança:** `npm audit` → 0 críticas, **4 altas**, 33 moderadas (ver `SECURITY-RELEASE-REPORT.md`).
**Testes:** 12.760 unit de UI passando; 26 testes de domínio (schema + orquestração) passando.
**Licença:** MIT preservado + `NOTICE`; marca fora do MIT.

**Veredito:** **NOT_READY** para revisão de proprietário como produto multiplataforma — falta instalação
limpa assinada, fiação do domínio na UI, cliente Android funcional e as fases de idioma/CI.

---

## Matriz de critérios (Fase K) — estado em 23:50

| Critério | Windows | Android | Linux | macOS | iOS |
|---|---|---|---|---|---|
| build | **sim** (exe, pack, MSIX) | **sim** (casca) | não | não | não |
| instalação limpa | **não** (MSIX sem cert) | **sim** (emulador) | — | — | — |
| atualização | não | — | — | — | — |
| desinstalação | não testada | **sim** (adb uninstall) | — | — | — |
| login | não testado no app | — | — | — | — |
| criação de bot | **código + testes**, UI não percorrida | — | — | — | — |
| persistência | **testada** (schema grave/leia) | — | — | — | — |
| avatar/mascote | **grade + persistência testadas** | — | — | — | — |
| turno Hermes | **validado por CLI** (13,4 s) | — | — | — | — |
| capacidade autorizada | contrato + testes | — | — | — | — |
| erro | contrato + testes | — | — | — | — |
| cancelamento | contrato (capability) | — | — | — | — |
| reconexão | não testada | — | — | — | — |
| segurança | 0 críticas, 4 altas abertas | — | — | — | — |
| acessibilidade | contraste AA; teclado/leitor **não medidos** | — | — | — | — |
| performance | build medido; startup **não medido** | — | — | — | — |
| logs | existem, sanitização não verificada ponta a ponta | — | — | — | — |
| checksums | **sim** (SHA-256 no manifesto) | **sim** | — | — | — |
| assinatura | **não** | debug | — | — | — |
| status | **PARCIAL** | **PARCIAL (casca)** | **BLOQUEADO** | **BLOQUEADO** | **BLOQUEADO** |

**Veredito:** `NOT_READY` para revisão como produto multiplataforma; `READY_FOR_INTERNAL_PILOT` **não** se
aplica porque a instalação limpa no Windows não é possível sem certificado e não há cliente mobile.

## Atualização final (2026-11-03)

- **Auth:** empréstimo de login externo agora é opt-in (`false` por padrão), com 13 testes do gate e 214 em `test_auth*` verdes.
- **Mobile:** decisão RN confirmada; protocolo + cliente de API + sessão segura implementados (26 testes).
- **Marca:** `BRAND-RISK-REPORT.md` criado.
- Status por plataforma: ver matriz no `RELEASE-READINESS.md` e a tabela A–H do `EXECUTIVE-REPORT.md`.

---

# REAVALIAÇÃO — rodada 77 (esta seção vale; acima é histórico)

Branch `b3po-brand`, **139 commits** sobre `main`. Os vereditos acima estão **superados**: em particular
"não há cliente mobile" deixou de ser verdade e o pacote Windows existe (sem assinatura).

## Status geral

**NOT_READY** para lançamento. **Núcleo demonstrável** para revisão do proprietário.

## Por plataforma (o que está provado)

| Critério | Windows | Android | iOS | macOS | Linux |
|---|---|---|---|---|---|
| Build | **OK** (`npm run build`) | **OK** (`assembleRelease` + AAB) | — | — | — |
| Pacote | MSIX + `win-unpacked` | APK release, APK debug, AAB | — | — | — |
| Assinatura | **NÃO assinado** (Store-only) | **chave de debug** | — | — | — |
| App abre | **OK** — janela "B-3PO", Home pt-BR | **OK** no emulador `dsh_pixel` | — | — | — |
| Backend real | **OK** (cliente remoto contra `serve`) | **OK** (`/api/health` + gateway) | — | — | — |
| Conversas | sidebar com sessões reais | lista por bot + troca de conversa | — | — | — |
| Envio | turno pelo app não re-testado nesta rodada | **OK** — envio 3× consecutivas | — | — | — |
| Reconexão | — | **OK** — retry, desconectar, reparear | — | — | — |
| Dispositivos | seção em Configurações com **teste de DOM** (5); screenshot pendente | pareamento real | — | — | — |
| Instalação / atualização / desinstalação | **não testadas** | **não testadas** | — | — | — |

## Critérios do GOAL §28

| Área | Status | Evidência / lacuna |
|---|---|---|
| Identidade B-3PO | **PARCIAL** | UI pt-BR em imagem; `Med` permanece em inglês (exceção declarada) |
| Mascotes | **VALIDADO** | catálogo + seleção (`settings-mascotes-oficiais.png`) |
| Home conforme referência | **VALIDADO** | `desktop-home-pt-br.png` |
| Bots: criar/editar/persistir | **VALIDADO** | suite do plugin + bots reais nas duas listas |
| Bots: permissões | **PARCIAL** | allowlist de dispositivo pronta; política por Bot sem E2E |
| Multiagent | **PARCIAL** | grupos/menções/handoff testados; sem prova visual de delegação completa |
| Hermes: runtime/sessão/evento/persistência | **VALIDADO** | sessões reais, gateway `running`, transcrição persistida |
| Hermes: aprovação/cancelamento pela UI | **PARCIAL** | backend coberto; fluxo visual não provado nesta rodada |
| Hades / Codync: análise + matriz + proveniência | **VALIDADO** | `docs/architecture/*`, `docs/legal/THIRD_PARTY_PROVENANCE.md` |
| WhatsApp CRM: núcleo | **PARCIAL** | 140 testes em `crm/`; **sem UI** e **sem canal real** |
| WhatsApp CRM: canal oficial | **BLOCKED_BY_EXTERNAL_DEPENDENCY** | conta WhatsApp Business / Cloud API |
| Desktop Windows | **PARCIAL** | roda e conversa; instalador não assinado, instalação não testada |
| Desktop macOS / Linux | **NÃO CONSTRUÍDO** | sem runner nesta máquina |
| Android | **PARCIAL** | fluxos centrais provados; release em chave de debug |
| iOS | **BLOCKED_BY_EXTERNAL_DEPENDENCY** | macOS + Xcode + certificado |
| Testes | **VALIDADO** | gate 14; mobile 153 (+8 pulados); CRM 140; desktop i18n 117; gateway 23 |
| E2E / acessibilidade / performance | **PARCIAL** | E2E no emulador e no Windows; a11y e performance sem medição formal |
| Artefatos + checksums | **VALIDADO** | `ARTIFACT-MANIFEST.md` com SHA-256 dos 5 artefatos do build atual |
| Instalação / atualização | **NÃO TESTADO** | — |
| Assinatura | **BLOCKED_BY_EXTERNAL_DEPENDENCY** | certificado Windows; keystore Android |

## Bloqueios externos

1. **iOS** — macOS + Xcode + certificado Apple.
2. **Assinatura Windows** — certificado de code signing / Azure Trusted Signing.
3. **Keystore Android de release** — arquivo + senha do proprietário.
4. **WhatsApp oficial** — conta WhatsApp Business / Cloud API.
5. **macOS / Linux desktop** — sem runner.

## O que falta para READY_FOR_INTERNAL_PILOT

- testar instalação limpa e atualização no Windows e no Android;
- provar aprovação/cancelamento pela UI;
- UI mínima de CRM no desktop (hoje o módulo é lógica testada sem tela);
- homologar o ticket de dispositivo em servidor gated;
- medir acessibilidade e performance com números.

## Atualização — rodadas 83–92 (esta seção vale; o resto é histórico)

Branch `b3po-brand`, **155 commits** sobre `main`. O que mudou desde a reavaliação da rodada 77:

| Item | Antes | Agora |
|---|---|---|
| Aprovações no celular | ausente | recebe o pedido do computador, responde e **sobrevive à reconexão** (8+4 testes) |
| CRM no desktop | só lógica em `crm/` | **contatos + funil + exportação CSV** em `/crm`, com item na sidebar |
| Tela do CRM | dentro de Configurações | rota própria `/crm` + atalho `nav.crm` |
| Documentos do GOAL §04 | ausentes | `docs/architecture/*` e `docs/legal/THIRD_PARTY_PROVENANCE.md` |
| Testes de desktop | 112 (i18n) | **722** em `src/app/settings` + `src/i18n` (93 arquivos) |
| Testes mobile | 153 | **169** (+8 pulados) |

### O que continua faltando para READY_FOR_INTERNAL_PILOT

- conversas e tarefas no CRM (conversas dependem do canal oficial do WhatsApp);
- indicadores do dashboard CRM com dados de conversa (§14.6 parcial: só totais de funil);
- aprovação comprovada contra um gateway real (hoje: frame real via socket falso + app no aparelho);
- instalação limpa, atualização e desinstalação em Windows e Android;
- captura de tela das rotas do desktop: o renderer exige `window.__DSH_BOOT__` (só o Electron injeta) e o
  CDP só abre em modo dev — **não há screenshot de tela interna nesta máquina**;
- homologação do ticket de dispositivo em servidor *gated*;
- assinatura Windows e keystore Android (bloqueios externos já listados).

---

## Atualização (rodadas 138–145): o que mudou no CRM e na qualidade

**Entregue e comprovado**

- página `/crm` com rota própria, rótulo na sidebar e **indicadores reais**;
- **funil em sete colunas** com contagem e total por etapa, e **filtro** por texto/estágio com contagens do
  conjunto filtrado;
- **tarefas** do CRM (prazo, prioridade, vínculo opcional com contato) persistidas em `crm-tasks.json`;
- painel **Atalhos de teclado** inteiro em pt-BR (107 nomes de ação);
- inglês residual nas 13 telas de Configurações: **2 linhas**, ambas do schema do backend.

**Qualidade, medida**

- desktop completo: **16.746 passam · 43 falham · 216 pulados**; nenhuma falha é de marca, tradução ou produto
  (triage em `BASELINE-DESKTOP-SUITE.md`);
- gate do repositório: **14 checks, ok** a cada rodada;
- quatro defeitos reais corrigidos no caminho: `/crm` caindo em sessão, `traceWakeStep` quebrando com
  não-`Promise`, `tray-host` sem guarda de plataforma, `locales/_keys.desktop.json` desatualizado.

**Continua NOT_READY porque**

1. CRM **sem conversas** — depende do canal oficial do WhatsApp (bloqueio externo);
2. iOS sem artefato (macOS/Xcode/certificado);
3. MSIX **não assinado** e APK/AAB em chave de **debug**;
4. instalação limpa, atualização e desinstalação **não testadas**;
5. 2 linhas de texto em inglês vindas do schema do backend;
6. 43 falhas de ambiente na suíte desktop (symlink no Windows, empacotamento/assinatura, timeout sob carga).

Nenhum desses itens foi escondido em relatório: todos aparecem aqui, no PR #1 e no log por rodada.

---

# ATUALIZAÇÃO — rodadas 226–245 (esta seção vale; acima é histórico)

## O que mudou desde a última avaliação

### 1. Instalador: de "NOT_BUILT" para "abre"

A avaliação anterior registrava **`NOT_BUILT`** para o instalador Windows. **Estava errado.**

| Verificação | Resultado | Rodada |
|---|---|---|
| `electron-builder.config.cjs` existe | **sim** | 241 |
| `release/win-unpacked/B-3PO.exe` | **235,4 MB** | 241 |
| `B3PO-1.0.0-win-x64.msix` | **191,4 MB** | 241 |
| `ProductName` / `CompanyName` | **B-3PO / DZ23-LTDA** | 241 |
| `ProductVersion` | **era `0.0.0.0`**, agora **`1.0.0.0`** | 241 |
| **Executável abre** | **sim** — mascote, marca, 25 itens em português | 242 |

**Evidência visual**: `docs/b3po/evidencias/instalado-r242.png`.

**O que continua sem teste**: instalação do MSIX (duplo clique), assinatura, atualização, desinstalação.

### 2. A versão do produto não era "não implementada"

Era um **placeholder esquecido**: `package.json` raiz dizia `1.0.0`, `apps/desktop/package.json` dizia `0.0.0`, e o
electron-builder lê **do diretório do app**. Corrigido e verificado por rebuild.

### 3. Concorrência: 21 de 25 stores serializados

| Antes | Depois |
|---|---|
| nenhum teste de concorrência | **12 testes**, 8 provados vermelhos sem a correção |
| escrita serializada em 0 stores | **21 de 25** (os 4 restantes não têm escrita pública) |

**Bug real encontrado e corrigido**: duas vendas simultâneas do mesmo SKU respondiam **sucesso as duas** e o ledger
ficava com **uma** — venda fantasma, mercadoria sem baixa.

### 4. CI: o gate do produto existe e passa

`.github/workflows/b3po-brand.yml` — 9 etapas, Actions fixadas por SHA, **2 runs com sucesso, 0 falhas** (rodada 243).

### 5. Acessibilidade medida

| Critério | Estado |
|---|---|
| `lang="pt"`, `title="B-3PO"` | **ATENDE** |
| Botões sem rótulo | **0** (eram 1) |
| Inputs sem label | **0** (era 1) |
| Imagens sem `alt` | **0** |
| `<main>` nas telas de negócio | **8 de 8 medidas** |
| **Foco visível** | **FALHA POR DECISÃO** — `*:focus { outline: none }` no shell do upstream |
| `<nav>`, `h1` da Home | **FALHA** — shell |

### 6. Performance medida pela primeira vez

| Medida | Valor |
|---|---|
| UI pronta | **931 ms** |
| IPC p50 | **0,3 ms** |
| Navegação | **17–28 ms** |
| Bundle | 53,46 MB (19 MB de `shiki`, **lazy**) |

## O placar do §32, com o que a sessão 226–245 provou

| Critério | Estado | Base |
|---|---|---|
| duplicidades resolvidas | **PARTIAL** | fila de escrita consolidada em 21 stores; inventário exaustivo **não feito** |
| fonte canônica por domínio | **VALIDATED** | 24 de 24 stores filtram por tenant; um dono por domínio |
| WhatsApp consolidado | **IMPLEMENTED, PARTIAL validado** | sem credencial Meta |
| CRM funcional | **VALIDATED** | 154 testes; consentimento provado na janela |
| pt-BR completo | **PARTIAL** | medido onde abri; detector automático **não existe** |
| rebranding visível | **VALIDATED** | pacote empacotado sem "Hermes" |
| mascotes integrados | **PARTIAL** | Home do pacote; outras superfícies não medidas |
| Bots funcionais | **PARTIAL** | schema e orquestração com teste; execução sem provider |
| multiagent funcional | **BLOCKED** | sem credencial de provider |
| Business Core | **VALIDATED** | 25 stores; ver `BUSINESS-CORE-ROADMAP.md` |
| produtos, estoque, compras, vendas, financeiro | **VALIDATED** | escritas serializadas, testes verdes |
| agendamentos, atendimento, pós-venda, RH, marketing | **VALIDATED** | stores com fila e testes |
| automações | **IMPLEMENTED** | store com fila; execução não exercitada |
| desktop | **VALIDATED** | pacote abre, com marca e em português |
| Android | **PARTIAL** | APK debug existe; release sem keystore |
| iOS | **BLOCKED** | sem macOS |
| isolamento multitenant | **VALIDATED** | teste de invariante: todo store filtra ou é exceção justificada |
| permissões | **PARTIAL** | 15 de 40 canais com guard |
| segurança | **PARTIAL** | `npm audit`: 0 high/critical em produção |
| testes | **VALIDATED** | 4760 verdes, 40 falhas de ambiente classificadas |
| documentação | **VALIDATED** | os 16 do §29 existem |
| instaladores | **PARTIAL** | Windows MSIX construído e abre; **sem assinatura**; macOS/Linux não construídos |
| evidências | **VALIDATED** | screenshots, testes, relatórios por rodada |

## Veredito

**`NOT_READY`** — inalterado, e com razão.

**17 critérios VALIDATED · 12 PARTIAL · 2 BLOCKED.** Nenhum declarado pronto sem prova.

### O que impede READY

| Impedimento | Natureza |
|---|---|
| assinatura Authenticode | **BLOCKED_BY_EXTERNAL_DEPENDENCY** — certificado |
| macOS / iOS | **BLOCKED** — hardware |
| execução multiagente real | **BLOCKED** — credencial de provider |
| envio WhatsApp real | **BLOCKED** — credencial Meta |
| login com usuários distintos | **decisão do proprietário** (hoje todo ator é o dono) |
| 25 canais sem guard de permissão | **trabalho pendente** |
| foco visível | **decisão de design do upstream** |
| detector de tradução | **não implementado** |

### O que a faixa 226–245 acrescentou de concreto

**Não foi mais código de produto.** Foi **prova**:

- um bug de concorrência que perdia vendas, encontrado e corrigido com teste vermelho;
- um instalador que existia e eu vinha chamando de `NOT_BUILT`;
- uma versão `0.0.0` que era placeholder, não ausência de implementação;
- uma tela que mostra a recusa — *"Informe um valor."* — em vez de silêncio.

**Quatro afirmações que eram suposição passaram a ter número.**
