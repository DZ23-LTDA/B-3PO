# GOAL V2 — RODADA 46: O BOTÃO QUE FALTAVA

**Data**: 05/11/2026 · **§14 — Compras** · fecha a última porta não usada

---

## O QUE A r45 NOMEOU

> *"O botão 'Atender' não escolhe fornecedor — a tela ainda chama `mudarSolicitacao`; o canal novo existe e o botão não o chama."*

**Esta rodada fechou.**

---

## O ANTES E O DEPOIS

### Antes

```
A-001 · 30 un — acabou no depósito    [Atender] [Cancelar]
                                          ↓
                              mudarSolicitacao(id, 'atendida')
                                          ↓
                                    status = 'atendida'
                                    ↑ e NENHUM pedido nasceu
```

### Depois

```
A-001 · 30 un — acabou no depósito    [fornecedor… ▾] [Atender] [Cancelar]
                                            ↓
                                  atenderSolicitacao(id, fornecedor)
                                            ↓
                          pedido em rascunho + solicitação atendida
                          com a origem registrada dos dois lados
```

---

## QUATRO DECISÕES

| Decisão | Por quê |
|---|---|
| **O `select` fica na própria linha** | o fornecedor é **daquela solicitação**; um campo global faria atender três solicitações com o mesmo fornecedor sem querer |
| **Botão desabilitado sem fornecedor** | `atenderSolicitacao` recusa `fornecedor_obrigatorio` — **deixar clicar para receber a recusa é pior que impedir** |
| **`mudarSolicitacao` continua existindo** | para **cancelar**. Cancelar não precisa de fornecedor, e é uma decisão diferente de atender |
| **Recarrega `orders` depois de atender** | o pedido **nasceu**; deixar a lista velha faria a pessoa achar que não funcionou |

### O placeholder diz o que falta

```
fornecedor…     ← em vez de "selecione"
```

> **"fornecedor…" nomeia o que a lista contém.** "Selecione" não diz **o quê**.

---

## O ERRO DE EDIÇÃO — oitava vez, e um tipo novo

O script inseriu `atenderComFornecedor` **dentro** de `atender`, porque o padrão casou na **linha de abertura** da função existente.

```ts
const atender = useCallback(async (id, status) => {
  const atenderComFornecedor = useCallback(...)   // ← DENTRO
  setSolErro('')
  ...
```

**Corrigido com um `edit`** que reescreveu os dois blocos na ordem certa.

> **As sete anteriores eram o `\r` comendo caracteres. Esta é diferente**: o script inseriu no lugar **sintaticamente válido** e **logicamente errado** — uma função aninhada compila.
>
> **O typecheck pegou** porque `atenderComFornecedor` era usada **fora** do escopo onde foi declarada.

**É a mesma família da r30** (10 handlers duplicados): **o compilador aceita, o desenho não.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Tela | **677 → 719 linhas** |
| Estado novo | **1** (`solFornecedor`) |
| Função nova | **1** (`atenderComFornecedor`) |
| Testes | **144 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O FLUXO — agora percorrível de ponta a ponta

| # | Etapa | Porta | Alimenta a próxima |
|---|---|---|---|
| 1 | solicitação | ✅ **r43** | ✅ |
| 2 | cotação | ✅ | ✅ |
| 3 | comparação | ✅ | ✅ |
| 4 | aprovação | ✅ r26–r28 | ✅ |
| 5 | **pedido** | ✅ **r46 (botão)** | ✅ |
| 6 | recebimento | ✅ | ✅ |
| 7 | conferência | ✅ r39–r40 | ✅ |
| 8–10 | estoque · financeiro · auditoria | ✅ | — |

> **Pela primeira vez: as 10 etapas existem, têm porta, e a interface liga a primeira ao pedido.**

---

## O QUE **AINDA** NÃO É FLUXO COMPLETO

| Lacuna | Por quê |
|---|---|
| **A cotação não preenche o fornecedor do pedido** | escolher uma proposta de cotação **deveria** pré-selecionar o fornecedor; hoje são dois gestos |
| `receipts` como entidade | a conferência vive no payload |
| Aprovação no meio do fluxo (teste) | o teste 3 da r45 prova a **recusa**; falta o caminho **aprovado** completo |
| Aceitação visual | ninguém **usou** a tela; o typecheck não prova usabilidade |

> **A primeira é o próximo passo natural**: a cotação **já sabe** qual fornecedor venceu. Pedir que a pessoa escolha de novo é a interface **esquecendo o que ela acabou de fazer**.

---

## PRÓXIMA RODADA

**Ligar a cotação ao fornecedor do pedido** — ou, se o desenho resistir, **o caminho aprovado completo** no teste do fluxo.

> **46 rodadas**: o produto tem o fluxo. O que falta é **memória entre as etapas** — a cotação escolhe, e o pedido pergunta de novo.
