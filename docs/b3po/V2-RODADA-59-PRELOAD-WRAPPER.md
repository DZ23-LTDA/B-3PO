# GOAL V2 — RODADA 59: PRELOAD E WRAPPER — A TELA RECUSADA

**Data**: 05/11/2026 · **§17 — logística** · rodada 4

---

## O QUE FOI ENTREGUE

| Camada | Estado |
|---|---|
| 1. Regra | ✅ r56 |
| 2. Store | ✅ r57 |
| 3. Canal | ✅ r58 |
| **4. Preload** | ✅ **r59** |
| **5. Wrapper** | ✅ **r59** |
| 6. Tela | ❌ **revertida** |

---

## O WRAPPER — e as decisões que ele carrega

### `entregaDoPedido` responde `null`, não `{ error }`

> *"Não tem entrega"* é **resposta, não falha** — coerente com o canal (r58).

### `transitarEntrega` só manda `recebedor` **quando há**

```ts
if (recebedor && recebedor.trim()) payload['recebedor'] = recebedor.trim()
```

> **Enviá-lo vazio para `em_rota` apagaria a assunção do ator** no processo principal — e `em_rota` **precisa** de entregador.

### `STATUS_LABEL` — e por que não é o código cru

```ts
em_rota: 'em rota'    // ← não é "pendente"
pendente: 'a sair'
```

> **Uma está parada no depósito e a outra está na rua.** Mostrar o código cru obrigaria quem lê a traduzir — **e a tela existe para não exigir isso**.

### `ENTREGA_ERRO` diz o que fazer

| Código | Mensagem |
|---|---|
| `comprovante_obrigatorio` | *"Informe quem recebeu a mercadoria. **Sem isso não há comprovante.**"* |
| `entrega_ja_finalizada` | *"Entregue ou recusada não volta."* |

---

## A TELA — TENTADA E REVERTIDA

**Duas tentativas de inserir a seção em `sales/index.tsx`.** A segunda colocou o bloco **no `return (` interno** do componente (o arquivo tem **mais de um** `return (`), produzindo **14 erros de sintaxe**.

**Revertida** com um comando. `sales/index.tsx` voltou a **374 linhas, 0 erros**.

> **É a nona vez nesta sessão que uma edição por script corrompe um arquivo.**
>
> **E a lição evoluiu**: as primeiras eram `\r` comendo caracteres; esta foi **um padrão de âncora que casou no lugar errado** — `return (` aparece duas vezes, e o script pegou a primeira.
>
> **O typecheck pegou em 3 segundos** e reverter custou um comando. **O custo foi minutos, não um commit quebrado.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais no preload | **4** |
| Funções no wrapper | **7** |
| Recusas traduzidas | **8** |
| Testes da logística | **49** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Arquivos corrompidos | **1** (revertido) |

---

## ONDE A LOGÍSTICA ESTÁ

> **5 de 6 camadas.** Falta **a tela** — e ela é a que o usuário toca.

---

## E O §17 — o vertical

| Etapa da distribuidora de gás | Estado |
|---|---|
| pedido · estoque · financeiro | ✅ |
| **entrega** | ⚠️ **5 de 6**, falta a tela |
| comprovante | ✅ persistido |

---

## PRÓXIMA RODADA

**A tela — com `edit`**, e **uma âncora que só apareça uma vez**:

> Em vez de inserir no meio de `sales/index.tsx`, o caminho mais seguro é **uma tela própria** (`src/app/entregas/`), com as **5 registrations** que a r21 mapeou: constante de rota, `AppView`, `AppRouteId`, `APP_ROUTES`, `<Route>`+lazy, e a contribuição de sidebar.
>
> **Uma tela nova é mais trabalho, e é menos arriscada que editar uma existente de 374 linhas** — e o arquivo novo não tem `return (` ambíguo.
