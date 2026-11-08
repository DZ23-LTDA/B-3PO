# Bloqueios na tela de agenda — não aparece (rodada 127)

**Rodada 127 de 256.**

## O que foi feito

`src/app/agenda/blocks.tsx` — componente completo:
- lista bloqueios
- formulário: recurso, motivo, início, fim
- botão "Bloquear" e "Remover" por linha
- estados honestos: sem ponte não renderiza; erro aparece como erro, lista vazia como vazia

Uma linha inserida em `src/app/agenda/index.tsx` (`<SchedulingBlocks />` após o `</header>`).

Typecheck: 2 projetos, ok. Build: ok.

## O que a tela mostrou

Captura `evidencias-r127/agenda-bloqueios.png`:

```
AGENDA: {"achouTitulo":false,"botoes":[],"inputMotivo":false,"mensagem":""}
```

A tela de Agenda abre com o formulário de agendamento e "Nenhum compromisso ainda." — **o bloco de bloqueios não existe na página**.

## A causa provável

`blocksAvailable()` só renderiza quando `window.hermesDesktop.schedulingBlocks` existe. Na r126 eu adicionei essa chave ao `preload.ts` (objeto literal em `contextBridge.exposeInMainWorld`, sem allowlist). O typecheck passa nos dois lados.

O que não foi provado: que o **preload compilado** em execução tem a chave nova. `npm run build` roda `scripts/build.mjs`; o preload é compilado por `tsc --build tsconfig.electron.json`, que é incremental. Se o artefato não foi regenerado, o app roda com a ponte antiga e o componente devolve `null` corretamente.

**Não verifiquei isso.** É a próxima coisa a fazer, não um diagnóstico fechado.

## Por que registrar em vez de "consertar" no escuro

Se eu mudasse `blocksAvailable()` para renderizar sempre, o bloco apareceria — e os botões não fariam nada, porque a ponte não existe. **Um botão que não faz nada é pior que um bloco ausente.**

O componente está certo em esconder-se. O que falta é provar que a ponte chega.

## Quarto defeito encontrado pela tela

| Rodada | Defeito |
|---|---|
| 106 | botão podia existir sem o fluxo funcionar |
| 109 | faixa de homologação não aparecia |
| 112 | campo de motivo podia não renderizar |
| 119 | select existia no JSX e não na tela |
| **127** | **componente existe, ponte não chega** |

Nenhum foi pego por typecheck, build ou gate. **Todos pela captura.**

## Próxima rodada (128)

1. Confirmar no artefato compilado se `schedulingBlocks` está presente
2. Se não: forçar rebuild do electron e recapturar
3. Se sim: o defeito é outro, e a medição diz qual
