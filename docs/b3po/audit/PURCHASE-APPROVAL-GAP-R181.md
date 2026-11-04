# Requisito §15 do GOAL ausente: compra não tem limite nem aprovação (rodada 181)

## O que o GOAL pede

> **§15 Compras e fornecedores:** *"Compras acima dos limites exigem aprovação."*

## O que o código tem

**Nada.** Três buscas independentes, todas vazias:

```
padrões "limite_de_compra|compra.*limite|purchase.*limit|spend.*limit" em electron/*.ts  → 0 ocorrências
padrões "aprova|approv" em purchases-ipc.ts e companies-store.ts                          → 0 ocorrências
padrões "aprov|limite" em src/app/compras/*.tsx                                           → 0 ocorrências
```

**Um recebimento de compra de qualquer valor é aplicado sem revisão.**

## O que existe, e por que não serve

Há um módulo de aprovação — `agent-approval.ts` — mas ele aprova **ações de agente**, não **compras**:

```ts
export function precisaAprovacao(teto: Nivel | null, nivelPedido: Nivel): boolean
export type MotivoRecusa = 'ja_decidida' | 'mesmo_autor' | 'motivo_curto'
```

Ele responde *"este agente pode executar esta ação neste domínio?"*. **Não responde** *"esta compra de R$ 40.000
precisa de assinatura antes de entrar no estoque?"*.

São perguntas diferentes: uma é **autorização de ator**, a outra é **controle de valor**. Reaproveitar o
`agent-approval` para as duas seria o tipo de "consolidação" que a r150 mostrou ser errada.

## A consequência, em uma frase

**Um pedido de R$ 500.000 pode ser recebido por qualquer pessoa com permissão de compras, sem que ninguém
revise.** O estoque sobe e a conta a pagar nasce — os dois efeitos que a r179 provou funcionarem — e nenhum
deles passa por um limite.

## Como isso sobreviveu 181 rodadas

Porque eu nunca tinha auditado **este requisito específico**. A faixa de compras (101–120) construiu cadastro,
pedido, recebimento, custos e contas a pagar — e o item *"aprovações"* da lista do §15 **não foi lido como
requisito**, foi lido como palavra.

**É o mesmo padrão da r156** (o comentário que afirmava proteção inexistente): o defeito não estava onde eu
olhava, e sim no que eu **deixei de verificar** porque supus que existia.

## Classificação

| Item | Estado |
|---|---|
| Cadastro de fornecedor | `VALIDATED` |
| Cotação | `NOT_IMPLEMENTED` |
| Pedido | `VALIDATED` |
| Recebimento | `VALIDATED` (r175, r179) |
| Conferência | `PARTIAL` |
| Custos | `VALIDATED` |
| Contas a pagar | `VALIDATED` |
| **Aprovações** | **`NOT_IMPLEMENTED`** |
| Histórico | `PARTIAL` |

## O que seria preciso, e por que não fiz agora

Um limite de compra precisa de:

1. **onde o limite mora** — por empresa, por usuário, por categoria de produto, ou por centro de custo;
2. **quem aprova** — o dono, um gestor, ou qualquer pessoa diferente do solicitante;
3. **o que acontece entre pedir e receber** — um estado `aguardando_aprovacao` que hoje **não existe** (os
   estados são orçamento → pedido → recebido);
4. **o que a tela mostra** enquanto isso.

Isso é **decisão de produto**, não implementação mecânica: um limite único global seria pior que nenhum,
porque daria a impressão de controle. **Registrado como lacuna declarada**, com as quatro perguntas abertas,
em vez de um número inventado por mim.

## Medido

| Medida | Valor |
|---|---|
| Requisitos do §15 auditados | **9** |
| Ausentes | **2** (cotação, aprovação) |
| Padrões de busca que confirmaram a ausência | **3** |
| Linhas de código de aprovação de compra | **0** |
| Compras que passam por limite hoje | **nenhuma** |
