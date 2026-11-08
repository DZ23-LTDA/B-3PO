---
tipo: auditoria-de-provedores
agente: dsh
projeto: c3po-bot
data: 2026-11-08
fase: V6-§4
revisao: r4
---

# V6 §4 — Provedores e inferência

> §4: *"Auditar os adaptadores existentes. Permitir configurar provedores compatíveis sem expor segredos
> no frontend. Implementar testes de conectividade, seleção de modelos, tratamento de erros, limites de
> custo e fallback autorizado."*

**Método**: leitura do código real. **Nenhuma linha abaixo é herdada de documento** — o V5 dizia apenas
`providers: {}` e nenhuma auditoria de adaptador existia.

## O que já existe (e é mais do que eu supunha na r1)

| Requisito do §4 | Estado | Evidência |
|---|---|---|
| Adaptadores de provedor | **IMPLEMENTED** | `hermes_cli/registry.py` (`_providers[]`), `runtime_provider_custom.py`, `config_providers.py`, `models.py` |
| Configurar provedor compatível | **IMPLEMENTED** | `apps/desktop/src/api/config.ts` → `/api/providers/validate`, `/api/providers/custom-endpoints` |
| **Teste de conectividade** | **IMPLEMENTED** | `validateProviderCredential()` devolve `{ ok, reachable, message, models?, resolved_base_url? }` |
| Seleção de modelo | **IMPLEMENTED** | `getGlobalModelOptions`, `setGlobalModel`, `getRecommendedDefaultModel`, `getAuxiliaryModels`, `getMoaModels` |
| Tratamento de erro | **IMPLEMENTED** | o validate devolve `ok`/`reachable`/`message` — não lança |
| Lista de disponíveis com auth | **IMPLEMENTED** | `models.py:830 list_available_providers()` → `{id, label, aliases, authenticated}` |
| Detecção de credencial | **IMPLEMENTED** | `models.py:815 _provider_has_credentials()` — checa auth real, não a existência de código |
| Limites de custo | **PARTIAL** | `getUsageAnalytics`, `settings/plans-view.tsx`, `current-plan-card.tsx` — **exibe**, não bloqueia |
| Fallback autorizado | **NOT_TESTED** | não encontrei cadeia de fallback declarada; **não afirmo que existe nem que não existe** |

## O caminho do segredo — o ponto do §4

**Como funciona hoje**:

```
renderer (a pessoa digita)
   -> POST /api/providers/validate   { key, value, api_key }   (loopback)
   -> gateway grava em .env
   -> reconcilia espelhos em config.yaml (model.api_key, auxiliary.*.api_key, custom_providers[*])
```

**Evidência**: `hermes_cli/web_routers/config_env.py` (972 linhas), comentário do ciclo de credencial nas
linhas 331–333:

> *"Unified credential lifecycle: writes .env AND reconciles any config mirror still holding the previous
> value of this var … so a rotation can't leave [a stale copy]"*

**O que isso significa**:

- **Bom**: a chave vai para `.env` (arquivo de segredos do projeto, fora do Git), e a **rotação apaga os
  espelhos antigos** em `config.yaml` — um vazamento silencioso por valor obsoleto é evitado por desenho.
- **Limite honesto**: **a chave transita o renderer** (é digitada nele e passa por `window.hermesDesktop.api`).
  No sentido estrito de *"sem expor segredos no frontend"*, **isso não está atendido**.

**Por que não classifico como defeito**: é o padrão de um app Electron com gateway local — o renderer **é**
a interface confiável, e o transporte é loopback. Para o §4 ser lido como "o segredo nunca toca o
renderer", seria preciso um diálogo nativo no **processo principal** (`safeStorage` existe no projeto, mas
hoje é usado para **headers remotos** de SSH/proxy em `connection-config.ts`, não para chave de provedor).

**Declarado como PARTIAL com o motivo**, em vez de "IMPLEMENTED" por conveniência.

## Verificações de segurança que eu fiz

| Verificação | Resultado |
|---|---|
| a chave aparece em `console.log` do renderer? | **não** — `api/config.ts` não loga |
| a chave vai para o repositório? | **não** — `.env` é o arquivo de segredos, fora do Git |
| espelho obsoleto em `config.yaml` após rotação? | **reconciliado** por desenho (`config_env.py:331`) |
| sanitização de header remoto (CRLF, request-splitting) | **existe** (`connection-config.ts:367`) — mas é para headers, não para chave de modelo |

## O bloqueio que continua

**`providers: {}` em execução** — medido na V5 r47 e reconfirmado na r2 desta V6: uma sessão nasce, o
turno é enviado, e a resposta falha. **Nenhum teste de conectividade pode passar sem credencial**, e o §7
(benchmark) não pode ser declarado concluído.

**`BLOCKED_BY_EXTERNAL_DEPENDENCY (EXT-3)`**: obter uma chave de modelo e reiniciar o gateway.

**O que dá para fazer sem ela**: tudo o que está acima nesta auditoria — a configuração, a validação, a
seleção e o tratamento de erro **existem e podem ser exercitados até o ponto em que o provedor responde**.
É exatamente o que o §4 manda ("continuar o trabalho independente delas").

## Correção do meu próprio inventário (r1)

O inventário da r1 marcou #10 como o único bloqueio central e **não mencionou que §4 já estava
majoritariamente implementado**. Isso teria me feito construir uma segunda UI de provedor sobre uma que já
existia — contra o §5 (*"Não construir uma segunda IDE se as funcionalidades já existirem"*).
