---
tipo: revisao-seguranca
agente: dsh
projeto: c3po-bot
data: 2026-11-07
fase: G1
---

# SECURITY_REVIEW — V5, autorização e identidade

> Todo item aqui foi **medido no código ou provado por teste**. O que não foi, está na última seção
> como `NOT_VERIFIED`. Nenhuma afirmação de "o produto é seguro" é feita.

## 1. As três políticas, e por que são três

| Política | Pergunta | Onde |
|---|---|---|
| `withPermission(ator, ação, recurso)` | *"esta pessoa pode lançar no financeiro?"* — **recurso de negócio** | `permission-guard.ts` |
| `podeOperarMaquina(ator, capacidade, domínio)` | *"pode operar este computador?"* — **capacidade de máquina** | `machine-access.ts` |
| `podeAdministrarInstalacao(ator)` | *"responde pela instalação?"* — **desinstalar, criptografia** | `machine-access.ts` |

**Escrita não implica administração.** Um operador de vendas com `EXECUTE_ALLOWED` escreve arquivo e
**não** desinstala o produto nem desliga a criptografia de segredos. São três perguntas, três funções.

## 2. Critério A — identidade não vem do renderer

**Medição (r12)**: varredura dos **329 handlers** procurando leitura de campo de identidade no payload.

| Campo | Handlers que leem do renderer | Resultado |
|---|---|---|
| `tenant_id` | **6** | todos passam por `serverTenant(...)` — **normalizado no servidor** |
| `role` · `level` · `ator_id` · `execucao_id` | **0** | — |
| `kind` | 1 (`aftersales:create`) | é `FollowUpKind` = `satisfacao\|recompra\|fidelizacao` — **enum de negócio**, não de ator |
| `quem` | **1** (`agent:approvals:decide`) | **era real**: corrigido na r9 (`10813d2fed`) |

**Resolvidos no servidor por desenho** (comentário no próprio código):

- `sofia:aprovar` → `store.aprovar(planoId, ator?.id ?? '')`
- `delivery` → *"O `recebedor` vem de quem chama — no canal, de `actorOf`. Nunca do payload."*
- `purchases` → *"O `solicitante` vem de quem chama, não do payload — o canal o resolve."*

**Veredito medido**: nenhum canal usa identidade do renderer para **decidir autorização**.

## 3. Critério B — bot não recebe capacidade universal

```ts
if (ator.kind === 'bot') {
  const escopos = ator.scopes ?? []

  if (!dominio || !escopos.includes(dominio)) return false
}
```

`EXECUTE_ALLOWED` isolado **não** opera a máquina. O escopo tem de ser **do domínio**
(`git`/`terminal`/`fs`/`plugin-files`) — e `scopes: ['sales']` não abre terminal, porque "tem escopo"
não é "tem este escopo".

**E a capacidade é concedível**: os quatro domínios estão em `SCOPE_OPTIONS` (`src/api/admin.ts`), com
um teste que prende os dois conjuntos. Sem isso a r7 teria protegido o recurso **destruindo o acesso**
a ele — o que o rubric do repositório rejeita.

## 4. As correções aplicadas no V5

| Rodada | Defeito | Evidência |
|---|---|---|
| r2 | `uninstall:run` sem autorização — qualquer JS desinstalava | `5e0af2a416` · 5 testes negativos |
| r3 | `secret-storage:set` decriptava tudo sem autorização; política centralizada | `cc3e3b7399` · 6 testes |
| r7 | bot com `EXECUTE_ALLOWED` spawnava shell | `b8400c79d0` |
| r8 | a r7 tornou a capacidade inalcançável | `a37273e094` · invariante |
| r9 | identidade do aprovador vinha do renderer (a metade que a V4 não pegou) | `10813d2fed` · 3 testes |
| r10 | `terminal:write/resize/cwd` alcançavam o terminal de **outra janela** | `352a5a0c92` · 2 testes |
| r11 | `execucao_id` forjável pelo renderer; ponte sem porta | `4b00249450` · 4 testes |

## 5. O eixo que a capacidade **não** cobre: posse

A r10 achou um furo que a autorização não vê:

> A guarda de ator responde *"esta pessoa pode operar a máquina"*.
> A pergunta do terminal é *"esta **janela** abriu esta sessão"*.

`terminal:start` estava guardado desde a V4; `write`/`resize`/`cwd` só checavam se a sessão existia.
Um renderer escrevia num shell privilegiado aberto por outra janela — **sem spawn**, então a guarda
de criação nunca era acionada.

**Regra adotada**: recurso por janela exige `webContentsId === event.sender.id`. Onde a posse
existe, ela é checada antes do efeito.

## 6. O que **não** foi verificado

| Item | Estado |
|---|---|
| IDOR multi-tenant (A×B) | **não testado** — 6 handlers normalizam o tenant, mas não há teste de cruzamento |
| Egress allowlist / SSRF | **não existe** — 11 canais de rede medidos, nenhum com allowlist |
| Path traversal em `fs`/`plugin-files` | **não testado** |
| Replay de webhook | assinatura + janela de 10 min existem (V4); replay testado? **não nesta rodada** |
| Confused deputy nos 20 canais `NOT_VERIFIED` | **não verificado** |
| Prompt injection / tool-output injection | **não testado** (G5) |
| Banco: migrations, constraints, índices | **não inventariado** |
| Conectores: prontidão real | `connector_readiness.py` existe; comportamento vivo **não exercitado** |

**Nada nesta lista foi declarado seguro.**

## 7. A lição de método do V5

O `RISK_REGISTER` da r1 classificou riscos **pelo nome do canal**. **Cinco de cinco** foram retratados
ao ler o corpo do handler (R-01, R-03, R-04, R-06, R-07).

> *"Tem guarda?"* mede o **texto** — o ratchet antigo media 14% disso.
> *"É explorável?"* mede **efeito × procedência da entrada × validação**.

E nenhum dos cinco era vulnerável. **A superfície perigosa era menor do que a contagem**, e o que
existia de fato (desinstalação, criptografia, identidade do aprovador, posse do terminal, vínculo de
execução) **não aparecia na lista** — foi encontrado por medição dirigida.
