# §14 — COMPRAS: AUDITORIA (não modelo novo)

**Rodada**: 25 · **Data**: 05/11/2026
**Instrução do §14**: *"Isso deve ser reexecutado e confirmado, não presumido."*

---

## 1. REEXECUTADO — os números do R256

```
✓ electron/purchases-analytics.test.ts   (9 tests)
✓ electron/purchases-store.test.ts      (11 tests)
✓ electron/purchases-ipc.test.ts         (6 tests)
✓ electron/purchases-finance.test.ts     (7 tests)
Tests  33 passed (33)
```

**Confirmado: 33 verdes.**

### Correção de leitura

O R256 diz *"33 testes na suite de purchases **e** 7 testes de efeito cruzado"*. **São os mesmos.**

Os 7 de efeito cruzado estão **dentro** de `purchases-finance.test.ts`, que é um dos quatro arquivos dos 33. **Não são 40** — são **33**, sendo 7 deles de efeito cruzado.

> **Uma leitura apressada transformaria 33 em 40** e inflaria a cobertura em 21%. A diferença importa quando alguém pergunta "quantos testes cobrem a integração?".

---

## 2. A INTEGRAÇÃO — confirmada no código, não só no teste

`purchases-ipc.ts`, no recebimento:

```ts
if (deps.limiteDeCompra) {
  const limite = await deps.limiteDeCompra()
  const total = normalizado.order.items.reduce(...)
  const situacao = situacaoDaCompra(total, limite)

  if (situacao.precisa) return { error: 'aprovacao_necessaria' }   // ← recusa ANTES de gravar
}

const salvo = await deps.store.saveOrder({ ...payload, status: 'recebido' })
...
for (const movimento of stockMovementsFor(salvo.order)) {
  const entrada = await deps.inventory.append(movimento)           // ← estoque
}

// e o financeiro recebe a conta a pagar
```

> **A ordem é a correta**: limite → gravar → estoque → financeiro. Recusar **antes** de gravar impede que um pedido acima do teto **vire estoque** e só depois alguém descubra que precisava de assinatura.

---

## 3. A TELA — o que o §14 chama de "simplificada", auditado

`src/app/compras/index.tsx` — **371 linhas**. Dois blocos: fornecedor e pedido.

### O que **existe**

| Elemento | Estado |
|---|---|
| Cadastro de fornecedor (nome, CNPJ) | ✅ |
| Seleção de produto, quantidade, custo | ✅ |
| **Cotação** (`CotacaoPanel`) | ✅ **existe** |
| Receber pedido → estoque + financeiro | ✅ |
| Recusa por limite (`aprovacao_necessaria`) | ✅ no backend |

### O que **não** existe

| Lacuna | Consequência |
|---|---|
| **Tela para configurar o limite de compra** | `limiteDeCompra` é **injetado** na montagem; o dono não tem onde defini-lo. Sem ele, `SEM_LIMITE` — e **nada é controlado** |
| **Fluxo de aprovação** | a recusa `aprovacao_necessaria` **não tem como ser resolvida**: não há canal nem tela para aprovar |
| **Conferência no recebimento** | o §14 pede; a entrada é gerada do pedido, sem checagem de quantidade recebida vs. pedida |

### A cotação: existe, mas não persiste

O comentário na tela diz, literalmente: *"Cotação: compara fornecedores para o volume do pedido. **Não salva e não cria**."*

**É comparação ao vivo, não registro.** Quem comparou dois fornecedores ontem **não tem histórico**. E o §14 lista `suppliers` e a matriz de comparação como **modelo a validar** — o `quotation-store` existe (181 linhas, com teste), mas a tela **não grava** nele.

> **Mesmo padrão das rodadas 3–8**: a capacidade está no backend, a porta não está aberta.

---

## 4. A LACUNA MAIS GRAVE DAS TRÊS

**A recusa `aprovacao_necessaria` é um beco sem saída.**

```
limite configurado → pedido acima do teto → { error: 'aprovacao_necessaria' }
                                            ↓
                                    ninguém pode aprovar
```

**Hoje**, com um limite configurado, **todo pedido acima do teto fica permanentemente bloqueado**. Não há como aprovar, não há como elevar o limite pela interface, e não há como registrar a decisão de quem liberou.

**E existe um `agent-approval-store`** (aprovadores, fila) — que é usado pelos **agentes**, não pelas compras. Ligar os dois é a correção óbvia, mas é **uma rodada de trabalho** e exige decidir **quem aprova compra**: o dono? um `manager`? o mesmo fluxo dos agentes?

> **A pergunta não é técnica**: `aprovadores: []` em `SEM_LIMITE` mostra que o modelo **prevê mais de um aprovador**. Quem são, e em que ordem, é decisão de negócio.

---

## 5. O QUE ESTA AUDITORIA NÃO FEZ, E POR QUÊ

| Item | Por quê |
|---|---|
| Criar modelo novo de compras | **o §14 manda auditar antes**, e o modelo atual funciona nos 33 testes |
| Ligar aprovação ao `agent-approval` | exige **decisão de quem aprova** — não invento política de alçada |
| Fazer a cotação persistir | mudaria o fluxo da tela; precisa de decisão de UX |
| Adicionar conferência no recebimento | é funcionalidade nova, e o §14 diz **"validar, não criar cegamente"** |

---

## 6. O VEREDITO

| Afirmação do R256 | Veredito |
|---|---|
| "persistência em JSON real" | ✅ **confirmado** — 26 stores, padrão atômico |
| "fila serializada" | ✅ **confirmado** |
| "integração recebimento → estoque + contas a pagar" | ✅ **confirmado no código e nos testes** |
| "33 testes" | ✅ **confirmado** (e os "7 de efeito cruzado" **estão dentro** dos 33) |
| "a tela é simplificada" | ⚠️ **parcialmente verdade** — tem cotação e recebimento, mas **não tem** configuração de limite, fluxo de aprovação nem conferência |

**Compras funciona no que promete. O que ele não promete — e devia — é o caminho de saída para um pedido barrado por limite.**

---

## 7. PRÓXIMA RODADA — a mais provável

**Fechar o beco sem saída da aprovação.** É a única das três lacunas que **transforma uma recusa correta em bloqueio permanente**, e existe infraestrutura pronta (`agent-approval-store`) para receber a ligação.

A decisão que preciso tomar antes, com evidência: **quem aprova compra no B-3PO hoje**, pelo modelo de `purchases-approval` → `LimiteDeCompra.aprovadores`.

Se o modelo já prevê uma lista, a política está desenhada — falta a porta.
