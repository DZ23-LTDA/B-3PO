---
tipo: registro-de-retratacoes
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G8
---

# RETRATATIONS — o que eu afirmei, o que era, e por quê

> G8: *"Manter registro de retratações: corrigir afirmações anteriores quando surgirem novas
> evidências, **sem reescrever o que já foi entregue**."*
>
> Este arquivo é a lista completa. Cada linha corrige uma afirmação que eu mesmo publiquei.

## Por que este documento existe

Em 42 rodadas eu escrevi 14 retratações espalhadas por seis documentos. **Espalhadas não é registro.**
Quem retoma o projeto precisa ver o padrão de erro, não só a correção.

**O padrão, medido:** onze das catorze foram eu **subestimando o repositório** — escrevendo
`NOT_TESTED`, `NÃO EXISTE` ou um número menor do que o real **sem procurar**. Duas foram o contrário.
Uma foi do lado do produto.

## Segurança e autorização

| # | Rodada | Eu afirmei | O que era | Evidência |
|---|---|---|---|---|
| 1 | G0 | "25 canais de dívida" | **341 registros em 59 arquivos**; depois **281 canais** com coletor por canal | `AUDIT_BASELINE.md` |
| 2 | r2 | "bot+owner pode desinstalar" (risco) | era **defeito real** — corrigido | `5e0af2a416` |
| 3 | r7 | "escopo de negócio basta para máquina" | errado no meu próprio fix — o bot precisava do **domínio** | `b8400c79d0` |
| 4 | r8 | "a capacidade é concedível" | o próprio fix da r7 a tornou **ingrantável** | `a37273e094` |
| 5 | r9 | "a identidade do aprovador vem do main" | era **meia-correção** (o commit da V4 falhou) | `10813d2fed` |
| 6 | r32/r33 | "**144/sem guarda**" | nenhum dos dois números é publicável: o coletor é cego a wrappers locais | `IPC_AUTHORIZATION_MATRIX.md` |
| 7 | r32 | "`finance` sem guarda" | guardado por `comGuarda`, aninhado | idem |
| 8 | r36 | "**SSRF: NÃO EXISTE**" | `tools/url_safety.py` (548 linhas) + revalidação de redirect · **169 testes** | `ce36b17f60` |

## Itens que eu marquei como não testados e **existiam**

| # | Rodada | Item | O repositório tinha |
|---|---|---|---|
| 9 | r28 | validação de origem do WebSocket | **64 testes** |
| 10 | r29 | IDOR / multi-tenant | teste de 3 tenants (não roda no Windows: `SIGKILL`) |
| 11 | r29 | path traversal | **7 testes** + documento de decisão |
| 12 | r30 | replay de webhook · injeção de prompt | **8** e **72 testes** |
| 13 | r34 | migrações | **56 testes** + `gateway_migrate.py` (1.097 linhas) |
| 14 | r35 | XSS · CSRF | **5** e **15 testes** |

## Afirmações de bloqueio externo que **não** eram externas

| # | Rodada | Eu escrevi | Era |
|---|---|---|---|
| 15 | r25 | "a ponte deixou de ser código morto" | `delegar` **nunca foi exposto no preload** — inalcançável por 14 rodadas |
| 16 | r15 | "o componente está montado" | **não estava** — o script falhou antes da montagem e eu conferi só o typecheck |
| 17 | r25→r37 | "o caminho feliz depende de `EXT-3`" | a delegação precisa de **agente**, e o roster tem `business_manager` |
| 18 | r41 | "`Process failed to launch` — suíte E2E quebrada" | **`ELECTRON_RUN_AS_NODE=1`** no ambiente do DSH |

## Erros de **instrumento** (os que produziram números falsos)

| # | Rodada | Instrumento | O que ele escondeu |
|---|---|---|---|
| 19 | r19 | `Substring(0,110)` sobre uma string de 162 chars | o sufixo `home-` que provava o contrário |
| 20 | r20 | `console.error` inserido **antes** do `Object.defineProperty` | a plataforma depois da mutação |
| 21 | r19 | patch em `fs.readFileSync` do módulo | o bundle importa **estaticamente**; o patch não pega |
| 22 | r33 | detecção automática de wrapper | **66 falsos positivos** (`register*`, `bruto`, `texto`) e ainda sem achar `comGuarda` |
| 23 | r38 | `Measure-Object -Line` (15.529) vs ratchet (18.220+) | o teto real de `main.ts` — commitei 15 linhas acima |
| 24 | r18 | rótulo copiado de handoff ("EPERM de symlink") | **2 de 3** eram `core.autocrlf=true` |

## O padrão, em uma frase

> **Toda vez que eu parei de confiar no meu resumo e fui medir, o número mudou — e mudou para melhor.**

O dano de um `NOT_TESTED` errado é o de um `PASS` errado: **alguém decide com base nele.** Um risco
inexistente compete por atenção com os reais.

## Regras que estes erros produziram

1. **`NOT_TESTED` é afirmação, não nota de rodapé.** Procurar em `tests/` e no código antes de escrever.
2. Se existe e não roda aqui: **`EXISTE, NÃO RODA NESTE HOST`** + motivo — não "não testado".
3. **`BLOCKED_BY_EXTERNAL_DEPENDENCY` é tão sério quanto `READY`.** Duas vezes eu usei para cobrir uma
   tentativa que falhou por razão minha.
4. **Antes de publicar um número, reconstrua-o.** Se não reconstruo com confiança, não publico.
5. **Um mecanismo que existe e nunca pode disparar é defeito** — `retries: 2` contra `tentativas: 0`
   (r40); `withPermission` em 1 de 4 canais (r32).
6. **O artefato em execução pode não ser o código** — três vezes neste goal (APK, gateway, cópia
   deployada).
