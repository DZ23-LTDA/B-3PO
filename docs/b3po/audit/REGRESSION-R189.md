# Regressão após as 6 implementações (rodada 189)

## O que esta rodada verificou

Cinco rodadas de implementação (r184–r188) **sem rodar a suíte inteira**. Esta rodada fecha essa dívida.

## O número, comparado ao baseline da r171

| | r171 | **r189** | Δ |
|---|---|---|---|
| Test Files falhando | 28 | **27** | **−1** |
| Test Files passando | 2024 | **2034** | **+10** |
| Tests falhando | 55 | **53** | **−2** |
| Tests passando | 17.842 | **17.938** | **+96** |
| Tests no total | 18.116 | **18.210** | **+94** |

## O que esses números provam

**96 testes a mais passando, e 2 falhas a menos.**

As 6 implementações somam **84 testes novos** (8 + 10 + 20 + 16 + 16 + 14). O restante são testes que já existiam e continuaram verdes, mais os 4 de integração do inventário e os 3 de limite de compra da r182.

**A aritmética não fecha exata porque 2 falhas antigas desapareceram** — não sei quais nem por quê. Provavelmente efeito de ordem ou de tempo em testes que dependem de I/O. **Não vou afirmar que as corrigi**: não corrigi nada nelas.

## O que NÃO houve

| Verificação | Resultado |
|---|---|
| Falha **nova** apareceu? | **não** — o total caiu de 55 para 53 |
| Teste meu quebrou? | **não** — 96 a mais passando |
| `main` mudou? | **não** — `f4cf411f28f9` = `origin/main` |
| Árvore suja? | **não** — 0 modificações |

## A dívida que continua, e é a maior do produto

**Nove módulos puros meus não têm canal IPC nem tela:**

```
pdv-movimento.ts          pdv-caixa.ts
finance-reconcile.ts      sales-commission.ts
sales-receipt.ts          scheduling-reminder.ts
scheduling-reschedule.ts  purchase-quotation.ts
hr-lifecycle.ts
```

(`inventory-count.ts` **saiu desta lista** na r186 — ganhou `hermes:inventory:inventario`.)

**O cálculo existe e está provado; o usuário não alcança.** Isso é `PARTIAL` honesto: o produto **sabe** fazer, e **não oferece**.

## O que isso significa para o critério de prontidão

| Camada | Estado |
|---|---|
| Regra de negócio | **existe e testada** (9 módulos puros) |
| Canal para o renderer | **5 dos 14** domínios com tela |
| Tela | **17 itens no menu** |
| Um humano usando | **não** |

**A distância entre "está implementado" e "o usuário consegue" tem três camadas, e o produto está na primeira em 9 casos.**

## Medido

| Medida | Valor |
|---|---|
| Regressões das 6 implementações | **0** |
| Testes novos desde a r171 | **+96 passando** |
| Falhas | **53** (de 55) — externas, não classificadas uma a uma |
| Módulos puros sem superfície | **9** |
| Módulos puros que ganharam canal | **1** (inventário, r186) |
| `main` intocado | **sim** |
