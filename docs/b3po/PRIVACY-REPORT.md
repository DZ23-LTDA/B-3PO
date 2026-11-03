# PRIVACY-REPORT — B-3PO

**Data:** 2026-11-02 · **Escopo:** dados que o produto guarda, envia e deixa vazar para terceiros.

## 1. O que fica **local** (por design)

| Dado | Onde | Observação |
|---|---|---|
| Configuração | `HERMES_HOME/config.yaml` | inclui provider/modelo e preferências |
| Sessões e conversas | banco de sessões em `HERMES_HOME` | transcript detalhado é do runtime, nunca duplicado pela camada B-3PO |
| Memória/skills | `HERMES_HOME` | escopo por profile (bot) |
| Logs | `HERMES_HOME/logs` | inclui `agent.log`, `gateway.log`, `errors.log` |
| Credenciais | `auth.json` / `.env` | **fora do Git**; nunca em código |

O `HERMES_HOME` de teste fica isolado em `projects/c3po-hermes-home`, fora do checkout.

## 2. Telemetria

- **Desligada por padrão:** `telemetry.shared_metrics.enabled: false` e `send: false`.
- **Duplo opt-in:** habilitar coleta não envia; é preciso `send: true`.
- Quando ligada, envia só **contadores agregados allowlisted**, com UUID aleatório por profile — sem hardware,
  conta ou host.
- Endpoint padrão (`telemetry.nousresearch.com`) está **comentado** no exemplo.
- Retenção: histórico exportado 30 dias; deltas pendentes até exportar.

**Conclusão:** postura conservadora e documentada. Nada é enviado sem duas ações explícitas do usuário.

## 3. Terceiros que recebem dados (quando o usuário configura)

| Terceiro | O que sai | Condição |
|---|---|---|
| Provider de modelo (Ollama local, OpenRouter, Anthropic, etc.) | prompts, contexto, resultados de ferramenta | sempre que um turno roda |
| Gateway de mensageria (Telegram, Discord…) | mensagens da conversa | se o usuário conectar |
| Servidor MCP configurado | chamada de ferramenta e argumentos | se o usuário instalar |
| Relay/cloud (se habilitado) | mensagens e eventos | se o usuário optar |

O B-3PO **não** adiciona terceiros próprios: não há analytics do produto, nem crash reporting, nem update
check do B-3PO nesta entrega.

## 4. Risco identificado: empréstimo de credenciais de outros apps

`auth.adopt_external_logins: true` (padrão do upstream) faz o produto **ler logins de Codex e Claude Code**
(`~/.codex/auth.json` e similares) quando não tem login próprio. Refresh token é de uso único — dois
programas podem derrubar o login um do outro.

**Impacto de privacidade:** o produto acessa credenciais de outro software sem ação explícita do usuário no
momento. **Decisão necessária do proprietário** antes de piloto: manter, desligar por padrão, ou exigir
consentimento no onboarding.

## 5. Dados de usuário e migração

- O rebranding mudou o `userData` do desktop (`Hermes` → `B-3PO`). Instalações anteriores **não migram
  automaticamente**; os dados antigos ficam intactos no diretório antigo.
- Nenhuma exclusão automática de dados é executada por esta entrega.

## 6. O que **não** foi verificado

- Se logs sanitizam segredos em todos os caminhos (há função de redação, não há teste end-to-end).
- Backup/restauração de `HERMES_HOME`.
- Comportamento de telemetria sob `send: true` em ambiente real.
- Política de retenção do banco de sessões.

## 7. Veredito

Privacidade **adequada por padrão** (telemetria off, dados locais), com **um ponto que exige decisão**:
`adopt_external_logins`. Nenhuma alegação de conformidade (LGPD/GDPR) é feita — isso exige revisão jurídica,
que é decisão do proprietário.
