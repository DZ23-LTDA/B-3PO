# Auditoria de requisitos em escala — e por que 36 "presentes" não são 36 funcionalidades (rodada 183)

## O método

A r181 achou um requisito ausente (§15 aprovação de compra) auditando **frase por frase** em vez de
funcionalidade por funcionalidade. Esta rodada automatizou isso: **40 frases do GOAL** traduzidas para padrões
de busca, varridas em `electron/`, `src/app/` e `src/api/`.

## O resultado bruto

```
presentes: 36
ausentes:   4
```

| § | Ausente |
|---|---|
| 14 | **inventários** |
| 18 | **centro de custo** |
| 19 | **offboarding** |
| 19 | **treinamentos** |

## A verificação que derrubou o resultado bruto

Fui conferir três dos "presentes". **Dois eram falsos positivos.**

| Requisito | Script disse | Verificação direta |
|---|---|---|
| §15 cotação | **presente** | **não existe** — o regex `cotacao\|quotation\|quote` casou com `quote` de outro contexto |
| §18 centro de custo | **ausente** | **ausente** — confirmado (`cost_center`/`categoria` não aparece em `finance-store`) |
| §12 consentimento | **presente** | **só em `privacy.ts`**, **não no CRM** — presença genérica, não do domínio |

**36 "presentes" é o número de vezes que uma palavra apareceu — não o número de funcionalidades que
existem.**

## O que este exercício prova

**Um grep não audita um requisito.** Ele responde *"esta palavra aparece?"*. O GOAL pede *"o produto faz
isto?"*.

Entre as duas perguntas há uma distância que três rodadas desta sessão já mostraram:

| R | O instrumento | O que ele mediu de errado |
|---|---|---|
| 165 | rota `/vendas` inexistente | "metade do ERP não tem h1" |
| 177 | contador de `<tr>` numa lista de divs | "o item não foi adicionado" |
| **183** | regex de palavra | **"cotação existe"** |

**A quarta vez.** O padrão é consistente: **o instrumento é a parte frágil**, e o custo de confiar nele é uma
afirmação falsa em um relatório.

## O que continua válido

**As 4 ausências confirmadas por verificação direta**, não pelo script:

| § | Requisito | Estado |
|---|---|---|
| 14 | inventários | `NOT_IMPLEMENTED` |
| 18 | centro de custo | `NOT_IMPLEMENTED` |
| 19 | offboarding | `NOT_IMPLEMENTED` |
| 19 | treinamentos | `NOT_IMPLEMENTED` |
| 15 | cotação | `NOT_IMPLEMENTED` (confirmado à mão) |
| 12 | consentimento **no CRM** | `NOT_IMPLEMENTED` (existe em `privacy.ts`, não no contato) |

**6 requisitos ausentes**, todos confirmados por leitura do código, não por regex.

## O que o relatório NÃO afirma

**Não afirma que os outros 30 "presentes" existem.** Afirma que **a palavra aparece** — e que **3 de 3
verificados à mão** precisaram de correção (2 falsos positivos, 1 parcial).

Se a taxa de erro se mantiver, o número real de ausentes é **maior que 6**. **Não sei quanto**, e prefiro
dizer isso a estimar.

## O que a próxima rodada deve fazer

Trocar o regex por **uma pergunta de comportamento por requisito**: *"se eu pedir isto ao produto, o que
acontece?"* — que é o que a r172 fez com a venda e a r179 com a compra.

**Auditar requisito por requisito, com o produto rodando, não com grep.**

## Medido

| Medida | Valor |
|---|---|
| Frases do GOAL traduzidas para padrão de busca | **40** |
| "Presentes" pelo script | **36** |
| Ausentes pelo script | **4** |
| Verificados à mão | **3** |
| **Falsos positivos entre os verificados** | **2** |
| Ausências confirmadas à mão | **6** |
| Requisitos com estado honesto | **6 de 40** |
| **Instrumento desta rodada** | **não confiável** — registrado em vez de publicado como resultado |
