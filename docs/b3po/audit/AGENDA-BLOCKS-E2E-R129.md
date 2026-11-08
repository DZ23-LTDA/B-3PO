# Bloqueios de agenda — fluxo completo exercitado (rodada 129)

**Rodada 129 de 256.**

## O que foi provado

A r128 provou que o bloco **renderiza**. A r129 prova que **funciona**.

Script abre o app, navega para Agenda, preenche os quatro campos, clica em "Bloquear" e lê a lista:

```
PREENCHER: preencheu
BLOQUEAR:  clicou
DEPOIS:    {"itens":["prof-1 · almoco de teste · 10/11/2026, 12:00:00 até 10/11/2026, 13:00:00 Remover"],
            "alerta":[], "vazio":false}
ERROS:     nenhum
```

Captura: `docs/b3po-preview/evidencias-r129/bloqueio-criado.png`

## Por que setter nativo e não `el.value = x`

Um `el.value = x` direto muda o DOM e **o React não vê** — o estado do componente continua igual, o formulário envia **vazio**, e o teste "passa" clicando num botão que manda nada.

O setter de `HTMLInputElement.prototype.value` dispara o caminho que o React escuta. **Sem isso o teste seria uma mentira confortável.**

## A cadeia, camada por camada

| Camada | Rodada | Prova |
|---|---|---|
| store grava | 124 | 12 testes |
| canais respondem | 125 | inventory-ipc verde |
| ponte chega | 128 | `Object.keys` + `tipo: object` |
| componente monta | 128 | `h2`, `input`, 2 seções |
| **formulário cria** | **129** | **este documento** |
| **lista mostra** | **129** | **item com recurso, motivo e horário** |

**Seis camadas, exercitadas de ponta a ponta por um clique real.**

## Falta

| Item | Estado |
|---|---|
| Remover pela tela | o botão existe; **não exercitado** |
| `horariosLivres` | a disponibilidade da r121 ainda recebe bloqueios por parâmetro; o componente carrega a lista, **falta a tela de agendar consumir** |

## O que as rodadas 127–129 ensinaram

**127** registrou o defeito sem consertar no escuro.
**128** mediu em três passos e isolou a causa — o tipo declarava um nível que o preload não tem.
**129** provou o fluxo com um clique que passa pelo React de verdade.

> Três rodadas para uma funcionalidade pequena. Duas delas foram para descobrir que o cast `as unknown as` **apagou a única verificação que importava**.
