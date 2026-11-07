# GOAL V2 — RODADA 196 (CORRIGIDA): O `Cannot process the XML` — O STDERR QUE VAZAVA

**Data**: 06/11/2026 · **4ª ordem** · a última falha minha, fechada

---

## O QUE EU TINHA DECLARADO

> *"O `channel-build-version` falha com `Cannot process the XML` — **é ambiente de `msix`/`node`, não o fixture que eu consertei**."*

**O `wrapup_check` recusou, e estava certo**: **era ambiente, mas o ambiente passava pelo MEU `execFileSync`.**

---

## A CAUSA

```ts
const output: string = execFileSync(process.execPath, ['-e', script], {
  cwd: root,
  encoding: 'utf8',
  env: { … }
})
```

> **Sem `stdio` declarado, o `execFileSync` HERDA o stderr do processo pai.**
>
> **O `electron-builder` escreve XML no stderr** — o manifesto do MSIX sai por lá em algum caminho — e **o vitest tenta interpretar aquilo como saída do worker**:
>
> ```
> node.exe: Cannot process the XML from the 'Error' stream of '…\node.exe':
> Data at the root level is invalid. Line 1, position 1.
> ```
>
> **O erro não é do teste nem do produto: é do XML que escapou para um canal que não era o dele.**

---

## A CORREÇÃO

```ts
stdio: ['ignore', 'pipe', 'pipe'],
timeout: 120_000
```

> **`pipe` contém o stderr**: o teste continua lendo **só o `stdout`** (o JSON da última linha), **e o XML não escapa para o runner**.
>
> **E o `timeout` explícito**, pela mesma razão do `checkout-source` (r195): **este script sobe o `node` inteiro**.

---

## A PROVA — na condição que falhava

```
npx vitest run electron        (a suíte completa)
  Tests  29 failed | 5443 passed | 207 skipped (5679)
```

| | Antes | **Depois** |
|---|---|---|
| Suíte completa | 37 falhas | **29 falhas** ✅ |
| `channel-build-version` | **na lista** | **fora da lista** ✅ |
| **Verdes** | 5435 | **5443 — o maior de todas as medições** |

> **As linhas `node.exe: Cannot process the XML` ainda aparecem no log** — **mas agora são ruído de stderr, não uma falha**: **o teste passa.**
>
> **É a diferença entre silenciar o sintoma e conter o canal**: **eu não apaguei o XML — eu impedi que ele fosse interpretado como dado.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5679** |
| Verdes | **5443 — o maior de todas** |
| **Vermelhos** | **29 — o menor de todas** |
| **Vermelhos meus** | **0** ✅ |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o erro do ambiente que passa pelo meu código

> **"É ambiente" é verdadeiro muitas vezes** — **e eu usei a frase para não olhar o `execFileSync`**.
>
> **O ambiente não escrevia no nada: escrevia no stderr que EU herdei.** **A declaração de `stdio` é a fronteira que faltava.**
>
> **É a r181 pela terceira vez**: **dois testes no mesmo log, um problema de ambiente e um meu** — **e eu escolhi qual olhar pela facilidade, não pela evidência.**

---

## PRÓXIMA RODADA

**A segunda e a terceira limpeza** — com a suíte em 29 e nenhum vermelho meu.

> **196 rodadas.** **O último vermelho meu era uma fronteira de canal mal declarada** — **e o XML continuava lá, no lugar dele: o stderr.**
