# GOAL V2 — RODADA 199: O CAMINHO DE macOS MONTADO COM `\` — E ESSE É DO PRODUTO

**Data**: 06/11/2026 · a falha `command-screenshot-monitor`

---

## O ERRO

```
+ actual:   'D:\Applications\Hermes.app\Contents\Resources\app.asar.unpacked\dist\native\command-screenshot-monitor'
- expected: '/Applications/Hermes.app/Contents/Resources/app.asar.unpacked/dist/native/command-screenshot-monitor'
```

> **O teste passa `platform: 'darwin'` e `appPath: '/Applications/Hermes.app/…'`** — **e recebe um caminho de Windows**.

---

## A CAUSA — e é a PRIMEIRA que não é do teste

```ts
export function resolveCommandScreenshotMonitorPath(
  appPath = resolve(dirname(fileURLToPath(import.meta.url)), '..')
): string {
  return resolve(appPath, 'dist/native/command-screenshot-monitor')…
}
```

> **`resolve` é do `node:path` do HOST.** **No Windows ele usa `\`, e o caminho montado é `D:\Applications\…`.**
>
> **O teste descreve um macOS e roda num Windows** — **mas o defeito é real**: **um caminho de macOS montado com barra invertida não abre**, **e este é o executável que captura tela**.

**As quatro falhas anteriores da 4ª ordem eram fixtures.** **Esta é o código** — **e ela estava escondida atrás da mesma palavra: "o teste descreve um sistema e roda em outro".**

---

## A CORREÇÃO

```ts
export function resolveCommandScreenshotMonitorPath(
  appPath = …,
  platform: NodeJS.Platform = process.platform      // ← novo
): string {
  const path = platform === 'win32' ? win32 : posix

  return path.resolve(appPath, 'dist/native/command-screenshot-monitor')…
}
```

> **A plataforma é parâmetro, e o caminho é montado com o separador DELA.**
>
> **O default é `process.platform`**, então **produção não muda** — **e o teste pode descrever macOS sem mentir sobre o host**.

**E o call site passou a repassar:**

```ts
path: resolveCommandScreenshotMonitorPath(options.appPath, options.platform)
```

> **O `MonitorOptions` já tinha `platform`** — **e a função que decide o caminho nunca o recebia**. **O dado estava lá desde o começo.**

### E o segundo teste, que chamava sem plataforma

```ts
assert.equal(resolveCommandScreenshotMonitorPath('/scratch/dev'), '/scratch/dev/dist/…')
```

> **Este compara com POSIX e não passa `platform`** — **ele testava o HOST, não a função**. **Agora passa `'darwin'`**, **e o que ele afirma é o que ele descreve.**

---

## A PROVA

| Medida | Antes | **Depois** |
|---|---|---|
| `command-screenshot-monitor` | **1 de 3 falhando** | **3 verdes** ✅ |
| Gate · Typecheck | — | **14 ok · 0 erros** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Bugs desta rodada** | **1** |
| Testes do arquivo | **3 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o teste que descreve máquina e recebe a sua

> **"O teste descreve um sistema e roda em outro"** foi a frase que eu usei para absolver quatro bugs da 4ª ordem.
>
> **Aqui ela acusou**: **o teste estava certo, e o produto usava a máquina de quem executa em vez da máquina de quem ele descreve**.
>
> **A diferença é que os quatro anteriores falhavam no FIXTURE** — **e este chegava ao código**, **montava o caminho errado**, **e só não derrubava a produção porque o app só roda no macOS onde o `resolve` do host é o certo**.
>
> **Um bug que não aparece no sistema onde o código roda é o mais fácil de não ver** — **e é o que o teste entre sistemas existe para pegar.**

---

## PRÓXIMA RODADA

**A verificação** — e depois **as outras falhas de ambiente**, uma a uma.

> **199 rodadas.** **Cinco falhas com a mesma frase, e uma delas era o produto.** **A frase não é uma absolvição: é uma pista — e a pista aponta para os dois lados.**
