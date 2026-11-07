# GOAL V2 — RODADA 28: OS DOIS BOTÕES

**Data**: 05/11/2026 · **§14 — Compras** · fecha a lacuna de UI

---

## O QUE FALTAVA, SEGUNDO A r27

> *"O backend está completo: limite lido, limite gravado, aprovação decidida, recusas nomeadas. A tela continua sem nenhum dos dois botões."*

**Esta rodada fechou os dois.**

---

## O QUE FOI CONSTRUÍDO

### 1. Painel de limite — configurável pela tela

```
Limite de compra                            sem limite
Pedido acima do limite exige aprovação de alguém da lista.
Sem valor, o controle fica desligado.

[ Valor (R$)          ] [ Aprovadores (ids separados por vírgula) ]
[ Salvar limite ] [ Desligar limite ]
```

**O texto do campo vazio é a decisão**: `placeholder="vazio = desligado"`. **Não existe "limite zero"** — o store recusa (`limite_invalido`), e a tela diz o que fazer.

### 2. Botão "Aprovar" no pedido

Aparece **só quando** o pedido é candidato: `status === 'pedido'` **e** existe limite configurado.

> **Um botão que aparece em pedido já recebido convida a clicar e receber uma recusa.** Esconder a condição que não se aplica é mais honesto que mostrar e negar.

### 3. As recusas traduzidas

```ts
export const APROVACAO_ERRO: Record<string, string> = {
  mesmo_solicitante: 'Quem pediu não pode aprovar o próprio pedido. Peça a outra pessoa.',
  nao_e_aprovador: 'Você não está na lista de aprovadores deste limite.',
  compra_nao_precisa: 'Este pedido está abaixo do limite — não precisa de aprovação.',
  pedido_ja_recebido: 'Este pedido já foi recebido; aprovação é para antes do recebimento.',
  ...
}
```

> **`mesmo_solicitante` não é um erro técnico** — é uma situação que tem **saída**: pedir a outra pessoa. A mensagem diz qual.

---

## A DECISÃO QUE A r27 PREVIU, TOMADA

A r27 perguntou: *"o canal aceita qualquer string — a tela escolhe **entre os atores que existem**, ou aceita texto livre?"*

**A tela aceita texto livre**, com os aprovadores atuais como `placeholder`.

**Por que não uma lista fechada agora**: `admin.actors()` existe e devolveria os atores reais — mas o limite aceita **ids de ator**, e nem todo aprovador precisa ser um ator do sistema (um contador externo, por exemplo). **Fechar a lista agora inventaria uma regra** que o §14 não pede.

**O que fica registrado como lacuna**: a tela **não valida** que o id existe. Digitar `chefe` quando não há ninguém com esse id faz o limite **nunca aprovar** — e o erro só aparece quando alguém tenta. **Validação contra `admin.actors()` é o próximo passo real.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Tela de compras | **371 → 487 linhas** |
| Funções novas no wrapper | **3** (`lerLimite`, `definirLimite`, `aprovarPedido`) |
| Canais no preload | **3** novos |
| Mensagens de recusa traduzidas | **6** |
| Suíte de compras | **88 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## AS QUATRO CAMADAS, COMPLETAS

| Camada | Estado |
|---|---|
| 1. Regra | `purchase-approval.ts` — desde a r182 |
| 2. Canal | `purchases:aprovar` / `:limite` / `:definirLimite` — r26/r27 |
| 3. Preload | `hermesDesktop.purchases.*` — r28 |
| 4. Wrapper | `src/api/purchases.ts` — r28 |
| 5. Tela | painel + botão — r28 |

> **É a primeira vez no projeto que as cinco camadas estão completas para uma capacidade de negócio.** A r2 mediu que cada uma pode faltar sem quebrar nada — e este módulo passou por todas as falhas: capacidade sem porta (r25), porta sem botão (r26–27), e agora **as duas**.

---

## O QUE AINDA FALTA EM COMPRAS

| Lacuna | Por quê |
|---|---|
| **Validar aprovadores contra atores reais** | exige decidir se aprovador pode ser externo ao sistema |
| Cotação persistir | o `quotation-store` existe; a tela compara ao vivo |
| Conferência no recebimento | entrada gerada do pedido, sem checar recebido vs. pedido |
| Teste de UI da tela | a tela não tem teste próprio — só o typecheck a cobre |

---

## PRÓXIMA RODADA

**Validar os aprovadores contra os atores reais.** É a lacuna que **transforma um limite configurado em um limite que nunca aprova** — e a que o próprio comentário da tela já antecipa.

O dado existe (`admin.actors()`); falta a ligação.
