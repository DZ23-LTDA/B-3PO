# Segurança: dois achados, medidos (rodada 85)

## O que está sólido

### RBAC

`rbac.ts` com 5 níveis, 5 papéis, 12 ações e 3 ações HUMAN_ONLY (`manage_actor`, `change_role`,
`settle_real_payment`). **16 testes** cobrindo: hierarquia de nível, bot nunca concede, ninguém concede
acima do próprio nível, bot não vira owner, bot não age fora do escopo, audit de permitido e negado.

### Ferramentas de agente

`agent-tools.test.ts` com **14 testes**: bot com escopo `inventory` não **enxerga** ferramentas de
`finance`; bot READ não vê ferramenta de escrita; **o store não é chamado** quando o domínio está fora do
escopo; erro de negócio não vira `sem_permissao`.

A recusa também foi validada no binário (r46): um agente MCP tentou `finance.append` e recebeu
`sem_permissao: fora_do_escopo`.

### Webhook do WhatsApp

Assinatura HMAC, comparação em tempo constante, limite de 1 MiB, deduplicação — cobertos por teste.

## Achado 1 — IDOR no IPC: o renderer escolhe o tenant

Os canais aceitavam o tenant vindo do renderer:

**Correção de medição (r87).** A primeira versão deste relatório dizia "vinte canais" — era um grep largo
demais, que casava qualquer linha terminando em `payload`. Medido com o padrão certo (`tenant(payload)`
**e** `tenant(tenantId)`, que é o mesmo defeito com outro nome de variável):

| Arquivo | Chamadas que confiam no renderer |
|---|---|
| `scheduling-ipc.ts` | 4 |
| `finance-ipc.ts` | 3 |
| `catalog-ipc.ts` | 2 |
| `inventory-ipc.ts` | 2 |
| `purchases-ipc.ts` | 2 |
| `sales-ipc.ts` | 2 |
| `documents-ipc.ts` | **corrigido na r86** |

**6 arquivos, 15 chamadas** que foram corrigidas nas rodadas 88 e 89. Os quatro canais do CRM **não** têm o defeito: o `list()` deles
não recebe tenant. A lista anterior os incluía por erro de medição.

O mesmo defeito aparecia com dois nomes — `tenant(payload)` em `documents-ipc` e `tenant(tenantId)` nos
demais. Procurar por um só nome encontrou um só arquivo, e quase me fez concluir que o problema era
pontual.

Exemplo real (`documents-ipc.ts`):

```ts
ipcMain.handle('hermes:documents:list', async (_event, payload) => ({
  documents: await store.list(tenant(payload)),   // payload vem do renderer
  totals: await store.totals(tenant(payload))
}))
```

### Por que isso é IDOR

O processo principal **confia no renderer** para dizer de qual empresa são os dados. O produto se anuncia
como multiempresa e tem isolamento provado em 17 domínios — mas o isolamento é *do store*, não *do canal*.
Qualquer código que rode no renderer pode pedir `empresa_b` e receber os dados dela.

### Qual é o modelo de ameaça, honestamente

Num Electron local, o renderer é o próprio usuário. Não há atacante remoto. O vetor real é **código
injetado no renderer** — XSS num conteúdo renderizado, extensão maliciosa, dependência comprometida.

Com um único usuário e uma única empresa (`local`), o impacto hoje é **baixo**: só existem os dados que o
usuário já pode ver. O impacto cresce no dia em que houver mais de um tenant real no mesmo perfil — e é
exatamente o cenário que a rodada 80 autorizou.

### A correção certa

O tenant não pode vir do renderer. Ele deve ser derivado do **ator resolvido no processo principal** —
que já existe (`actorOf` em `erp-ipc.ts`) e já é usado para autorização. O canal passa a receber `tenant`
como argumento do servidor, não do payload.

Isso não foi feito nesta rodada: são 20 arquivos, cada um com o seu par store↔IPC, e refatorar todos sem
teste por canal é o tipo de mudança que quebra silenciosamente. Fica registrado como **a correção
pendente de maior valor em segurança**.

## Achado 2 — o gate não roda typecheck

`scripts/check` (14 checagens) não inclui `check-b3po-types`. Na rodada 83 commitei com o typecheck do
renderer quebrado e o gate passou. Corrigido na 84; registrado aqui porque é uma lacuna de **processo**,
não de código.

## O que **não** foi auditado

- CSRF/SSRF: o app não expõe servidor HTTP além do webhook (que é GET/POST sem sessão).
- Path traversal nos canais de arquivo (`fs-ipc`, `terminal-ipc`): não revisados neste ciclo.
- LGPD: não há tela de consentimento nem exportação/eliminação de dados pessoais.
- Uploads: o domínio de documentos **não recebe binário** (decisão da r73), então não há superfície.

Marcar o critério `segurança` como cumprido sem tratar o achado 1 seria falso. Ele está **parcial**.

---

## Achado 1 — FECHADO (rodadas 86 a 89)

### O que foi feito

`serverTenant()` em `server-tenant.ts` devolve o tenant da **instalação** e descarta o que veio do
renderer. Os sete canais passaram a usá-la:

| Rodada | Arquivo | Chamadas |
|---|---|---|
| 86 | `documents-ipc.ts` | 2 |
| 88 | `finance-ipc.ts` | 3 |
| 88 | `inventory-ipc.ts` | 2 |
| 89 | `sales-ipc.ts` | 2 |
| 89 | `purchases-ipc.ts` | 2 |
| 89 | `catalog-ipc.ts` | 2 |
| 89 | `scheduling-ipc.ts` | 4 |

Medido depois: **0 chamadas** com tenant vindo do renderer em `*-ipc.ts`.

### A prova

`server-tenant.test.ts` e `server-tenant-2.test.ts` instanciam o store real, gravam dados em
`empresa_b` e chamam o canal pedindo `empresa_b`:

- documentos: `segredo-b.pdf` não aparece;
- financeiro: lançamentos de B ausentes, `openPayableCents` de B = 0;
- estoque: saldo de B ausente, movimentações de B vazias.

**58 testes de IPC, 0 falhas.**

### Três testes que codificavam o bug

O defeito tinha testes que o afirmavam como comportamento correto — e um teste que protege o defeito é
pior que nenhum:

| Arquivo | Afirmava | Agora afirma |
|---|---|---|
| `documents-ipc.test.ts` | *"list repassa o tenant pedido"* | o canal usa o tenant do servidor |
| `catalog-ipc.test.ts` | *"filtra a listagem pelo tenant informado"* | o canal ignora o pedido |
| `server-tenant-2.test.ts` (meu) | formato `{ totals }` errado | corrigido |

### Duas correções de medição antes de qualquer código

| Rodada | O que eu afirmei | Realidade |
|---|---|---|
| 85 | "20 canais com IDOR" | grep largo demais |
| 87 | "os 4 do CRM têm IDOR" | não têm — `list()` deles não recebe tenant |

O achado era real; **o meu inventário dele não era**. Corrigir a medição antes de corrigir 20 arquivos
economizou trabalho em 13 que não precisavam de nada.

## O que continua aberto em segurança

| Item | Estado |
|---|---|
| LGPD | sem consentimento, exportação ou eliminação de dados pessoais |
| `fs-ipc` / `terminal-ipc` | path traversal não revisado neste ciclo |
| Assinatura de código | sem certificado — `BLOCKED_BY_EXTERNAL_DEPENDENCY` |

`segurança` permanece **PARCIAL**: o IDOR saiu, os itens acima não entraram.
