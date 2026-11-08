# GOAL V2 — RODADA 188: O BUG #3 FECHADO — E O #2 REVELADO

**Data**: 06/11/2026 · **4ª ordem** · `HERMES_PYTHON`

---

## O ACHADO

**`vitest.hermes-python.ts` — o `globalSetup` que existe para resolver o interpretador:**

```ts
if (process.env.HERMES_PYTHON || process.platform === 'win32') return
```

> **Ele PULA justamente no Windows** — **onde `python3` é o stub da Store e o `python` do PATH não tem as dependências**.
>
> **O comentário acima explica por quê**: `scripts/run-in-hermes-env` é **bash**, e o Windows não tem o equivalente.
>
> **O efeito era o inverso do pretendido**: **no único sistema onde a resolução era necessária, ninguém resolvia.**

---

## A CORREÇÃO

```ts
function resolverNoWindows(): null | string {
  const candidatos = [
    path.join(repo, '.venv', 'Scripts', 'python.exe'),
    path.join(repo, '..', 'b3po-testenv', 'Scripts', 'python.exe')
  ]
  for (const candidato of candidatos) {
    if (!existsSync(candidato)) continue
    try {
      execFileSync(candidato, ['-c', 'from hermes_cli.config import get_config_path'], {
        env: { ...process.env, PYTHONPATH: repo }, …
      })
      return candidato
    } catch { /* o próximo */ }
  }
  return null
}
```

> **Valida com a DEPENDÊNCIA do projeto**, não só `import sys` — **é ela que falta no `python` do PATH**.
>
> **E não decide nada por conta própria**: **procura nos lugares onde o venv é criado**, **valida por execução**, e **se nenhum responder, a mensagem nomeia `HERMES_PYTHON`**.

### Medido antes de escrever

| Interpretador | `from hermes_cli.config import …` |
|---|---|
| `python` (PATH) | ❌ `ModuleNotFoundError` |
| **venv do projeto** | **✅ ok** |
| `py -3` | existe, mas **sem as deps** |

---

## O RESULTADO — e o segundo achado

| Teste | Antes | **Depois** |
|---|---|---|
| **`checkout-source`** | ❌ `python3` stub | **✅ 1 passed** |
| `packaged-working-directory` | ❌ *"No matching export"* (r186) | **❌ `EBUSY`** |

> **O `EBUSY` é progresso, não regressão.** **A r186 destravou o bundle; agora o teste chega ao PRODUTO** — e o que ele encontra é:
>
> ```
> EBUSY: resource busy or locked, rmdir '…\hermes-entry-cwd-…\workspace'
> ```
>
> **O diretório de instalação continua preso** — **que é exatamente o que o teste se chama para provar que não acontece**: *"packaged startup **releases the install CWD**"*.

**Duas camadas caíram e a terceira apareceu:**

| Camada | O que era | Estado |
|---|---|---|
| **1** | o fixture sem `session` (r186) | ✅ |
| **2** | o `python3` stub e o `HERMES_PYTHON` (r187–r188) | ✅ |
| **3** | **o CWD de fato não é liberado** | ❌ **o bug do produto** |

---

## A 4ª ORDEM — A CONTAGEM

| # | Bug | Estado |
|---|---|---|
| **1** | `system-proxy-env` — o `no_proxy` que sobra | ✅ **r184** |
| **2** | `packaged-working-directory` — **fixture ✅, CWD ❌** | ⚠️ **revelado** |
| **3** | `checkout-source` — o interpretador | ✅ **r188** |
| 4 · 5 · 6 | `channel-build-version` · MSIX · `state-db-preflight` | ❌ |

> **3 de 6**, e **um deles agora aponta o produto em vez do teste**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Bugs fechados** | **3 de 6** |
| Testes do `updater` | **226 verdes** (antes de a r188 mexer) |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o `globalSetup` que pulava onde importava

> **A condição `|| process.platform === 'win32'` foi escrita com uma razão boa** (não há bash) **e produziu o efeito oposto**: **o Windows, que mais precisava, era o único que não recebia**.
>
> **E o sintoma engana**: **no Linux o `globalSetup` funciona, e o mesmo teste passa** — **então o vermelho no Windows parece "ambiente", quando é a ausência de um caminho que só o Windows precisa**.
>
> **É a terceira variação da mesma família nesta 4ª ordem**: **algo que existe para os outros e não para quem precisa.**

---

## PRÓXIMA RODADA

**O CWD** — com o teste vermelho como especificação, e a pergunta certa: **quem ainda segura o diretório depois do `releasePackagedWorkingDirectory`?**

> **188 rodadas.** **Três bugs fechados, e o terceiro abriu a porta para o quarto** — **que é do produto**. **O `EBUSY` não é um erro de ambiente: é o teste funcionando pela primeira vez em 40 rodadas.**
