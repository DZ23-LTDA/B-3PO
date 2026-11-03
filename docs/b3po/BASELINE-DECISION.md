# BASELINE-DECISION — decisão pós-auditoria

**Data:** 2026-11-02 · **Branch:** `b3po-brand` · **Base:** `f4cf411f` (upstream)

## Veredito

Prosseguir para implementação **sem bloqueio estrutural** no núcleo, com frentes móveis bloqueadas por
dependência externa (Apple) e uma frente (Android) liberada por emulador + SDK.

## O que está liberado para implementar

| Frente | Base de evidência |
|---|---|
| Schema de Bot v1 | `BOT-SCHEMA-AUDIT.md`; `BotMeta` real mapeado |
| Camada de orquestração | eventos `turn.*`/`tool.*` existem; `tools/approval.py` existe |
| Marca nos clientes | `brand/` + gates verdes |
| Desktop Windows | `npm ci` + typecheck + build + pack |

## O que está bloqueado (e por quê)

| Frente | Bloqueio | Tipo |
|---|---|---|
| macOS `.app/.dmg` | sem macOS/Xcode | externo |
| iOS archive/IPA | sem macOS/Xcode/certificado | externo |
| Windows assinado | sem certificado Code Signing | externo |
| Android cliente funcional | contrato de sessão não congelado | interno (Fase D) |
| Linux AppImage/deb | container não executado | interno/operacional |

## Riscos aceitos ao prosseguir

1. O schema v1 é camada nova; registros antigos só migram quando a fiação for feita (nada quebra por ora).
2. O desktop ainda empacota como `Hermes.exe` — rebranding de `productName` está pendente (Fase E).
3. A política restritiva ainda não é aplicada ao runtime: até a Fase D, nenhuma capacidade deve ser
   anunciada como protegida.

## Próxima decisão técnica (quando a Fase D começar)

Como aplicar `permission_policy` no ponto de execução — duas vias auditadas: restringir toolset (o modelo
não vê a ferramenta) e aprovação existente (`tools/approval.py`). Nenhuma outra via é aceita.
