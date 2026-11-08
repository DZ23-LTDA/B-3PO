# BOT-SCHEMA-AUDIT — o que o código realmente tem (F4)

Base: `apps/desktop/src/plugins/hermes-bots/` (202 arquivos) + `hermes_state*`. Método: leitura de tipos e
do editor de profile. **Nada aqui foi validado rodando o app** — é auditoria de código.

## 1. O que existe

`BotMeta` (`types.ts:64`) — metadados persistidos por bot:

| Campo | Tipo | Uso |
|---|---|---|
| `title` | string | nome exibido |
| `description` | string | descrição |
| `sectionId` / `sectionName` | string, null | organização em seções (persistida no bot) |
| `groups` / `group` | string[] / string | agrupamento |
| `color` | string | cor do avatar |
| `image` | data URL / null | avatar customizado (enviado via `set_asset`) |
| `imageKind` | `photo` \| `shape` | origem do avatar |
| `shape` | string | forma do avatar gerado |
| `custom` | boolean | avatar personalizado |
| `hidden` | boolean | oculto na lista |
| `pinned` | boolean | fixado |
| `screenAutoOpen` | boolean | abre a aba Screen ao dirigir o desktop |
| `created` | number | criação |

Editor avançado (`profile-config.tsx`): **skills, toolsets, servidores MCP, modelo e SOUL** por profile.

**Bot = profile do Hermes.** `data.ts` resolve bot → `profile` (141 arquivos citam `profile`); a
persistência real é `profile.yaml`, sincronizado como o resto das configurações.

## 2. Mapeamento para o schema aprovado (F4)

| Bloco F4 | Campo aprovado | Existe hoje? | Observação |
|---|---|---|---|
| identity | `schema_version` | **não** | criar no v1 |
| identity | `id` | sim (nome do profile) | id estável = nome do profile |
| identity | `name` | `title` | renomear só na camada B-3PO |
| identity | `description` | `description` | direto |
| identity | `mascot_id` | **não** (há `shape`/`image`) | adicionar como campo opcional |
| identity | `instructions/persona` | SOUL por profile (`soul.ts`) | referência, não cópia |
| identity | `labels` | `groups`/`sectionId` | mapear |
| runtime_config | `engine` | implícito (Hermes) | fixar `hermes` no v1 |
| runtime_config | `provider` / `model` | sim (`model-picker`) | direto |
| runtime_config | `permission_policy` | **não** | obrigatório no v1 |
| runtime_config | `tools` / `skills` / `mcp_refs` | sim (`toolset`, `skills-hub`, `mcp-setup`) | opcionais |
| runtime_config | `workspace_ref` | **não confirmado** | permanece `null` |
| links_and_state | sessões/conversas | sim (`canonical-chat`) | referência |
| links_and_state | rotinas | sim (`cron.tsx`) | referência |
| links_and_state | memória | profile-level | referência, nunca cópia |

## 3. Lacunas para o v1

1. **`schema_version` + `mascot_id` + `permission_policy` não existem** — são o núcleo do que F4 aprovou.
2. **Migração versionada** não existe para BotMeta; há `data.bot-meta-migration.test.ts`, sinal de que já
   houve migração — precisa ser lida antes de adicionar campos.
3. `workspace_ref` e memória: **não confirmados** como atributo por bot → entram `null`.

## 4. Veredito

O schema real é **compatível** com F4 (nada contradiz), mas incompleto: faltam três campos obrigatórios e
a migração v1. Implementação viável sem tocar o core Hermes — fica no plugin/camada B-3PO.

---

## Atualização 21:31 — schema v1 implementado (camada de contrato)

`apps/desktop/src/plugins/hermes-bots/bot-schema.ts` implementa F4 **sem tocar no `data.ts`** (59 KB) nem
no runtime:

- `BOT_SCHEMA_VERSION = 1`; `engine` só aceita `hermes`;
- três blocos: `identity` / `runtime_config` / `links_and_state`;
- `permission_policy` obrigatória, `RESTRICTIVE_POLICY` = `{allow:[], deny:[], default:'deny'}`;
- `fromLegacyBotMeta()` converte `BotMeta` legado → v1 sem inventar valor (provider/model/refs = `null`);
- `migrateBotRecord()` idempotente, normaliza `default` inválido para `deny`, rejeita engine ≠ hermes e
  registro sem `id`;
- `validateBotRecord()` devolve erros; `mascotIdFor()` expõe o mascote como identidade visual.

**Testes:** `bot-schema.test.ts` — **12 testes, 12 passando**; `npm run typecheck` exit 0; eslint nos
arquivos novos exit 0.

**Ainda não conectado à UI.** O módulo é o contrato; a fiação no fluxo de criação/edição e a migração
dos registros existentes são o próximo passo (Fase C, parte 2).

---

## Atualização 22:26 — fiacao na persistencia (F4 deixa de ser só contrato)

`BotMeta` agora carrega os campos do contrato:

```ts
mascot_id?: null | string
permission_policy?: PermissionPolicy
```

Como `saveBotMeta()` já persiste o metadado inteiro (spread + storage + `profiles.configure`), **não foi preciso
mexer na função**: qualquer caminho que grave esses campos passa a persisti-los. Completado por:

- `botRecordFromMeta(id, meta)` — compõe o registro v1 com default restritivo quando não há política
  (bot antigo **nunca herda** permissão);
- `botMetaPatchFromRecord(record)` — extrai só o que o metadado guarda;
- `normalizePolicy` exportado (saneia `allow`/`deny` e invalida `default` para `deny`).

**Testes:** 15 no schema (3 novos cobrindo a fiação e o round-trip registro → patch → registro).
Typecheck e eslint verdes; `scripts/check` 14 ok.

**Ainda falta:** a UI de escolher mascote e editar política (componentes). O caminho de dados já está aberto e
persistente; falta a superfície.
