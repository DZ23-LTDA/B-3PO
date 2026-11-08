# Auditoria do WhatsApp — estado real (rodada 70)

Levantada do código, não de relatório anterior. Cada linha foi conferida por busca no repositório.

## Superfícies encontradas

### Backend Python (upstream, preservado)

| Caminho | Arquivos | Papel |
|---|---|---|
| `plugins/platforms/whatsapp/` | 4 `.py` | adaptador do WhatsApp Web (bridge) |
| `plugins/platforms/whatsapp_cloud/` | 6 `.py` + 1 teste | adaptador da Cloud API oficial |

São **canais distintos, não duplicação**: um fala com o bridge local, o outro com a API da Meta. O
GOAL manda não confundir os dois, e aqui eles estão separados por plugin, o que é a separação certa.

`scripts/whatsapp-bridge/` **não existe** neste fork (0 arquivos). O GOAL o lista como superfície a
auditar; a conclusão honesta é **NOT_IMPLEMENTED aqui**.

### Desktop (B-3PO)

Oito módulos, **todos com teste**:

| Módulo | Função |
|---|---|
| `crm-whatsapp-signature` | assinatura HMAC do webhook |
| `crm-whatsapp-endpoint` | recebe o POST, valida, devolve resposta |
| `crm-whatsapp-ingest` | normaliza a mensagem para o domínio |
| `crm-meta-webhook-map` | mapeia o payload da Meta |
| `crm-conversations-store` | armazenamento canônico de conversa e mensagem |
| `crm-whatsapp-listener` | porta HTTP local |
| `crm-whatsapp-boot` | decide se sobe (opt-in + credenciais) |
| `crm-whatsapp-outbound` / `-send` | envio de saída |

## A cadeia está montada — e eu quase reportei o contrário

`main.ts:17505` chama `mountCrmContacts`, que chama `maybeStartWhatsAppIngest` (`crm-contacts-ipc.ts:55`).

Meu primeiro levantamento procurou a montagem em `erp-ipc.ts` e não a encontrou; concluí "nunca
montado". **Estava errado** — olhei no arquivo errado. O registro honesto é este: a cadeia de
recebimento sobe pelo `main.ts`, condicionada a opt-in explícito e credenciais presentes.

## Classificação

| Item | Classe |
|---|---|
| `plugins/platforms/whatsapp` | **CANONICAL** (canal Web) |
| `plugins/platforms/whatsapp_cloud` | **CANONICAL** (canal Cloud) |
| `crm-whatsapp-*` (8 módulos) | **CANONICAL** |
| `crm-conversations-store` | **CANONICAL** |
| `crm-contacts-ipc` | **CANONICAL** (2 canais: list, upsert) |
| Tela `/crm` | **PARTIAL** — mostra contatos e funil, **não** mostra conversas |
| `scripts/whatsapp-bridge/` | **NOT_IMPLEMENTED neste fork** |

## O buraco real

A tela diz, em texto visível:

> *"O que ainda NÃO existe aqui: conversas (depende do canal oficial do WhatsApp)"*

Mas o backend de conversas **existe** (`crm-conversations-store`, com status, direção de mensagem,
notas). O que falta é a **tela de conversas** — não o armazenamento.

Isso é o inverso do padrão que venho encontrando: aqui o dado existe e a interface não. As rodadas
45, 52, 62 e 68 tiveram o problema oposto (tela ou executor existindo sem montagem).

**Próximo passo concreto:** tela de conversas lendo `crm-conversations-store`, sem criar segundo
armazenamento — o GOAL proíbe um CRM por Bot, e um inbox paralelo seria a mesma violação.

## Bloqueio externo, sem rodeio

Envio real de mensagem exige `WHATSAPP_CLOUD_*` (token, phone number id, app secret, verify token).
Sem essas credenciais:

- o **recebimento** pode ser testado com payload assinado localmente;
- o **envio** não pode sair da máquina, e testá-lo contra a Meta seria enviar mensagem de verdade.

`BLOCKED_BY_EXTERNAL_DEPENDENCY` para envio real. O resto segue.
