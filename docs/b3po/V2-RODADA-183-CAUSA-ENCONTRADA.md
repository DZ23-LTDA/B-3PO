# GOAL V2 — RODADA 183: A CAUSA — O TESTE DESCREVE LINUX E RODA EM WINDOWS

**Data**: 06/11/2026 · **4ª ordem** · o `no_proxy` que sobra, resolvido

---

## O `console.log` QUE A r182 PEDIU

```
KEYS   = [HTTPS_PROXY, https_proxy, HTTP_PROXY, http_proxy,
          NO_PROXY, HERMES_UPDATE_USER_NO_PROXY,
          no_proxy, HERMES_UPDATE_USER_no_proxy,
          HERMES_UPDATE_SYSTEM_PROXY]
MARKER = "HTTPS_PROXY,https_proxy,HTTP_PROXY,http_proxy"
```

> **O marcador NÃO tem `NO_PROXY` nem `no_proxy`** — e **as DUAS chaves foram salvas**.

---

## POR QUE — e é uma linha de código

```ts
const own = userEnv[key] ?? (isWindows ? valuesAnyCase(userEnv, 'no_proxy')[0] : undefined)

if (own === undefined) { added.push(key) }        // → entra no marker
else { env[`${SAVED_PREFIX}${key}`] = own }       // → sai do marker
```

**No teste, o usuário tem `NO_PROXY: 'corp.internal'`** — **só a grafia maiúscula**.

| Chave | `userEnv[key]` | `isWindows` | `own` | Efeito |
|---|---|---|---|---|
| `NO_PROXY` | `'corp.internal'` | — | `'corp.internal'` | **salvo** |
| `no_proxy` | `undefined` | **`true`** | **`valuesAnyCase(...)[0]` = `'corp.internal'`** | **salvo** |

> **No Windows, `no_proxy` "herda" o valor de `NO_PROXY`** — **e por isso é salvo em vez de marcado**.
>
> **O marcador fica sem nenhum dos dois, e o `restoreUserProxyEnv` restaura os DOIS** — **inclusive `no_proxy`, que o usuário não tinha**.

**E o comentário da L128 diz exatamente isso, como intenção:**

> *"On Windows a `No_Proxy` IS `NO_PROXY` to the child and to the relaunched app … it is saved like an exact match; **marked as added, the restore would delete it**"*

> **A intenção está certa para o Windows** — **preservar o `No_Proxy` de quem tinha**.
>
> **O defeito é que ela não distingue "o usuário tinha `No_Proxy`" de "o usuário tinha `NO_PROXY` e o Windows trata como a mesma coisa"** — **e no segundo caso cria uma variável que ninguém definiu.**

---

## E O TESTE?

```ts
const user = { PATH: '/usr/bin', NO_PROXY: 'corp.internal' }   // ← só a maiúscula
```

> **`'/usr/bin'` e `corp.internal`** — **o teste descreve um ambiente Linux**.
>
> **E ele roda no Windows**, onde **`isWindows` é `true` por padrão** — **e o caminho que ele exercita não é o que ele descreve**.

**É a mesma classe da r41 e da r103**: **o teste não fixa a plataforma, e o comportamento depende dela.** **O `apps/desktop/AGENTS.md` tem a regra**: *"host-specific behaviour is tested on that host with `@pytest.mark.platforms(...)`, never by faking `sys.platform`"* — **e aqui não há marcação nenhuma.**

---

## O QUE ISSO MUDA

| O que eu pensava (r181) | **O que é (r183)** |
|---|---|
| "o `restoreUserProxyEnv` não apaga `no_proxy`" | **ele apaga o que o marcador diz** — e o marcador está certo |
| "o produto deixa uma variável de proxy sobrando" | **no Windows, sim** — **porque o `no_proxy` foi criado a partir do `NO_PROXY` e depois tratado como se fosse do usuário** |
| "bug no produto" | **há um defeito real E um teste que não testa o que diz** |

> **As duas coisas são verdadeiras, e a segunda esconde a primeira**: **consertar o teste para fixar `isWindows: false` faria ele passar** — **e o defeito do Windows continuaria lá**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| `console.log` que resolveu | **1** |
| Funções inocentadas | **1** (`restoreUserProxyEnv`) |
| **Causa identificada** | ✅ **`isWindows` herda o valor e salva em vez de marcar** |
| **Defeito corrigido** | ❌ **não** — ver "o que falta" |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O QUE FALTA — e é uma decisão, não uma linha

**Duas saídas, e elas não são equivalentes:**

| Opção | O que faz | O que custa |
|---|---|---|
| **A.** marcar `no_proxy` como `added` no Windows | o restore **apaga** — e **quem tinha `No_Proxy` de verdade perde a variável** | **quebra o caso que o comentário protege** |
| **B.** guardar as duas coisas: o valor **e** se a grafia existia | o restore **restaura só o que existia** | **uma chave a mais no ambiente** (`HERMES_UPDATE_ABSENT_<key>`) |

> **A opção B é a correta** — **e ela precisa de um campo novo no marcador**, **o que é uma mudança de contrato do próprio arquivo**, não um ajuste.
>
> **Ela fica para a próxima, com o teste do Windows ao lado do teste do Linux** — **porque uma correção que quebra o caso do `No_Proxy` trocaria um bug por outro.**

---

## A LIÇÃO — o teste que não testa o que diz

> **O teste se chama "extends the user's own NO_PROXY … and restores it"** e **usa um caminho Linux**.
>
> **Ele rodou no Windows por 40 rodadas, falhando, e a sessão o chamou de flaky.**
>
> **"Flaky" era a palavra errada para um teste que sempre falha na mesma máquina** — **e a palavra certa é "mal-escrito", que é mais desconfortável porque implica que o defeito pode estar dos dois lados.**

---

## PRÓXIMA RODADA

**A opção B** — o marcador guarda a ausência, o restore não inventa variável — **com um teste para Linux e um para Windows**, **e o vermelho como especificação**.

> **183 rodadas.** **O `console.log` respondeu em uma execução o que três leituras não responderam** — **e a resposta foi melhor que a hipótese**: **não era um bug, eram dois**, **um no produto e um no teste que o escondia**.
