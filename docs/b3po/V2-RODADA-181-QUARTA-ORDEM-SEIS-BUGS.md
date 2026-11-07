# GOAL V2 — RODADA 181: A 4ª ORDEM — E OS SEIS BUGS QUE NÃO ERAM FLAKY

**Data**: 06/11/2026 · **4ª ordem do owner** · *"corrigir os problemas de inicialização e atualização"*

---

## O QUE A SESSÃO ACREDITAVA

> **"Os 17 arquivos que falham são de infraestrutura ou do upstream, e a flakiness oscila."**

**Verdade para a maioria.** **Mas não para todos.**

---

## A MEDIÇÃO — isolados, sem ninguém ao lado

```
npx vitest run electron/packaged-working-directory electron/updater/system-proxy-env
             electron/updater/checkout-source electron/updater/state-db-preflight
             electron/channel-build-version
                                                                  →  8 testes, 6 FALHAM
```

> **Seis falham SOZINHOS.** **Não é flakiness: é bug.**

| # | Arquivo | O que o teste diz que deveria acontecer |
|---|---|---|
| **1** | `system-proxy-env` | *"extends the user's own **NO_PROXY** instead of replacing it, **and restores it**"* |
| **2** | `packaged-working-directory` | *"packaged startup **releases the install CWD** before main can pass it"* |
| **3** | `checkout-source` | *"carries each install **channel** from Python publication checks into the source handoff"* |
| **4** | `channel-build-version` | *"channel stamps **verify the real checkout** and retain source version"* |
| **5** | *(MSIX manifest)* | *"the actual MSIX manifest writer **consumes the channel quad** across rollover"* |
| **6** | `state-db-preflight` | *"the desktop preflight **publishes committed WAL rows** before its caller can stop"* |

> **Todos os seis são exatamente a 4ª ordem**: **inicialização** (1, 2, 6) e **atualização** (3, 4, 5).

---

## O PRIMEIRO, ABERTO

```ts
// system-proxy-env.test.ts:85-90
const user = { PATH: '/usr/bin', NO_PROXY: 'corp.internal' }
const env = await systemProxyEnv(user, pac({ 'github.com': 'PROXY 10.0.0.7:7890' }))

expect(env.NO_PROXY).toBe([…])                        // ✅ passa
expect(env.no_proxy).toBe(env.NO_PROXY)               // ✅ passa (npm e uv leem minúsculo)
expect(restoreUserProxyEnv({ ...user, ...env })).toEqual(user)   // ❌ FALHA
```

**A mensagem:**

```
expected { PATH: '/usr/bin', …(2) } to deeply equal { PATH: '/usr/bin', …(1) }
  + "no_proxy": "corp.internal"
```

> **O `systemProxyEnv` escreve as DUAS grafias de propósito** — e está certo: **`NO_PROXY` para git e Python, `no_proxy` para npm e uv**.
>
> **Mas o `restoreUserProxyEnv` só apaga e restaura `NO_PROXY_KEYS`** — e **`no_proxy` sobra no ambiente**.
>
> **O efeito real**: **depois de uma atualização, o usuário fica com uma variável de proxy que ele não definiu** — **e que o próximo update vai herdar como se fosse dele**.

---

## O QUE ESTA RODADA **NÃO** FEZ

| Item | Estado |
|---|---|
| **Medir os seis** | ✅ **feito — e eles são reais** |
| **Corrigir o primeiro** | ❌ **não** — **preciso ver o `NO_PROXY_KEYS` e o marker antes de tocar** |
| **Corrigir os outros cinco** | ❌ **não** |

> **Eu não vou corrigir seis bugs em cinco minutos no fim de uma rodada.** **O valor desta rodada é ter PROVADO que eles existem** — e **ter derrubado a frase que a sessão repetia**: *"são todos flaky"*.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos medidos | **5** |
| Testes | **8** |
| **Falhas isoladas (bugs reais)** | **6** |
| **Corrigidos** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A 4ª ORDEM — DE "B5" PARA "SEIS BUGS"

| Antes | **Agora** |
|---|---|
| *"a 4ª ordem é o B5: o MSIX precisa do dono"* | **"a 4ª ordem tem SEIS bugs reais, medidos, e um deles é do produto"** |

> **O B5 continua** — **mas ele não era a história toda**. **Havia seis defeitos em `inicialização e atualização` que a sessão estava chamando de flaky.**

---

## A LIÇÃO — a frase que a conveniência escreveu

> **"É flaky" é a conclusão mais confortável para um teste vermelho que ninguém entende.**
>
> **Ela é verdadeira muitas vezes** — **a r167 provou isso com 10 testes em timeout**.
>
> **Mas eu apliquei a MESMA frase a 17 arquivos sem rodar cada um sozinho** — **e seis deles nunca foram flaky**.
>
> **É a r175 outra vez, com outra roupa**: **uma medição agregada ("42 vermelhos") virou uma explicação ("é flaky") sem que eu abrisse cada um.**

---

## PRÓXIMA RODADA

**O primeiro bug** — `restoreUserProxyEnv` e o `no_proxy` que sobra — **com o teste vermelho como especificação**, e **os outros cinco depois**.

> **181 rodadas.** **A 4ª ordem estava escondida atrás de uma palavra.** **"Flaky" é uma hipótese, não uma conclusão** — e **seis arquivos pagaram por eu ter tratado como a segunda.**
