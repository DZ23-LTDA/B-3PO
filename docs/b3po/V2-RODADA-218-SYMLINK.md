# GOAL V2 — RODADA 218: O `EPERM` DO SYMLINK — E O LINK QUE O WINDOWS NÃO CRIA

**Data**: 06/11/2026 · a falha `desktop-plugin-remove`

---

## O ERRO

```
Error: EPERM: operation not permitted, symlink '…\hermes-dp-remove-chEUj…'
 ❯ electron/desktop-plugin-remove.test.ts:101:8
     101     fs.symlinkSync(real, path.join(root, 'linked'), 'dir')
```

> **O `symlinkSync(..., 'dir')` falhou no Windows.**

---

## A CAUSA — e o teste não era o culpado

> **No Windows, `symlinkSync(..., 'dir')` exige privilégio de administrador ou o Modo Desenvolvedor.**
>
> **O erro acontece ANTES do código sob teste**: **a r189 já tinha visto isso no `packaged-working-directory`** ("**o `EPERM` era o `finally`'s `rm`, não o `assert.rejects` que o teste mede**") — **e aqui é a mesma forma**: **um `EPERM` de infraestrutura escondendo o que o teste quer medir**.

---

## A CORREÇÃO

```ts
fs.symlinkSync(real, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
```

> **`junction` é o tipo de link de diretório que o Windows permite criar sem elevação.**
>
> **E é o que o próprio `removeDesktopPlugin` espera encontrar**: **um link para uma pasta, que se remove como link e nunca é seguido**.
>
> **Não é um teste afrouxado**: é o mesmo comportamento, **com o tipo de link que o sistema permite criar**.

---

## A PROVA

| Medida | Antes | **Depois** |
|---|---|---|
| `desktop-plugin-remove` | **1 de 8 falhando** | **8 verdes** ✅ |
| Gate · Typecheck | — | **14 ok · 0 erros** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Arquivos de falha no `electron`** | **8 → 7** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O PADRÃO — os sete que restam, um por um

| Arquivo | O que é | Já sei a causa? |
|---|---|---|
| **`desktop-plugin-remove`** | **symlink** | ✅ **r218** |
| `ssh-connection` (89 testes) | SSH | ❌ |
| `plugin-files` (43) | arquivos de plugin | ❌ |
| `run-electron-builder` | build | ❌ |
| `bundle-electron-main` | build | ❌ |
| `linux-nvidia-egl-recovery` | **Linux** — nunca vai passar no Windows | — |
| `desktop-plugin-install` | instalação | ❌ |

> **Dois são de build de Electron, um é de Linux (impossível aqui), e três são de infraestrutura de plugin/SSH.**
>
> **Nenhum é do B-3PO** — **e o `linux-nvidia-egl-recovery` nunca vai passar nesta máquina**: **ele testa uma máquina que não é esta.**

---

## A LIÇÃO — o link que o sistema não cria

> **O teste pedia um symlink de diretório — e no Windows esse pedido é um privilégio.**
>
> **Não é o produto que estava errado, nem a asserção**: **era o FIXTURE pedindo ao sistema algo que ele não dá sem elevação.**
>
> **E é a quinta variação do mesmo tema nesta sessão**: **o teste descreve o que quer, e o sistema onde ele roda tem outras regras.**

---

## PRÓXIMA RODADA

**Os outros seis** — e **um deles (o de Linux) não tem conserto, só declaração**.

> **218 rodadas.** **Um `EPERM`, uma palavra trocada (`junction`), e 8 verdes.** **O erro não estava no que o teste mede, mas no que ele pede ao sistema para poder medir.**
