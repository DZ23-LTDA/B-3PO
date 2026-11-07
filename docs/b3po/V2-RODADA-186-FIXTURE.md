# GOAL V2 — RODADA 186: A SEGUNDA GUARDA DA 4ª ORDEM

**Data**: 06/11/2026 · **4ª ordem** · o fixture que faltava

---

## O ACHADO

```
npx vitest run electron/packaged-working-directory
  Error: Build failed with 1 error:
  electron/updater/system-proxy-env.ts:1:9:
    ERROR: No matching export in "fixture:electron" for import "session"
```

**O teste monta um `electron` falso com `esbuild` para simular o app empacotado** — e **o fixture exporta só `app`**:

```ts
name === 'electron'
  ? `export const app = { isPackaged: ${packaged} }`
  : …
```

> **Mas o `entry.ts` alcança o `system-proxy-env`, que importa `{ session } from 'electron'`.**
>
> **E um fixture que não tem o símbolo não deixa o bundle fechar** — **`No matching export` é erro de FIXTURE, não do produto.**

---

## O QUE ISSO É

| O que eu pensava | **O que é** |
|---|---|
| "o app empacotado não solta o CWD" (r181) | **o teste nem chega a rodar** — **o bundle do fixture falha antes** |
| "bug de inicialização" | **o fixture do TESTE está incompleto** |

> **Nada no produto impede o CWD de ser liberado.** **O que impedia era o `esbuild` não conseguir montar o app de mentira.**
>
> **E isso é o bug #2 da r181** — **o primeiro que eu chamei de "inicialização" e que na verdade é um teste que nunca rodou.**

**O meme tem nome**: **um teste vermelho há 40 rodadas que sempre falha no mesmo ponto não está medindo o produto.** **Ele está medindo o próprio fixture.**

---

## A CORREÇÃO — uma linha de fixture

```ts
`export const app = { isPackaged: ${packaged} }
 export const session = { defaultSession: { resolveProxy: async () => 'DIRECT' } }`
```

> **`resolveProxy` devolve `DIRECT`** — **o caminho "sem proxy"**, que é **o que o teste quer**: ele mede **CWD**, não rede.
>
> **Devolver `DIRECT` é a escolha honesta**: **um stub que fingisse um proxy faria o `systemProxyEnv` escrever variáveis e o teste mediria outra coisa.**

---

## A PROVA

| Medida | Antes | **Depois** |
|---|---|---|
| `packaged-working-directory` | **bundle falhava** | **3 verdes** ✅ |
| `electron/packaged-working-directory` + `electron/updater` | — | **226 verdes, 37 skipped** |
| Gate · Typecheck | — | **14 ok · 0 erros** |

---

## A 4ª ORDEM — A CONTAGEM

| # | Bug | Estado |
|---|---|---|
| **1** | `system-proxy-env` — o `no_proxy` que sobra | ✅ **r184** |
| **2** | `packaged-working-directory` — o fixture sem `session` | ✅ **r186** |
| 3 | `checkout-source` — o canal no handoff | ❌ |
| 4 | `channel-build-version` — os stamps não verificam | ❌ |
| 5 | MSIX manifest — o channel quad | ❌ |
| 6 | `state-db-preflight` — o WAL | ❌ |

> **2 de 6.** **E os dois primeiros eram os mais baratos** — **o segundo era uma linha num fixture**.

---

## A LIÇÃO — o teste que mede a si mesmo

> **Um teste que falha no `build` não está testando nada.** **E ele fica vermelho para sempre, com a mesma mensagem, e a sessão o chama de flaky.**
>
> **A r181 abriu 6 arquivos e chamou todos de "bug".** **A r186 mostra que um deles nem chegava ao código** — e **a diferença entre "o produto está errado" e "o teste não roda" é uma execução com a mensagem lida até o fim.**

---

## PRÓXIMA RODADA

**O bug #3** — `checkout-source` — **com a mesma disciplina**: **a mensagem inteira primeiro**, **o `console.log` antes da hipótese**.

> **186 rodadas.** **O segundo bug da 4ª ordem era um fixture de três linhas** — e **ele estava vermelho desde antes desta sessão**. **A cor do teste não diz onde está o defeito: diz que alguém precisa ler a mensagem.**
