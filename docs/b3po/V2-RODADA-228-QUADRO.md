# GOAL V2 — RODADA 228: O QUADRO FECHADO — QUATRO ARQUIVOS, SEIS CAUSAS, ZERO DO PRODUTO

**Data**: 06/11/2026 · `ssh-connection`, o último a medir

---

## AS QUATRO FALHAS DO `ssh-connection`

| Teste | Erro | Causa |
|---|---|---|
| **1** | `default control socket + temp suffix must fit sun_path (got 105: C:\Users\…)` | **o limite de 108 bytes do socket Unix** não cabe um caminho do Windows |
| **2** | `close() does not report a signal-killed -O exit…` | **semântica de sinal POSIX** |
| **3** | `forward() does not classify a signal death…` | **idem** |
| **4** | `mux forward keeps the ControlPersist master alive…` | **idem** |

> **4 de 89.** **Nenhuma é do B-3PO, e nenhuma é do produto `ssh` em si**: **são três asserções sobre como um processo morre** — **e o Windows não morre por sinal** — **e uma sobre o comprimento de um caminho.**

---

## O QUADRO — completo, com as seis causas

| Arquivo | Falhas | Causa | Natureza |
|---|---|---|---|
| **`ssh-connection`** | **4 de 89** | **`sun_path` + sinais POSIX** | **infraestrutura** |
| **`run-electron-builder`** | **1 de 5** | **`prepared-packaging` recusa os inputs** | **hospedeiro** |
| **`bundle-electron-main`** | **3 de 5** | **`desktop.electron_flags` não lido** | **hospedeiro** |
| **`desktop-plugin-install`** | **5 de 54** | **CRLF + symlink** | **ambiente** |

**Seis causas para 13 falhas:**

| # | Causa | Onde |
|---|---|---|
| **1** | **`sun_path` de 108 bytes** | `ssh-connection` |
| **2** | **sinais POSIX** | `ssh-connection` (×3) |
| **3** | **`prepared-packaging`** | `run-electron-builder` |
| **4** | **`electron_flags` não lido** | `bundle-electron-main` (×3) |
| **5** | **CRLF do git** | `desktop-plugin-install` (×3) |
| **6** | **symlink sem elevação** | `desktop-plugin-install` (×2) |

> **Zero é do B-3PO.** **Zero é de uma funcionalidade do produto.**
>
> **E nenhuma das seis é um defeito**: **cinco são diferenças de plataforma, uma é uma garantia do app hospedeiro que não está sendo cumprida.**

---

## O QUE ISSO MUDA NO RELATÓRIO

**Antes**, a linha era:

```
13 failed | 5451 passed | 215 skipped (5679)
```

**Agora**, a mesma linha com as causas:

| Arquivo | Falhas | **Por quê** |
|---|---|---|
| `ssh-connection` | 4 | **o Windows não tem `sun_path` nem sinal** |
| `run-electron-builder` | 1 | **o pacote preparado foi recusado** |
| `bundle-electron-main` | 3 | **o config não foi lido** |
| `desktop-plugin-install` | 5 | **CRLF do git e symlink sem privilégio** |

> **A segunda tabela é o mesmo número com a informação que falta na primeira.** **E é a diferença entre "13 falhando" e "13 falhando por seis motivos que eu nomeei".**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Arquivos medidos | **4 de 4** ✅ |
| **Causas nomeadas** | **6** |
| **Falhas** | **13** |
| **Do B-3PO** | **0** ✅ |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o relatório que conta e o que explica

> **A r154 dizia "42 falhando". A r228 diz "13 falhando por seis motivos", e cada motivo tem um arquivo e uma linha.**
>
> **O número caiu porque as causas eram menos do que pareciam** — **e o relatório ficou útil porque cada uma tem nome.**
>
> **Um vermelho sem causa é uma suspeita. Um vermelho com causa é um fato sobre a máquina.**

---

## PRÓXIMA RODADA

**O registro atualizado** — **a lista dos quatro com as seis causas vai para o `BLOCKERS`**, **como dívida de plataforma, não como bloqueio de produto**.

> **228 rodadas.** **Quatro arquivos, seis causas, zero do produto.** **E o quadro está fechado: o que resta não é uma pergunta, é uma lista com nome em cada linha.**
