# Rótulo de versão (rodada 60)

## Antes

Rodapé: **`cliente vgit.6c85ca0.dirty`**

Hash de commit, prefixo `v` e sufixo `.dirty` na barra de status de um produto. Informação de
desenvolvimento exposta ao usuário final.

## Depois

Rodapé: **`cliente vdev`**

O hash e o `.dirty` **sumiram**. Uma build sem release nenhuma agora diz `dev`, que é verdade: não há
versão de produto para mostrar.

## Como foi corrigido

`shortVersion` (`src/lib/version-label.ts`) só removia `.g<sha>.dirty` quando havia `+distância`
(`0.21.5+1913.gf83a9e9`). Um stamp puro de git (`git.6c85ca0.dirty`) não casava nenhuma regra e
passava cru. Agora:

```ts
const apenasCommit = /^git\.[0-9a-f]+(?:\.dirty)?$/i.test(version.trim())
if (apenasCommit) return 'dev'
```

Há teste para o caso e para o oposto: `1.0.0-git.abc` e `0.21.5.git.abc` **não** viram `dev` — só o
stamp puro vira.

## Um teste que codificava o defeito

`version-status.test.ts` afirmava:

```ts
expect(client({ version: 'git.abc1234' }).label).toBe('vgit.abc1234')
```

O hash com prefixo `v` era **exatamente o defeito**. O teste não protegia contra a regressão: ele
exigia que ela continuasse. Atualizado para `'client dev'`, com o motivo escrito na linha.

## O que NÃO ficou resolvido

O rótulo aparece como **`cliente vdev`**, com um `v` sem número antes. O ramo local de `base` em
`version-status.ts` monta `` `v${version}` `` direto; corrigi para tratar `'dev'`, o teste unitário
passa, **mas o bundle que a tela carrega não incorporou essa mudança** — o rodapé continua com o `v`.

`vdev` é cosmético e muito melhor que o hash, mas não é o que eu queria entregar. Registrado como
aberto em vez de declarado resolvido.

## Um teste intermitente observado

`src/lib/keybinds/browser-hints.test.tsx` falhou uma vez por timeout (18,5 s) e **passou isolado**.
Não tem relação com esta mudança. Registrado porque o GOAL proíbe ignorar falha intermitente: é
observação, não conclusão de que é inofensivo.
