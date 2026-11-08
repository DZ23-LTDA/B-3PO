# MASCOT-COVERAGE

## Este documento é um índice

A auditoria detalhada está em **`audit/MASCOT-AUDIT.md`**.

## O que foi observado na janela

| Onde | Mascote visível | Evidência |
|---|---|---|
| **Home (app de dev)** | **sim** — robô B-3PO centralizado | r228 |
| **Home (app empacotado)** | **sim** — o mascote está no pacote | `evidencias/instalado-r242.png` |
| Lista de Bots | **não verificado** nesta execução | — |
| Conversa | **não verificado** | — |
| Configurações | **não verificado** | — |
| **Android** | **não verificado** | — |
| **iOS** | **não verificado** | — |
| Instaladores | **sim** — o mascote aparece na Home do pacote | r242 |

## O que o §8 exige, e o estado

| Exigência | Estado |
|---|---|
| 20 mascotes oficiais em `brand/avatars/` | **existem** — há teste de cobertura (`mascots.test.ts`, `mascot-grid.test.tsx` no gate da CI) |
| `mascot_id` persistente por Bot | **implementado** — validado pelo `bot-schema.test.ts` |
| Sincronização entre dispositivos | **não verificado** |
| Não usar emoji como substituto | **atendido** — o mascote é imagem |
| Assets com consumidores reais | **parcialmente verificado** — Home consome; outras superfícies não auditadas |

## O que o gate da CI cobre

O workflow `b3po-brand.yml` roda:

- `src/plugins/hermes-bots/mascots.test.ts`
- `src/plugins/hermes-bots/mascot-grid.test.tsx`

**Esses dois testes passam na CI** (2 runs com sucesso, rodada 243). Eles verificam o **manifest e a grade de
mascotes**, não a presença em cada tela.

## Classificação honesta

**`PARTIAL`.** Os assets existem, têm teste de contrato e aparecem na Home do pacote. **A cobertura nas outras
superfícies (lista de Bots, conversa, settings, mobile) não foi medida nesta execução.**
