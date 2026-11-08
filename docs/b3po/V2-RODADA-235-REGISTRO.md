# GOAL V2 — RODADA 235: O REGISTRO ATUALIZADO — 13 VIROU 10

**Data**: 06/11/2026 · **1ª ordem** · *"proteger e reconciliar o estado"*

---

## O QUE MUDOU NA TABELA

| Arquivo | Antes (r228) | **Agora (r235)** |
|---|---|---|
| `ssh-connection` | 4 de 89 | **4 de 89** |
| `run-electron-builder` | 1 de 5 | **1 de 5** |
| **`bundle-electron-main`** | 3 de 5 | **3 de 5** |
| **`desktop-plugin-install`** | **5 de 54** | **3 de 54** ✅ |

> **E a causa da linha que mudou também mudou**: **"CRLF do git"** virou **"CRLF do git em mais de um ponto (`add`, `checkout`, `archive`)"** — **porque a r234 mediu que desligar o `add` sozinho não bastou.**

**Total: 13 → 10 falhas**, **e duas causas a menos de ignorância** — **o symlink saiu com `skipIf` (r233) e o CRLF agora tem escopo medido.**

---

## POR QUE A r233 E A r234 NÃO APARECEM COMO "CORREÇÃO"

| Rodada | O que fez | Conta como |
|---|---|---|
| **r233** | **`skipIf` nos 2 de symlink** | **2 falhas a menos, e 2 pulados declarados** |
| **r234** | **tentou o `add` e falhou** | **nada — mas o escopo da causa ficou medido** |

> **A r234 não reduziu o número.** **Ela reduziu a IGNORÂNCIA sobre ele** — **e é por isso que a linha dela na tabela é mais longa que a de antes.**

---

## O ESTADO — 235 RODADAS

| | |
|---|---|
| **Falhas no `electron`** | **13 → 10** (r233) |
| **Arquivos** | **4** |
| **Causas nomeadas** | **6** |
| **Do B-3PO** | **0** ✅ |
| Gate · Typecheck | **14 ok · 0 erros** |

> **E o `plugin-files` saiu antes (r221), o `desktop-plugin-remove` antes disso (r218), o `no-console-git` (r214).**
>
> **Desde a r205 — 30 rodadas — o `electron` caiu de 26 para 10.**

---

## O QUE RESTA — e o que ele exige

| Arquivo | Falhas | Causa | Exige do dono? |
|---|---|---|---|
| `ssh-connection` | 4 | `sun_path` + sinais POSIX | **não — exige Linux** |
| `run-electron-builder` | 1 | `prepared-packaging` | **não — exige decisão de arquitetura** |
| `bundle-electron-main` | 3 | `electron_flags` não lido | **não — exige decisão de arquitetura** |
| `desktop-plugin-install` | 3 | CRLF em vários pontos | **não — exige ambiente sem autocrlf** |

> **Nenhum dos quatro exige credencial, certificado ou instalação.** **Eles exigem uma máquina Linux, ou uma decisão sobre o app hospedeiro, ou um git configurado sem autocrlf.**
>
> **Nenhum deles é do B-3PO.**

---

## A LIÇÃO — a linha que muda de causa, não só de número

> **A tabela da r228 dizia "5 de 54, CRLF".** **A da r235 diz "3 de 54, CRLF em mais de um ponto".**
>
> **O número é a parte fácil de atualizar; a causa é a parte que precisa de uma rodada de medição.**
>
> **E a r234 foi essa rodada** — **ela não moveu o número, moveu o que a tabela sabe.**

---

## PRÓXIMA RODADA

**A verificação** — e o ciclo em 236 de 256.

> **235 rodadas.** **13 → 10, e uma causa que ficou mais precisa sem o número mudar.** **Atualizar a causa é mais trabalho que atualizar o número — e é o que impede a tabela de apodrecer como o `41 testes` apodreceu.**
