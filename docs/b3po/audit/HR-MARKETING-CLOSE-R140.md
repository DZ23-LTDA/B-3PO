# Faixa 156–170 — RH, marketing e operações (fechamento)

**Rodada 140 de 256.**

## O que a faixa entregou

| Rodada | Entrega | Testes |
|---|---|---|
| 135 | férias: aquisitivo, dias, faltas (art. 130/133), 1/3, vencimento | 20 |
| 136 | segmentação: critérios em conjunção, `nunca_comprou` separado de inativo | 14 |
| 137 | resumo de cliente a partir das vendas | 11 |
| 138 | store de gozo de férias — fecha `vencida` | 14 |
| 139 | abono pecuniário (art. 143): 1/3 dos dias, 1/3 constitucional, prazo | 8 |

**67 testes novos na faixa.**

## A cadeia do RH, camada por camada

```
r135  regra pura          situacaoFerias recebe ultimoGozo e NÃO inventa
r138  fonte do parâmetro  store de gozo, imutável
r139  reusa o 1/3         tercoConstitucional já testado na r135
```

> **Cada rodada usou o que a anterior provou.** Nenhuma refez a de trás.

## A cadeia do marketing

```
Sale → resumoDeClientes → ClienteResumo → clientesDoSegmento → composicao
```

> Um agente já pode encadear as três funções. Falta superfície, não lógica.

## Decisões que se repetiram e valem registro

**Ausência não é zero.** `ultima_compra: null` (não `0`, que seria 1970), `ticket_medio: null`, `average_cents: null`, `satisfacaoMedia: null`, `ctr: null`. Em todos os casos, zero afirmaria um fato que não existe.

**Mesmo critério de "venda que valeu".** Só `faturado` conta para: recebível, baixa de estoque, comissão, fechamento de caixa, resumo de cliente. Um critério, um lugar.

**Não adivinhar o que o dado não sustenta.** `situacaoFerias` exige `ultimoGozo` em vez de chutar; `prazoDoAbono` devolve a data em vez de recusar. Quem decide é quem lê.

**Meses de calendário, não blocos de dias.** `11 * 30 dias` são 330, não 11 meses — e erra uma semana por ano. Corrigido em `maisMeses()` e no período aquisitivo.

## Dívida declarada da faixa

| Item | Estado |
|---|---|
| Treinamento, escala, solicitações | `NOT_IMPLEMENTED` |
| Onboarding / offboarding | `NOT_IMPLEMENTED` |
| Salário-dia no RH | ausente — `valorDoAbono` recebe o valor, não o busca |
| Superfície de férias | `IMPLEMENTED` (cálculo + store), sem tela |
| Métricas de marketing | parcial: `ctr` existe, `metrica` como domínio não |
| Pós-campanha | `NOT_IMPLEMENTED` |

## O que a faixa NÃO resolveu

> **Nenhuma tela nova.** Tudo o que foi construído aqui é cálculo puro ou store sem superfície.
>
> Isso é consistente com o padrão das últimas faixas: primeiro o domínio provado por teste, depois a tela. Mas significa que **um usuário ainda não consegue tirar férias pelo produto** — só um agente, via tool.

## Medido na faixa

| Medida | Valor |
|---|---|
| Rodadas | 6 |
| Testes novos | **67** |
| Defeitos reais corrigidos | 3 (aniversário em mês curto, ciclo nunca disponível, `10:15` inexistente na grade) |
| Erros de teste meus | 2 (esperava `disponivel` onde era `vencida`; esperava `10:15`) |
| Telas novas | **0** |
