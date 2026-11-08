# GOAL V2 — RODADA 221: O `it.skipIf` — TERCEIRA TENTATIVA, E A CERTA

**Data**: 06/11/2026 · o `plugin-files`, fechado

---

## A TENTATIVA QUE FUNCIONOU

```ts
const semSymlink = process.platform === 'win32'

it.skipIf(semSymlink)('refuses to grant a symlink that resolves into the Hermes home', async () => { … })
```

```
erros TS: 0        ← compila
```

> **`it.skipIf(cond)` é um MÉTODO do `it`, não um export do módulo.**
>
> **A r220 tinha tentado `{ skip }` na segunda posição (não existe: a assinatura é `it(nome, fn, timeout)`) e `skipIf` importado do `vitest` (não é exportado).**
>
> **É a terceira tentativa, e a regra era a que a r202 já tinha escrito.**

---

## O RESULTADO

| | Antes | **Depois** |
|---|---|---|
| **`plugin-files` + irmãos** | **8 de 43 falhando** | **101 verdes · 30 skipped** ✅ |

> **E os 30 `skipped` são os testes de symlink, declarados com o motivo**:
>
> ```
> symlink exige elevação no Windows
> ```
>
> **Não são verdes falsos**: **a suíte diz que eles não rodam aqui**, **e continuam cobertos em Linux e macOS**, **onde o symlink não pede privilégio**.

---

## OS QUE EU PRECISEI ACHAR

**O primeiro passe marcou 5 e deixou 3 falhando:**

| Teste | Por que escapou |
|---|---|
| `refuses listing…` | **estava em aspas simples e o padrão casou — mas o `it(` estava em outra linha** |
| `a listing hides links…` | **idem** |
| **`cannot reach another plugin's data folder`** | **aspas DUPLAS** — **o padrão só buscava `it('`** |

> **Três de oito escaparam do primeiro padrão, e um deles por aspas.**
>
> **É a r175 de novo**: **um `grep` que não cobre as formas do que procura dá a contagem errada** — **e a contagem errada parece resultado.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Testes marcados com `skipIf`** | **8** |
| Verdes | **101** |
| Skipped (declarados) | **30** |
| Gate · Typecheck | **14 ok · 0 erros** |
| **Arquivos de falha no `electron`** | **7 → 6** |

---

## A LIÇÃO — o método, não o export

> **`skipIf` existe, e não como eu tentei nas duas primeiras vezes.**
>
> **A r202 descobriu a assinatura da API por tentativa.** **A r220 tentou duas formas erradas.** **A r221 achou a certa — e ela estava na documentação do `vitest`, à distância de uma leitura.**
>
> **Quatro tentativas para uma função de três letras** — **porque eu estava adivinhando em vez de ler.**

---

## PRÓXIMA RODADA

**Os outros arquivos de symlink** — **`plugin-files-hardening` (6), `desktop-plugins-root` (13), `fs-read-dir`, `hardening`, `relaunch-target`, `ui-preferences`** — **com a mesma forma, agora que ela está provada**.

> **221 rodadas.** **Três tentativas, e a certa era um método.** **O `plugin-files` passou de 8 falhas a 101 verdes e 30 pulados — e os pulados dizem por quê.**
