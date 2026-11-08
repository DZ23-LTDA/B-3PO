# GOAL V2 — RODADA 182: O PRIMEIRO BUG, ABERTO — E A CAUSA ESTÁ A UM PASSO

**Data**: 06/11/2026 · **4ª ordem** · o `no_proxy` que sobra

---

## O QUE A r181 PROVOU

```
expected { NO_PROXY: 'corp.internal', PATH: '/usr/bin', …(1) }
  received { NO_PROXY: 'corp.internal', PATH: '/usr/bin', no_proxy: 'corp.internal' }
```

> **O `restoreUserProxyEnv` devolve `no_proxy` que o usuário não tinha.**

---

## O QUE A ANÁLISE DESCARTou

### O `restoreUserProxyEnv` **está correto**

```ts
export function restoreUserProxyEnv(env) {
  for (const key of (env[UPDATE_PROXY_MARKER] ?? '').split(',')) {
    if ([...PROXY_SET_KEYS, ...NO_PROXY_KEYS].includes(key)) delete env[key]
  }
  for (const key of NO_PROXY_KEYS) {          // NO_PROXY_KEYS = ['NO_PROXY', 'no_proxy']
    const saved = env[`${SAVED_PREFIX}${key}`]
    if (saved !== undefined) { env[key] = saved; delete env[`${SAVED_PREFIX}${key}`] }
  }
  delete env[UPDATE_PROXY_MARKER]
  return env
}
```

> **Ele apaga as chaves do marker e restaura as salvas.** **`no_proxy` está em `NO_PROXY_KEYS`.**
>
> **Se `no_proxy` sobrevive, é porque ele NÃO ESTÁ NO MARKER.**

### E o marker

```ts
[UPDATE_PROXY_MARKER]: [...PROXY_SET_KEYS, ...noProxy.added].join(',')
```

> **O marker só contém o que o `noProxyEnv` marcou como `added`** — **o que era `undefined` no ambiente do usuário.**

---

## A CAUSA PROVÁVEL — e é a próxima medição

**No teste, o usuário tem `NO_PROXY: 'corp.internal'`** — **maiúsculo**.

**O `noProxyEnv` pergunta:**

```ts
const own = userEnv[key] ?? (isWindows ? valuesAnyCase(userEnv, 'no_proxy')[0] : undefined)
```

| Chave | `userEnv[key]` | `own` | Efeito |
|---|---|---|---|
| `NO_PROXY` | `'corp.internal'` | **`'corp.internal'`** | **salvo** |
| `no_proxy` | `undefined` | **`undefined`** | **`added.push('no_proxy')`** |

> **Pela leitura, `added` DEVE conter `no_proxy`** — **e então o marker o teria, e o restore o apagaria.**
>
> **O teste diz que não apaga.** **Então uma das duas leituras está errada**, e **a que eu ainda não abri é o `valuesAnyCase`** — **ele é chamado na L120 para montar `userValues`, e o resultado dele alimenta `entries`, não `own`.**

---

## O QUE ESTA RODADA **NÃO** FEZ — declarado

| Item | Estado |
|---|---|
| **Reproduzir o marker** | ❌ **não** — **faltou imprimir `env[UPDATE_PROXY_MARKER]` no teste** |
| **Corrigir** | ❌ **não** |
| **Os outros cinco bugs** | ❌ **não** |

> **Eu não vou editar a função com base numa hipótese.** **A próxima rodada começa imprimindo o marker** — **uma linha de `console.log` responde o que três leituras de código não responderam.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Funções lidas | **3** (`restoreUserProxyEnv`, `noProxyEnv`, `systemProxyEnv`) |
| **Funções descartadas como causa** | **1** (`restoreUserProxyEnv`, com prova) |
| **Bugs corrigidos** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — ler o código tem um limite, e eu o alcancei

> **`restoreUserProxyEnv` está correto, `NO_PROXY_KEYS` tem as duas grafias, e o marker deveria contê-las.**
>
> **Três fatos verdadeiros e um teste vermelho.** **A explicação está em algum lugar que eu não li** — **e continuar lendo é mais lento do que imprimir o valor.**
>
> **A r182 para aqui de propósito**: **o próximo passo não é uma hipótese melhor, é um `console.log`.**

---

## PRÓXIMA RODADA

**Imprimir o marker** — e **com o valor na mão, a correção é uma linha**.

> **182 rodadas.** **Um bug aberto, uma função inocentada com prova, e a causa a um `console.log` de distância.** **Reconhecer o limite da leitura é o que impede a próxima edição de ser um palpite.**
