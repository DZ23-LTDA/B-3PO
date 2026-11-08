# Tela de privacidade — o que existe e o que falta verificar (rodada 95)

## Entregue

| Peça | Arquivo |
|---|---|
| Canais IPC (export, preview, anonymize) | `electron/privacy-ipc.ts` |
| Montagem no `mountErpIpc` | `electron/erp-ipc.ts` |
| Ponte no preload (`hermes.privacy`) | `electron/preload.ts` |
| Cliente | `src/api/privacy.ts` |
| Tela | `src/app/privacidade/index.tsx` |
| Rota (5 registros) | `routes.ts` + `surfaces.tsx` |

A tela tem três passos encadeados: buscar → ver o alcance → anonimizar. O terceiro só aparece depois que o
alcance foi visto, e o texto diz o que fica (o fato fiscal). O canal exige `confirmar: true`, então a
confirmação não depende só da tela.

## O `anonymize` precisa de `confirmar: true`

```ts
if (p['confirmar'] !== true) return { error: 'confirmacao_obrigatoria' }
```

Um botão sem confirmação explícita apagaria o titular num clique errado, e **não há lixeira**.

## Pendência — navegação até a tela

Procurei e **não encontrei** quem consome `APP_ROUTES` para montar um menu:

- `APP_ROUTES` tem consumidores em `routes.ts` (mapa de path→view e conjunto de paths reservados), no
  teste `surfaces.app-routes.test.tsx`, e em `desktop-metrics.ts`.
- O rótulo "Documentos" não aparece em nenhum componente além do próprio `surfaces.tsx`.

**Não afirmo que o menu não existe** — nas rodadas 70, 71 e 75 eu já declarei ausência de algo que existia,
por ter procurado num lugar só. O que afirmo é que esta tela, como as outras telas do ERP, resolve por
`/privacidade` e que a verificação de navegação continua aberta.

Se o produto realmente não tem menu para os módulos, o impacto é grande: **22 telas existem e o usuário só
chega digitando a URL.**

## Testes

`src/app/routes.test.ts`, `routes.titlebar-clusters.test.ts`, `src/i18n`, `surfaces.app-routes.test.tsx`:
**152 testes, 0 falhas.** O teste de app-routes verifica que toda rota da tabela tem `<Route>`.
