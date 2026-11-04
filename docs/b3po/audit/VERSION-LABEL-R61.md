# Rótulo de versão — fechado (rodada 61)

## Resultado

```
cliente vgit.6c85ca0.dirty   →   cliente vdev   →   cliente dev
```

O `v` final caiu. A barra de status diz **`cliente dev`**: uma build sem release, sem hash e sem
sufixo de desenvolvimento.

## A causa do `vdev` não era código

O código estava certo desde a rodada 60 — o bundle `main-*.js` já continha:

```js
h ? (s || (m === 'dev' ? a.clientLabel(y) : (m && `v${m}`) || y)) : a.backendLabel(y)
```

Se `version === 'dev'`, chama `clientLabel('dev')` → `cliente dev`.

**O build era anterior à correção.** O `npm run build` reportava `Done in 2ms` porque reutilizava o
chunk `main-Z53sf-kI.js` (10:20:50); depois do rebuild, o chunk virou `main-DRsAtbNM.js` (10:26:38) e
o rodapé passou a mostrar `cliente dev`.

## A lição de medição

Eu tinha dito na rodada 60 que "o bundle que a tela carrega não incorporou a mudança". A frase estava
certa; a **conclusão implícita** — de que havia um caminho de código alternativo — estava errada. Era
build velho, e eu não verifiquei o timestamp do chunk antes de teorizar sobre dois caminhos.

**O que eu deveria ter feito:** comparar `LastWriteTime` do `.js` gerado com o da edição no fonte. Um
comando, antes de qualquer hipótese.

## Estado

Fechado. Não há pendência de rótulo de versão.
