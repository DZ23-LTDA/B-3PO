# GOAL V2 — RODADA 11: FONTES DE VERDADE — UM BUG REAL ENCONTRADO

**Data**: 05/11/2026 · **Fase 3 — fontes de verdade**

---

## O MAPA DOS 26 STORES

| Caminho | Stores |
|---|---|
| `userData/b3po/*.json` | **24** |
| `userData/*.json` | **2** — `crm-conversations` e `native-token` |

**Nenhum arquivo é compartilhado por dois stores.** Cada domínio tem seu dono. Isso está correto.

## O BUG

`crm-conversations-store.ts`:

```ts
export function conversationsStorePath(userDataDir: string): string {
  return join(userDataDir, 'crm-conversations.json')   // ← um nível ACIMA
}
```

**Os outros 24 stores gravam em `userData/b3po/`.**

### Por que não é cosmético

`b3po/` é a pasta que o produto documenta como **seu estado**. Quem fizesse backup dela — ou movesse a instalação — **perderia todas as conversas do WhatsApp**, sem nenhum aviso. O CRM abriria vazio e o usuário concluiria que as conversas sumiram.

**`native-token` também está fora**, mas por motivo diferente: é o blob do `safeStorage`, que o Electron gerencia no próprio `userData`. Não foi tocado.

---

## A CORREÇÃO — com migração, não só com caminho novo

Mudar o caminho sem migrar trocaria **um bug por outro pior**: arquivo no lugar errado → histórico que some de repente.

```ts
export function conversationsStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'crm-conversations.json')
}

export function migrarConversasAntigas(userDataDir: string): boolean { ... }
```

### Quatro decisões dentro da migração

| Decisão | Por quê |
|---|---|
| **Síncrona** | `mountErpIpc` é síncrono e o store é construído logo depois. Uma versão `async` abriria uma janela em que o store lê o caminho novo **antes** de o arquivo ser movido — o CRM abriria vazio |
| **Não sobrescreve** | se o novo já existe, ele é a verdade; o antigo fica para inspeção |
| **Nunca lança** | um erro de arquivo legado não pode derrubar a abertura do CRM |
| **Roda antes de qualquer store abrir** | `migrarConversasAntigas(userDataDir)` é a primeira linha da montagem do CRM |

---

## A PROVA — 7 testes, 4 provados vermelhos

| Estado | Resultado |
|---|---|
| **Com a correção** | **7 de 7 passam** |
| **Sem a correção** (caminho antigo) | **4 de 7 falham** |

```
× grava DENTRO de b3po/, como os outros stores
× o caminho NAO e mais a raiz de userData
× instalação nova: nada a migrar, devolve false
× arquivo antigo na raiz: move para b3po/ e devolve true
```

### Os testes que mais importam

**"arquivo antigo na raiz: move para b3po/ e devolve true"** — verifica que o **conteúdo chega inteiro** ao destino (`JSON.parse` do arquivo movido) e que o antigo **deixa de existir**. Não é só "a função retornou true".

**"não sobrescreve quando o novo já existe"** — coloca `['velho']` no antigo e `['novo']` no novo, e prova que o novo venceu. **A migração não pode destruir dados que o produto já escreveu.**

**"não lança quando não consegue mover"** — ocupa `b3po` com um **arquivo** em vez de diretório, forçando `mkdirSync` a falhar. A migração engole o erro e o boot continua.

**"roda duas vezes sem efeito na segunda"** — idempotência: a primeira move, a segunda devolve `false`.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Stores mapeados | **26** |
| Arquivos compartilhados entre stores | **0** |
| Stores fora de `b3po/` | **1** corrigido (`crm-conversations`) + 1 justificado (`native-token`) |
| Testes novos | **7** — **4 vermelhos sem a correção** |
| Regressão (crm + conversations + privacy + erp + permissão) | **232 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O PADRÃO QUE ESTA RODADA CONFIRMA

Duas rodadas seguidas encontrando o mesmo tipo de problema:

| Rodada | O que parecia | O que era |
|---|---|---|
| r10 | "um segundo CRM" | uma biblioteca mal nomeada |
| r11 | "todos os stores gravam em `b3po/`" | **24 de 26** — e o 25º guardava as conversas |

> **A auditoria de fonte de verdade não é formalidade.** Ela encontra coisas que nenhum teste de domínio encontra, porque **o teste testa o que o código faz — não onde o código mora**.

---

## PRÓXIMA RODADA

Fase 3 continua. O que ainda não foi respondido:

1. **Sobreposição de campos entre domínios** — `finance` guarda `customer`? `sales` guarda `total` que `finance` recalcula? Um campo em dois lugares é uma fonte de verdade duplicada mesmo com arquivos separados.
2. **O `ref` cross-domain** — `venda:<id>`, `compra:<id>`, `inventario:<id>:<sku>` — funcionam como contrato, ou são strings soltas?
