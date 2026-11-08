# GOAL V2 — RODADA 70: RATE LIMITING — E A PERGUNTA QUE O §19 NÃO RESPONDE

**Data**: 05/11/2026 · **§19** · o último item concreto

---

## A PERGUNTA

> O §19 lista `rate limiting` e **não diz qual é o limite** — porque não existe número certo em abstrato.

---

## O NÚMERO — e por que ele é este

**20 faturamentos por minuto, por ator.**

| Referência | Ritmo |
|---|---|
| **Uma pessoa digitando** uma venda | **~30 segundos** (produto, quantidade, cliente) → **2 por minuto** |
| **O limite** | **20 por minuto** — **10× o ritmo humano** |
| **Um renderer comprometido** | **milhares por segundo** |

> **O limite não é sobre velocidade: é sobre a diferença entre uma pessoa e um laço.**
>
> **20 corta o abuso na primeira fração de segundo e não atrapalha ninguém que esteja trabalhando.**

---

## AS TRÊS DECISÕES DE DESENHO

### 1. Janela **deslizante**, não fixa

> Uma janela fixa permitiria **20 no fim de um minuto e 20 no começo do seguinte — 40 de uma vez**, que é exatamente a rajada que o limite existe para conter.

### 2. `consultar` **não gasta cota**; `registrar` gasta

> Um handler que recusa por **outro motivo** (permissão, validação) **não deve consumir o direito de uma chamada legítima** — senão **cinco erros de digitação bloqueariam a venda real**.

### 3. Depois da permissão, não antes

> **Quem não pode faturar não deve descobrir que "faltou cota"** — isso **sugeriria esperar**, quando o problema é **não ter permissão**.

---

## O ESTADO EM MEMÓRIA — e ele é **honesto** sobre isso

Reiniciar o app **zera o contador**.

> **É suficiente**: o abuso que ele barra é **um laço no renderer** — e **um laço não sobrevive a um reinício**.
>
> **Persistir o contador seria pior**: um arquivo que cresce com cada chamada, **para proteger contra algo que já teria terminado** quando o app reabrisse.

---

## O QUE ELE **NÃO** PROTEGE — e está escrito no código

| Não protege | Por quê |
|---|---|
| vários processos com o mesmo ator | **cada um tem o seu contador** |
| abuso lento (19/min para sempre) | **é uso, não ataque** |
| ator diferente a cada chamada | **exigiria outra camada**: criação de ator |

---

## A PROVA — 12 testes

| Grupo | O que trava |
|---|---|
| **o número** | **20/min — 10× o humano** |
| **a janela** | permite até o limite · **a N+1 recusa e diz quanto esperar** |
| | **deslizante: 40 de uma vez é recusado** · passada a janela, a cota volta |
| | atores diferentes têm cotas independentes |
| **consultar não gasta** | **5 tentativas malformadas não bloqueiam a legítima** |
| **a recusa não conta** | insistir não piora a espera |
| **o limitador por processo** | mesmo nome, mesma instância |
| **a mensagem** | **diz quanto esperar**, não só que falhou |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~150** |
| Testes | **12** |
| Regressão (sales + rate-limit) | **93 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §19 — ONDE FICOU

| Item | Estado |
|---|---|
| níveis · RBAC · tenant · Sofia · não-promoção | ✅ |
| ações sensíveis (campanha, publicação, preço) | ✅ r66 |
| **replay de webhook** | ✅ r68 + r69 |
| **rate limiting** | ✅ **r70** |
| XSS no renderer | ❌ não auditado |
| `npm audit` | ❌ não rodado |

> **Dois itens da lista do §19 continuam abertos** — e os dois são **auditoria**, não implementação.

---

## O QUE FALTA LIGAR

> **O limitador existe e está ligado em `sales:faturar`.** Outros canais caros — `compras:receive`, `marketing:createCampaign` — **não têm limite**.

**63 canais sem rate limiting, 1 com.** E isso é **honesto**: o limite foi posto onde o dano é **estoque e dinheiro**, e os outros serão postos **quando houver razão medida** — não por simetria.

---

## PRÓXIMA RODADA

**Estender o limite aos canais que movem dinheiro** — `purchases:receive` e `finance:settle`.

> **70 rodadas.** O rate limiting saiu da lista do §19 e virou **20 por minuto** — e a decisão que o define é **qual erro é pior**: bloquear uma pessoa trabalhando, ou deixar um laço faturar mil vezes.
