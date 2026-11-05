# AUTONOMOUS-EXECUTION-STATE — B-3PO

Estado corrente do trabalho autônomo. Atualizado a cada rodada; é o que permite retomar sem reiniciar.

## Onde estamos

| Campo | Valor |
|---|---|
| Branch de produto | `b3po-brand` (a `main` segue espelho limpo do upstream) |
| Commits DZ23 | **232** (HEAD `acc399c120`) |
| Gate do repositório | `python scripts/check` → 14 checks, ok |
| Testes | **regressao de fechamento: `src/i18n` + `src/app/crm` + `src/app/settings` = 96 arquivos / 750 testes, verdes**. Historicos: bots 960 · store/sdk 2307 · mobile 101 (+5 live pulados) |
| Status do produto | **NOT_READY** (há critérios abertos, listados abaixo) |

## Frentes e estado

| Frente | Estado | Evidência |
|---|---|---|
| Marca B-3PO (desktop, site, instaladores) | ✅ | `BRAND-COVERAGE.md`, `logo`, `B-3PO.exe` VersionInfo |
| i18n pt-BR (superfície do produto) | ✅ | `PT-BR-VALIDATION.md`, 104 testes |
| Bots: criar, mascote, conversar, cancelar | ✅ | `F5-EVIDENCE-REPORT.md`, screenshots |
| WhatsApp CRM: consentimento, webhook, contatos, funil, inbox, métricas, tarefas/Kanban, automações, contatos em lote, funil completo | ✅ núcleo | `WHATSAPP-CRM-REPORT.md`, 140 testes |
| Envio real WhatsApp | 🔒 BLOCKED (conta Meta) | `WHATSAPP-CRM-SETUP.md` |
| Android: projeto nativo, APK, AAB, pareamento, conexão REST real | ✅ | `MOBILE-REPORT.md` (rodadas 42–49) |
| Android: bots, lista de conversas, envio, reconexao, desconectar e reconectar por link | ✅ | `MOBILE-REPORT.md` rodadas 55–56 + `mobile-conversa-real.png` |
| Desktop Windows: instalador e MSIX | 🟡 artefatos prontos, não assinados | `ARTIFACT-MANIFEST.md` |
| macOS / iOS | 🔒 BLOCKED (macOS/Xcode/certificado) | `RELEASE-READINESS.md` |
| Tool calling ponta a ponta (F5 passo 12) | ⬜ aberto (modelo local sem tool calling ≥64k) | `F5-EVIDENCE-REPORT.md` |

## Critérios abertos (ordenados por valor)

2. cofre seguro no mobile (`react-native-keychain` não compila no RN 0.81 deste ambiente);
3. keystore de release para APK/AAB publicáveis;
4. tool calling com modelo ≥64k;
5. 3 vulnerabilidades dev bloqueadas por `min-release-age` até 2026-11-17.

## Regra de processo (aprendida na prática)

Rodar `python scripts/check` **antes** do commit, nunca depois: três commits entraram com o gate
vermelho nesta execução por inverter a ordem.

## Bloqueio de desenho (não é bug) — especificado

Envio de mensagem pelo celular precisa de ticket de WebSocket, e o endpoint de ticket exige sessão de
login do dashboard (401 com o token de pareamento). O contrato do `prompt.submit` já está levantado em
`MOBILE-REPORT.md` rodada 59. Desenho completo em `DEVICE-AUTHORIZATION.md` (chave por
dispositivo, rota de ticket, allowlist de métodos, revogação, 9 critérios de aceite).

## Como retomar

1. `git -C "C-3PO BOT" status` e `git log --oneline -5`;
2. `python scripts/check` (gate de 14 checks);
3. ler este arquivo + `AUTONOMOUS-EXECUTION-LOG.md` (última entrada);
4. pegar o primeiro item dos "critérios abertos".

## PR #1 — atualizado em 2026-11-03

| Campo | Valor |
|---|---|
| URL | https://github.com/DZ23-LTDA/B-3PO/pull/1 |
| estado | OPEN (não mesclar — `main` é espelho do upstream, F2-A) |
| head → base | `b3po-brand` → `main` |
| commits no PR | 100 |
| arquivos | 594 |
| diff | +42.242 / −1.111 |
| título | "B-3PO: marca, sistema de Bots, WhatsApp CRM, mobile com envio e autorização de dispositivo [REVISAO - NAO MESCLAR: main e espelho]" |
| corpo | 4,9 KB / 106 linhas |

O corpo agora traz, em seções: o que está entregue e comprovado (desktop, Bots, CRM com a tabela de
testes por módulo, mobile com envio comprovado, autorização de dispositivo, documentação), a lista de
evidências em `docs/b3po/evidence/`, a tabela de **limitações e bloqueios** (MSIX não assinado, iOS
bloqueado, keystore, cofre seguro, ticket de dispositivo no WS, tool calling, WhatsApp real,
vulnerabilidades dev) e os comandos de revisão (`scripts/check`, vitest do CRM e do mobile).

Nada de "pronto": o status declarado no PR é **NOT_READY**, com a lista do que falta.

## Delta desta sessao (rodadas ~100-160)

O que mudou depois do estado de 139 commits:

**CRM entregue com prova no app empacotado:** pagina propria em `/crm` com rota e rotulo na sidebar; indicadores
reais; funil em 7 colunas com contagem e total; filtro por texto e etapa com contagens honestas; tarefas com prazo,
prioridade e vinculo opcional; aviso **"contato excluido"** em oportunidade e tarefa.

**Dois bugs encontrados em codigo meu, nao no upstream:**

1. o aviso de contato excluido comparava telefone por texto cru, entao contato gravado normalizado contra
   oportunidade com mascara acusava "excluido" para contato que existia. Corrigido comparando digitos; provado
   vermelho na base (3 de 14 testes) e verificado no binario com perfil semeado.
2. plural "1 atrasada(s)"; corrigido e coberto por teste que tambem foi provado vermelho na base.

**Outros quatro bugs reais corrigidos:** `/crm` caia numa sessao chamada "crm" (faltava `<Route>`), `traceWakeStep`
quebrava com valor nao-`Promise`, `tray-host` sem guarda de plataforma (e D-Bus de Linux), `_keys.desktop.json`
desatualizado. Mais um token CSS inventado (`text-(--ui-danger)`) que nao fazia nada.

**Medicao corrigida, erro meu:** o baseline inicial de 56 falhas estava inflado porque a suite rodou com
`HERMES_PYTHON` apontando para um Python sem `ruamel.yaml`. O numero real e **43**.

**Documentacao:** `RESUMO-PARA-O-OWNER.md` (uma pagina), `guia/08-o-que-funciona-hoje.md` (validado x parcial x
planejado), `PT-CATALOG-DEBT.md` e `BASELINE-DESKTOP-SUITE.md` atualizados.

**O que continua aberto:** conversas do CRM (conta WhatsApp Business/Cloud API), iOS (macOS/Xcode), assinatura
(certificado), keystore Android de release, e instalacao/atualizacao/desinstalacao nao testadas.

## Fonte da verdade (por que números aqui envelhecem)

Este arquivo é escrito à mão entre rodadas, então qualquer contagem pode ficar para trás assim que um commit entra —
e um estado desatualizado atrapalha justamente a retomada que ele promete. Antes de confiar em qualquer número acima,
confirme em um comando:

```powershell
git rev-parse --short HEAD          # commit real
git rev-list --count main..HEAD     # commits DZ23 reais
git status --short                  # deve estar vazio
python scripts/check                # 14 checks
```

O que **não** envelhece: a lista de bloqueios externos (depende de terceiros, não de commits) e as decisões de
arquitetura. São essas duas partes que valem a leitura em caso de dúvida.


## Estado real ao fim da rodada 177 (fonte da verdade)

- **branch:** `b3po-brand` · **HEAD:** `8e802c05b0` · **241 commits** · working tree limpo
- **gate:** `python scripts/check` -> 14 checks, ok
- **MSIX:** reconstruido, NAO assinado
- **PR #1:** draft, aberto, NOT READY (nao fechar nem mesclar)

### Entregue e verificado nesta sequencia

- CRM com contatos, funil, tarefas e **conversas** (store com idempotencia por `external_id`, IPC, preload, cliente
  tipado, tela no `/crm` com carregando/vazio/erro em pt-BR);
- prova visual correta em `docs/b3po/evidence/crm-conversas-pt.png`;
- duplicacao de "Tarefas do CRM" na pagina removida (medido: 1 ocorrencia de cada bloco).

### PROXIMO PASSO CONCRETO (nao depende de credencial)

Ligar o webhook do adapter oficial ao store de conversas:

1. `plugins/platforms/whatsapp_cloud/adapter.py` — ler o handler que ja valida HMAC `X-Hub-Signature-256` e `WABA_ID`;
2. mapear o payload da Meta para `CrmConversation`/`CrmMessage` (`wa_id` -> `external_id`, `timestamp` -> `sent_at`);
3. gravar pelo `CrmConversationStore` (a idempotencia por `external_id` ja existe e tem teste);
4. teste de integracao com payload de exemplo da Meta (sem credencial: HMAC e validacao podem ser exercitados com
   `APP_SECRET` de teste local).

### REGRAS DE TRABALHO QUE CUSTARAM RODADAS (nao repetir)

1. **Evidencia visual tem que mostrar o objeto da afirmacao.** Verificar texto no DOM nao substitui olhar a imagem —
   e `captureScreenshot` pega so o viewport: rolar a secao para dentro dele antes.
2. **O perfil de teste vai na RAIZ de `HERMES_DESKTOP_USER_DATA_DIR`**, nao em `<dir>/b3po`: `mountCrmContacts` usa
   `app.getPath('userData')` direto.
3. **Registrar um defeito nao substitui consertar** quando o custo e de uma linha.
4. **Teste de unidade pode passar chamando o construtor do jeito que voce imaginou** — so o binario mostra o jeito real.


## Estado real ao fim da rodada 195 (fonte da verdade)

- **branch:** `b3po-brand` · **HEAD:** `68b275bba9` · **257 commits** · working tree limpo
- **gate:** `python scripts/check` -> 14 checks, ok
- **MSIX:** reconstruido, NAO assinado
- **PR #1:** draft, aberto, NOT READY

### O que a caixa de entrada do CRM faz HOJE (tudo provado no binario)

| capacidade | prova |
|---|---|
| receber por webhook assinado (HMAC + token local) | e2e no app: 200 stored / 200 duplicated / 401 sem token |
| persistir com idempotencia por `external_id` | 16 testes + reentrega e2e |
| listar, abrir e ler mensagens | captura `crm-conversas-pt.png` |
| marcar como lida e resolver | captura `crm-acoes-pt.png` + store `{status, unread}` |
| buscar (inclusive telefone sem mascara) e filtrar por estado | captura `crm-busca-pt.png` |

### O que a caixa de entrada NAO faz

- **responder** — o adapter sabe enviar; o CRM ainda nao o chama. Depende das `WHATSAPP_CLOUD_*` para ser exercitado.
- anexos, notas internas, templates, etiquetas, atribuicao, automacoes.

### PROXIMO PASSO CONCRETO (nao depende de credencial)

1. **notas internas** por conversa: campo `notes` no store (com teste de validacao e limite de tamanho) + UI de nota;
2. **resposta (outbound)**: funcao pura que monta o payload de envio da Meta (`messaging_product`, `to`, `text.body`) com
   teste; o envio real fica atras do adapter e das credenciais;
3. so depois: anexos e templates.

### REGRAS QUE CUSTARAM RODADAS (todas registradas com o caso concreto)

1. evidencia visual tem que **mostrar** o objeto da afirmacao — `captureScreenshot` pega o viewport, e
   `captureBeyondViewport` nao rola container: rolar antes;
2. perfil de teste vai na **raiz** de `HERMES_DESKTOP_USER_DATA_DIR`;
3. **registrar defeito nao substitui consertar** quando custa uma linha;
4. teste que passa a configuracao na mao **nao prova** que o app le o ambiente (foi assim que o listener subiu em porta
   aleatoria);
5. **gate vermelho nao commit** — a guarda `if ($g -notmatch 'ok') { exit 1 }` existe por causa disso;
6. chave nova em catalogo grande: localizar o bloco **contando chaves**, nunca por proximidade de texto.


## PONTO DE RETOMADA — fim da rodada 199 (leia isto primeiro)

- **branch** `b3po-brand` · **HEAD** `c89404caf9` · **261 commits** · arvore limpa
- **gate** `python scripts/check` -> **14 checks, ok**
- **MSIX** reconstruido a cada rodada, **nao assinado**
- **PR #1** draft, aberto, NOT READY

### Cadeia do WhatsApp — estado por elo, sem inflar

| elo | estado | prova |
|---|---|---|
| Meta -> adapter (HMAC) | existente no upstream | testes do adapter |
| adapter -> ponte python | implementado | 10 testes pytest |
| ponte -> listener local | **provado no binario** | e2e: 200 stored / 401 sem token |
| listener -> store | **provado no binario** | idempotencia por `external_id` |
| store -> tela | **provado no binario** | capturas de ler, lida, resolvida, busca, nota |
| payload de envio | implementado | 7 testes |
| envio HTTP (forma) | implementado | 7 testes com transporte injetado |
| **Meta aceita o envio** | **NAO PROVADO** | falta credencial real |
| gravar enviada com `wamid` | nao implementado | depende do item acima |
| UI de resposta | nao implementada | depende do item acima |

### O proximo passo tem nome e limite

1. **bloqueado por credencial:** `sendText` -> gravar a mensagem com o `wamid` devolvido -> textarea de resposta na
   conversa, com estado de envio/falha/retentativa. As tres pecas estao prontas; falta o unico dado que eu nao posso
   inventar.
2. **nao bloqueado, se quiser continuar sem credencial:** indicadores do CRM (14.6) calculados dos stores reais;
   anexos; etiquetas/atribuicao; e a lista de tarefas com Kanban de verdade.

### Regra que vale mais que qualquer feature desta sessao

**Nunca afirmar "funciona" com base em teste que passa.** Duas vezes o binario derrubou o que os testes aprovavam:
o listener que subia em porta aleatoria e o bloco de UI que nunca foi inserido (o script imprimiu `ok` sem alterar
nada). Medir o efeito, no arquivo e na tela — nao o log.


## Retomada — fim da rodada 211 (leia primeiro)

`b3po-brand` · HEAD `9673951485` · **271 commits** · arvore limpa · gate **14 ok** ·
MSIX reconstruido, **nao assinado** · PR #1 **draft / NOT READY**.

### Inbox do CRM — provado no binario, item por item

| capacidade | prova |
|---|---|
| receber webhook assinado | e2e: 200 stored / 200 duplicated / 401 sem token |
| idempotencia por `external_id` | 16 testes + reentrega e2e |
| listar / abrir / ler | `crm-conversas-pt.png` |
| marcar lida e resolver | `crm-acoes-pt.png` + store |
| buscar (telefone por digitos) e filtrar | `crm-busca-pt.png` |
| nota interna (2000 chars) | `crm-nota-interna.png` |
| tempo de resposta | `crm-tempo-resposta.png` |
| selo "aguardando resposta" | `crm-selo-esperando.png` (1 ocorrencia, so na conversa certa) |

**7 capturas, todas no `EVIDENCE-INDEX.md`.**

### O que NAO existe (nao apresentar como feito)

- **responder** — payload e HTTP prontos e testados; falta a chamada real e gravar o `wamid`. Depende das
  `WHATSAPP_CLOUD_*`.
- anexos, etiquetas, atribuicao, templates, Kanban, demais indicadores do 14.6.
- iOS, assinatura Windows, keystore Android, instalacao/atualizacao/desinstalacao.

### Proximo passo, em ordem

1. **com credencial:** `sendText` -> gravar a mensagem com o `wamid` devolvido -> textarea de resposta com estado de
   envio/falha. As tres pecas estao prontas; falta o unico dado que nao posso inventar.
2. **sem credencial:** indicadores restantes do 14.6 calculados dos stores; anexos; etiquetas; Kanban.

### As regras que esta sessao pagou para aprender

1. **medir o efeito, nao o log** — duas vezes o script imprimiu `ok` sem alterar nada;
2. **o binario derruba o que o teste aprova** — listener em porta aleatoria, bloco de UI nunca inserido;
3. **captura so existe quando o indice aponta para ela** — errei isso tres vezes;
4. **numero honesto > numero bonito** — conversa sem resposta e `null`, nao zero;
5. **gate vermelho nao commita**;
6. **chave em catalogo grande se insere contando chaves**;
7. **regressao conferida arquivo por arquivo**, nunca "provavelmente e ambiente".


## Retomada — estado em 281 commits (rodada 222)

**Antes de qualquer coisa:** `git rev-parse --short HEAD`, `git status --porcelain` e `python scripts/check`.
Se o gate nao disser `ok`, nao commitar.

### O que existe, provado no binario (10 capturas indexadas)

| capacidade | prova |
|---|---|
| inbox recebe, guarda com idempotencia | `crm-conversas-pt.png` |
| cadeia webhook -> CRM ponta a ponta | `crm-e2e-webhook.png` |
| marcar lida / resolver | `crm-acoes-pt.png` |
| busca (titulo, telefone, mensagens) | `crm-busca-pt.png` |
| nota interna | `crm-nota-interna.png` |
| tempo de resposta por conversa | `crm-tempo-resposta.png` |
| selo "aguardando resposta" | `crm-selo-esperando.png` |
| painel Visao rapida (3 indicadores conferidos) | `crm-painel.png` |
| campo de etiquetas (duplicata descartada) | `crm-etiquetas.png` |
| busca por etiqueta (sem contaminacao do titulo) | `crm-busca-etiqueta.png` |

### O que NAO existe — nao prometer

- envio de mensagem pela tela (o codigo `sendText` existe, sem UI e sem credencial);
- filtro dedicado por etiqueta (so a busca);
- anexos, Kanban, ligar oportunidade a conversa;
- iOS, assinatura Windows, keystore Android;
- qualquer chamada real a API da Meta.

### Proximo passo, em ordem

1. **Com credencial:** ligar `sendText` na tela, persistir a saida com o `wamid` real, mostrar enviando/falhou/tentar de novo.
2. **Sem credencial:** anexos ou Kanban; ou o controle de filtro por etiqueta (a funcao `matchesTag`/`usedTags` ja existe e tem teste).

### Regras pagas com erro nesta sessao — nao repetir

1. Captura so existe quando o indice aponta para ela.
2. Verificacao de UI se faz olhando a tela; script de CDP serve para achar o caminho, nao para dar veredito.
3. Antes de concluir que o app nao funciona, suspeitar do instrumento (7 vezes foi o instrumento).
4. Guarda de "ja apliquei" ancora no trecho exato, nunca em substring do arquivo inteiro.
5. Experimento com duas causas possiveis nao prova nenhuma — remover o confundidor e refazer.
6. Nada de funcao que devolve sempre o mesmo valor disfarcada de regra.
7. Nao declarar modulo pronto por ter campo e validacao: a tela e o teste no binario fazem parte.


## Decisao do proprietario (rodada 226) — credencial adiada

Perguntado explicitamente se as nove variaveis do WhatsApp Cloud API estavam configuradas, o proprietario respondeu:
**"Ainda nao — siga no que nao depende disso."**

Consequencias, para nao haver duvida na retomada:

- o envio de mensagens **nao** sera ligado na tela nesta fase. O codigo `sendText` continua existindo e testado, sem UI.
- a ordem de trabalho passa a ser, por prioridade de valor sem credencial:
  1. filtro por etiqueta na tela (as funcoes `matchesTag` e `usedTags` ja existem e tem teste);
  2. anexos (validacao de tipo e tamanho, sem upload real);
  3. Kanban de oportunidades;
  4. ligar oportunidade a conversa.
- nao perguntar de novo sobre credencial antes de esgotar os itens acima.
- **continua proibido** declarar "WhatsApp conectado": a cadeia esta provada com payload assinado sintetico, e a API da Meta
  nunca foi chamada.


### Correcao da fila (rodada 229) — Kanban e pipeline JA EXISTEM

Ao ir construir "Kanban de oportunidades", auditei antes de escrever e encontrei pronto:

- `apps/desktop/electron/crm-pipeline-store.ts` + `.test.ts` (store validado)
- `apps/desktop/electron/crm-pipeline-ipc.ts` (IPC)
- `apps/desktop/src/api/crm-pipeline.ts` (cliente tipado)
- `apps/desktop/src/app/settings/crm-pipeline-section.tsx` + `.test.tsx` (tela com teste)
- `apps/desktop/src/plugins/kanban/` + `src/contrib/kanban-card-badges.tsx` (Kanban com badges)

**Portanto, saem da fila:** "Kanban de oportunidades" e "funil visual" — ja existem. Construir de novo seria duplicar
fonte de verdade, que o GOAL proibe explicitamente.

**Fila corrigida, sem credencial:**
1. ~~filtro por etiqueta~~ FEITO e provado;
2. ~~regras de anexo~~ FEITO (upload continua dependente de armazenamento);
3. **ligar oportunidade a conversa** — o elo que ainda nao existe;
4. renomear/excluir etiqueta em uso (gestao de vocabulario).

Licao: auditar antes de construir economiza a rodada inteira e evita duas verdades sobre o mesmo dado.

---

# ESTADO REAL AO FIM DA RODADA 252 (esta seção vale; acima é histórico)

## O commit

```
branch  b3po-brand
HEAD    20bfcfb244
main    f4cf411f28 (= origin/main, INTACTO)
```

## O placar do §32

**17 `VALIDATED` · 12 `PARTIAL` · 2 `BLOCKED` · 0 declarados prontos sem prova.**

## Os números que a próxima sessão pode usar sem reconferir

| Medida | Valor | Onde foi medido |
|---|---|---|
| Gate | **14 checks, ok** | `python scripts/check` |
| Typecheck | **0 erros** em 2 projetos | `scripts/check-b3po-types` |
| Suíte `electron/` | **4772 verdes · 40 falhas · 207 pulados** de 5019 | r250 |
| Falhas classificadas | **36 ambiente · 3 indeterminadas · 1 produto** | r250 |
| Stores de domínio | **766 verdes** | r251 |
| Concorrência | **12 verdes** (8 provados vermelhos sem a fila) | r251 |
| Permissões + tenant + LGPD | **33 verdes** | r251 |
| Stores com fila de escrita | **21 de 25** (4 não gravam) | r238 |
| Stores que filtram por tenant | **24 de 24** | r211 |
| Canais IPC com guard | **15 de 40** — dívida congelada em 25 | r214 |
| UI pronta (startup) | **931 ms** | r227 |
| IPC p50 | **0,3 ms** | r227 |
| Bundle | **53,46 MB** (19 MB de `shiki`, lazy) | r227 |
| Instalador Windows | **`B-3PO.exe` 235 MB · MSIX 191 MB · versão 1.0.0.0** | r241–242 |
| CI | **2 runs com sucesso, 0 falhas** | r243 |
| Telas com `<main>` | **8** | r233 |
| Botões sem rótulo | **0** (era 1) | r229 |
| Inputs sem label | **0** (era 1) | r230 |
| Documentos do §29 | **16 de 16** | r244 |

## O que foi provado na janela (não só lido no código)

| Prova | Evidência |
|---|---|
| App empacotado abre com marca e português | `docs/b3po/evidencias/instalado-r242.png` |
| Recusa aparece na tela — *"Informe um valor."* | r240 |
| Consentimento do CRM grava e reflete | r208 |
| `lang="pt"`, `title="B-3PO"` | r228 |
| `<main>` em 8 telas | r232–233 |

## O defeito de produto encontrado e NÃO corrigido

**`electron/desktop-installation.ts`** — recuperação de lock de reparo faz **40 tentativas**, cada uma consultando a
criação de processo (`processCreateTimeSync`), que é lenta no Windows. **~41 s antes de recusar.**

**Um usuário Windows com lock órfão espera ~40 s.** Não corrigido porque mexer em recuperação de lock sem medir pode
**travar o launch para sempre** — pior que esperar.

## O que a próxima sessão deve fazer primeiro

1. **Ler `docs/b3po/TEST-RESULTS.md`** — as 40 falhas estão classificadas ali, com a tabela que fecha.
2. **Não repetir a classificação** — ela custou 5 rodadas (246–250).
3. **A lacuna aberta**: os **3 testes de `bundle-electron-main`** que falham por `config.yaml` não lido. Causa entre
   **caminho Windows**, **YAML ausente** ou **bug de `HERMES_HOME`**. **Não medido.**
4. **A outra lacuna**: **4 dos 5 timeouts** do grupo maior continuam sem investigação individual.
5. **25 canais IPC sem guard** — o maior débito de segurança. A receita está em `docs/b3po/audit/PERMISSION-*.md`.

## O que NÃO fazer

| Não fazer | Por quê |
|---|---|
| Trocar `python3` por `python` nos testes | resolveria 13 aqui e **quebraria o CI em Linux** |
| Aumentar o timeout de `desktop-installation` | esconderia um comportamento de produto |
| Declarar "todas as 40 falhas são de ambiente" | **era falso** — 1 é produto, 3 indeterminadas |
| Tocar em `main` | espelho limpo do upstream, exigência F2-A |
| Fechar ou fazer merge do PR #1 | deve ficar **draft / aberto / NOT READY** |

## As cinco lições que custaram rodadas

1. **Um teste que passa por motivo errado é pior que um vermelho** (r217: `count:` em vez de `contado_milli:`).
2. **Uma execução parcial de testes é a mesma mentira que uma janela não aberta** (r224).
3. **O instrumento que mede precisa ser auditado junto com o que ele mede** — meu detector de erro falhou 4 vezes
   (r230, r239 ×2, r240) por procurar palavras em vez de olhar a diferença.
4. **Regex sobre estrutura aninhada falha** — 3 vezes (r224, r236). Use substituição literal ou número de linha.
5. **Quando o número não fecha, o erro está na medição** (r250: escrevi 37+1+3=41 e tive que refazer do JSON).
