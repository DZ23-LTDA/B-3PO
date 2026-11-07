# Faixa 141–155 — agenda, atendimento e pós-venda (fechamento)

**Rodada 134 de 256.**

## O que a faixa entregou

| Rodada | Entrega |
|---|---|
| 121 | disponibilidade: `horariosLivres`, 16 testes |
| 122 | lembretes: decisão de quando avisar, idempotência por chave |
| 123 | reagendamento com histórico |
| 124 | store de bloqueios (arquivo próprio, escrita atômica) |
| 125 | canais IPC, montados no ERP |
| 126 | ponte no preload + cliente do renderer |
| 127 | componente de bloqueios |
| 128 | **a ponte não chegava** — tipo declarava nível inexistente |
| 129 | bloqueio criado pela tela (E2E) |
| 130 | horários livres na agenda |
| 131 | **grade desalinhada ao epoch** — defeito real |
| 132 | **corte por "agora" em todo dia** — defeito real |
| 133 | **o teste procurava o input errado** |
| 134 | **17 slots na tela** |

## A prova visual

`evidencias-r134/slots-livres.png`:

```
Bloqueios de agenda          Recurso prof-1 · Motivo almoço · Bloquear
                            Nenhum bloqueio cadastrado.

Horários livres · prof-1    Dia 14/11/2026

09:00–10:00  09:30–10:30  10:00–11:00  10:30–11:30  11:00–12:00  11:30–12:30
12:00–13:00  12:30–13:30  13:00–14:00  13:30–14:30  14:00–15:00  14:30–15:30
15:00–16:00  15:30–16:30  16:00–17:00  16:30–17:30  17:00–18:00
```

**17 slots, grade de 30min, dentro do expediente 09–18.** O cálculo da r121 chegou à tela.

## Quatro rodadas para uma pergunta simples

> "Que horas você tem na terça?"

| R | O que a tela ensinou |
|---|---|
| 130 | lista vazia → investiguei |
| 131 | grade alinhada ao epoch moveria o expediente |
| 132 | o corte por "agora" valia para todo dia |
| 133 | **eu media o input errado** |

**Duas correções de produto, um erro de teste, e uma peça que não chegava no renderer (r128).**

## O que fica no código

`data-dia`, `data-recurso`, `data-slots` na `section` do painel. São baratos e tornam **este tipo de pergunta respondível sem devtools do React**.

## Dívida declarada da faixa

| Item | Estado |
|---|---|
| Envio de lembrete | `BLOCKED_BY_EXTERNAL_DEPENDENCY` (WhatsApp) |
| Horário de funcionamento | não existe no domínio; a tela **fixa 09–18 e diz isso** |
| Duração por serviço | a tela usa 60min fixo |
| Remover bloqueio pela tela | o botão existe; não exercitado |
| Reagendamento pela tela | cálculo puro sem superfície |

## Medido na faixa

| Medida | Valor |
|---|---|
| Rodadas | 14 |
| Testes novos | 16 (r121) + 15 (r122) + 12 (r123) + 12 (r124) |
| Defeitos reais achados pela tela | 4 (r128, r131, r132, e o select da r119 fora da faixa) |
| Erros de teste corrigidos | 2 (r133 e a granularidade da r127) |
