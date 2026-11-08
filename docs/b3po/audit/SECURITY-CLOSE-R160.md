# Faixa 211–225 — segurança, multitenancy e LGPD (fechamento)

**Rodada 160 de 256.**

## O que a faixa entregou

| R | Alvo | Achado | Testes |
|---|---|---|---|
| 156 | path traversal (`fs-ipc`) | **comentário de segurança falso** | 7 |
| 157 | command injection (`terminal-ipc`) | **0 injections**; 1 marca visível | 5 |
| 158 | isolamento multitenant | **funciona**; 1 achado exagerado | 8 |
| 159 | correção do meu achado | invariante travado | 6 |
| **160** | fechamento | este documento | — |

**26 testes de segurança novos.**

## O resultado honesto da faixa

**Nenhuma vulnerabilidade explorável foi encontrada.** Duas auditorias adversariais completas —
path traversal e command injection — voltaram limpas, com as proteções identificadas e testadas.

O que a faixa **encontrou** foram três coisas diferentes:

| # | Achado | Natureza |
|---|---|---|
| 1 | `fs-ipc.ts` afirmava *"never escapes the allowed roots"* sem existir lista de roots | **mentira documental** |
| 2 | título de janela dizia `"Hermes SSH"` | **marca de upstream visível** |
| 3 | `serverTenant(_fromRenderer)` parecia risco estrutural | **erro do auditor** |

## Os dois achados reais, e o que cada um custa

### 1. O comentário que afirmava proteção inexistente

```ts
// this never creates directory trees or escapes the allowed roots
```

Não existe `allowedRoots` em `hardening.ts`. `rejectUnsafePathSyntax` rejeita NUL e device paths; `path.resolve`
**normaliza** `..` em vez de recusá-lo.

**Por que é caro:** quem revisa código de segurança lê o comentário e **para de olhar**. O comentário era o único
lugar onde alguém decidiria não investigar.

**Corrigido** com a verdade, e o comportamento real fixado em 7 testes. **Não adicionei roots** — confinar
mudaria o produto (é um editor que abre arquivos arbitrários) e é decisão de modelo de ameaça, não bug.

### 2. `"Hermes SSH"` num produto chamado B-3PO

Título da janela do terminal remoto. **Corrigido**, com teste que impede a volta.

## O erro do auditor — e por que ele conta

A r158 classificou o parâmetro de `serverTenant` como *"risco estrutural"*. A leitura da função na r159 mostrou
o oposto:

```ts
/**
 * O parâmetro existe só para deixar explícito, na chamada, que havia um valor do renderer e ele foi
 * descartado. Um canal que simplesmente ignorasse `payload` sem dizer isso pareceria distração.
 */
export function serverTenant(_fromRenderer?: unknown): string {
  return INSTALLATION_TENANT
}
```

`_fromRenderer` é a convenção de "não usado", e o comentário **explica a decisão**. Eu tinha lido a assinatura
com `grep` e **não** o comentário ao lado.

**A lição, e ela não é sobre segurança:** quando a auditoria aponta um problema **estrutural**, a primeira coisa
a ler é o que o autor escreveu sobre a estrutura. `grep` encontra a forma; só a leitura encontra a intenção.

Este é o **segundo** achado meu corrigido nesta sessão (o primeiro foi "o mobile duplica a aprovação", r150).

## O que está provado

| Alegação | Estado | Como |
|---|---|---|
| `rename` recusa `.`/`..`/`\`/`/` | `VALIDATED` | leitura + teste |
| `writeText` não tem root confinement | `VALIDATED` | 7 testes fixam o fato |
| `psLiteral` dobra `'` (escape correto) | `VALIDATED` | teste com payload de injection |
| script remoto vai em `-EncodedCommand` | `VALIDATED` | teste decodifica o base64 |
| terminal é PTY, não `exec` de string | `VALIDATED` | leitura |
| isolamento entre tenants em 3 stores | `VALIDATED` | 8 testes com 2 tenants reais |
| `serverTenant` ignora o argumento | `VALIDATED` | 6 invariantes |
| nenhum canal **usa** o tenant do renderer | `VALIDATED` | grep + invariante |

## O que continua aberto

| Item | Estado |
|---|---|
| Isolamento em `crm`/`finance`/`whatsapp` stores **originais** | `NOT_TESTED` — só os 3 stores desta sessão |
| Busca, cache, filas, jobs | `NOT_TESTED` |
| **LGPD: consentimento no CRM** | `NOT_IMPLEMENTED` — o GOAL pede; não existe |
| LGPD: base legal, retenção, portabilidade | `PARTIAL` — anonimização existe (r94), o resto não |
| **CSP estrita no renderer** | `NOT_IMPLEMENTED` — é o que reduziria a escalada pós-XSS |
| OWASP: XSS, CSRF, SSRF, uploads | `NOT_AUDITED` |
| Shell remoto SSH Windows | `BLOCKED_BY_EXTERNAL_DEPENDENCY` |

## O que a faixa NÃO fez

**Nenhuma mudança de comportamento de segurança.** O código que estava protegido continua protegido; o código
que não tinha confinamento continua sem — e agora **está declarado** em vez de negado por um comentário.

A única alteração funcional foi um **título de janela**.

## Medido na faixa

| Medida | Valor |
|---|---|
| Rodadas | 5 |
| Testes de segurança escritos | **26** |
| Vulnerabilidades exploráveis encontradas | **0** |
| Comentários de segurança falsos | **1** (corrigido) |
| Marcas visíveis corrigidas | **1** |
| Achados do auditor corrigidos | **1** |
| Linhas de comportamento de segurança alteradas | **0** |
