# Varredura de duplicatas na navegação (rodada 98/99)

Pergunta do proprietário: *"por que tem 2 CRM?"* e *"o WhatsApp também tem dois, parece a mesma coisa"*.

## O que a varredura encontrou

### 1. CRM — DUPLICATA REAL, corrigida

| Origem | Path |
|---|---|
| Menu do núcleo (`app/chat/sidebar/index.tsx:231`) | `/crm` |
| Plugin `b3po-nav` (acrescentado na r96) | `/crm` |

O menu do núcleo já tinha **cinco** itens: Capacidades, Mensageria, CRM, Artefatos e Tarefas agendadas. Eu
acerescentei 18 sem conferir se algum já existia.

**Corrigido:** removido do plugin. `/crm` continua acessível pelo item do núcleo.

O teste agora falha se o plugin voltar a contribuir com `/crm` — a duplicata apareceu para o
**proprietário**, não para o teste, o que é o pior caminho possível.

### 2. WhatsApp — NÃO é duplicata

`hermes_cli/platforms.py` linhas 19–20:

```python
("whatsapp",       PlatformInfo(label="📱 WhatsApp (Web / QR Code)",  default_toolset="hermes-whatsapp")),
("whatsapp_cloud", PlatformInfo(label="📱 WhatsApp Business (Cloud)", default_toolset="hermes-whatsapp")),
```

| Canal | O que é | Como conecta | Código |
|---|---|---|---|
| `whatsapp` | WhatsApp **Web** | QR Code (Baileys) | `plugins/platforms/whatsapp/` |
| `whatsapp_cloud` | **Business Cloud API** | API oficial da Meta | `plugins/platforms/whatsapp_cloud/` |

O GOAL manda explicitamente **não** fundir: *"Diferenciar WhatsApp Web e WhatsApp Business Cloud API.
Não confundir canais distintos com duplicação."* São adapters diferentes, com credenciais, limites e
webhooks diferentes.

**O que estava confuso:** os dois usavam o mesmo ícone 📱 e o primeiro se chamava só "WhatsApp" — nada
dizia que era o Web. Agora: **"WhatsApp (Web / QR Code)"**.

### 3. Atendimento × Mensageria — não são duplicatas

| Tela | Path | O que faz |
|---|---|---|
| Mensageria | `/messaging` (núcleo) | **Conectar** canais: token, allowlist, pareamento |
| Atendimento | `/atendimento` (plugin) | **Atender**: tickets, SLA, satisfação |

Uma configura, a outra opera. Ambas aparecem no menu e isso é correto.

## Inventário completo do menu

**Núcleo (5):** Capacidades · Mensageria · CRM · Artefatos · Tarefas agendadas
**Plugin (17):** Painel · Atendimento · Agenda · Produtos · Estoque · Compras · Vendas · Financeiro ·
Serviços · RH · Marketing · Pós-venda · Agentes · Automações · Documentos · Privacidade · Empresa
**Outro plugin:** Kanban (desligado por padrão)

**Cruzamento:** nenhum path repetido entre as três fontes.

## O que a r98 mostrou sobre as telas

Cada módulo, aberto pelo menu e lido na tela:

| Tela | Conteúdo real |
|---|---|
| Painel | Dinheiro, operação, alertas — 9 indicadores |
| CRM | 6 contadores + contatos + funil + tarefas + conversas |
| Produtos | Formulário com unidade (caixa, kg, m²…) + lista |
| Financeiro | 5 totais + lançamento com tipo |
| Estoque | Movimentação entrada/saída/ajuste + motivo obrigatório |
| Agenda | Recurso, serviço, data, hora |
| Atendimento | Abertos, atrasados, satisfação + abertura de ticket |
| Privacidade | **Degradada**: "Esta versão do aplicativo não expõe o pedido do titular" |

## Pendência real: a tela de privacidade não acha a ponte

`privacyAvailable()` devolveu **falso** no app construído, embora `electron/preload.ts` exponha
`hermes.privacy` e o IPC esteja montado no `mountErpIpc`.

O app não está com a ponte no `window.hermes` — ou o preload do build é outro. **A tela funciona, a ponte
não chegou.** É a próxima rodada.
