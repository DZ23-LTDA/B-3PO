# GOAL V2 — RODADA 53: A SEGREGAÇÃO — E A REGRA QUE NÃO DEVE SER IMPOSTA

**Data**: 05/11/2026 · **§15** — o décimo item

---

## A REGRA

> O §15 pede **segregação de funções**. Aplicada ao recebimento: **quem aprovou não recebe**.

---

## A DECISÃO QUE IMPORTA — e ela é de produto

**Ligada, essa regra quebraria o caso comum.**

> Um dono de instalação pequena **é** as três pessoas: **pede, aprova e recebe**.
>
> **Ligar por padrão faria o produto recusar o caso comum para atender o raro** — e o dono teria de **descobrir a configuração** para voltar a trabalhar.

**Então é opcional:**

```ts
exige_segregacao?: boolean    // ausente = sem regra
```

> **Quem tem separação de funções liga; quem não tem, não é punido.**

### E a função devolve `null` quando não há regra

```ts
segregaçãoPermite({ aprovador, exige_segregacao?, recebedor }) → null | { erro } | { ok: true }
```

> **`null` não é `true`.** *"Não há regra"* e *"pode"* são coisas diferentes — e uma função que respondesse `true` sem configuração **esconderia que a pergunta nunca foi feita**.

---

## A PROVA — 4 testes

| Teste | O que trava |
|---|---|
| **desligada: `null`, não `true`** | a diferença entre "não há regra" e "pode" |
| **ligada: quem aprovou não recebe** | `aprovador_nao_recebe` |
| ligada: outra pessoa recebe | o caso feliz |
| **ligada, mas sem aprovador registrado** | o pedido **nunca passou por assinatura** — não há dois papéis para separar |

---

## O GATE PEGOU DE NOVO — e o número era o mesmo

`registerPurchasesIpc` chegou a **CC 24** (o teto é **20**).

**Extraí `podeReceber`** — a função responde três perguntas, na **ordem em que importam**:

```
1. O pedido está APROVADO? A aprovação vale para ESTE valor?      (r51)
2. Quem aprovou pode RECEBER?                                     (r53, só se a empresa separa)
3. Se não está aprovado, o valor passa do limite?                 (r26)
```

> **É a segunda vez em duas rodadas que o gate me obriga a separar responsabilidades** — e **as duas estavam misturadas por acúmulo**, não por desenho.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes novos | **4** |
| Regressão | **186 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §15 — FECHADO

| Item | Estado |
|---|---|
| identidade do ator | ✅ |
| organização/tenant | ✅ |
| permissão explícita | ✅ |
| recurso e estado | ✅ |
| limite financeiro | ✅ |
| alçada de aprovação | ✅ r52 |
| **segregação de funções** | ✅ **r53 (opcional)** |
| validade da aprovação | ✅ r51 |
| idempotência | ✅ |
| trilha de auditoria | ✅ |

**10 de 10.**

> **Isso não significa que o produto está pronto** — significa que **o §15 está atendido**. O que resta do GOAL é P5–P7 (§16–§18), que **dependem de credencial** ou **de um vertical real**.

---

## O QUE O §15 ENSINOU

| Rodada | O que o gate/código me mostrou |
|---|---|
| r51 | `approval` **nunca era persistido** — a assinatura vivia só no retorno |
| r51 | `normalizePurchase` estourou **CC 20** → extraí `montarPedido` |
| r53 | `registerPurchasesIpc` estourou **CC 24** → extraí `podeReceber` |

> **O gate não é burocracia**: ele **obrigou a separar validação de montagem** e **verificação de recebimento** — e as duas extrações **deixaram o código mais fácil de ler**, não mais difícil.

---

## PRÓXIMA RODADA

**§16 — Spikes de viabilidade externa** (marketplace, WhatsApp, pagamento).

O §16 diz: *"Sem credenciais: `BLOCKED_BY_EXTERNAL_DEPENDENCY`; continuar outras tarefas."*

> **Vou verificar se há credencial. Se não houver, o §16 é das poucas coisas que o GOAL me autoriza a declarar bloqueada** — e o trabalho segue para o §17 (business core / primeiro vertical).
