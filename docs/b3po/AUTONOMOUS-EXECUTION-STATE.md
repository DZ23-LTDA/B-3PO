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
