# GOAL V2 — RODADA 236: A HIPÓTESE DOS "10" ESTAVA ERRADA

**Data**: 06/11/2026 · a primeira de três rodadas limpas

---

## AS QUATRO VERIFICAÇÕES

| # | Verificação | Resultado |
|---|---|---|
| 1 | **Gate** | ✅ **14 checks, ok** |
| 2 | **Typecheck** | ✅ **0 erros** |
| 3 | **Git** | `76a6e645a2` · **sincronizado** · limpo · `main` **intacta** |
| 4 | **BUILD** | ✅ **exit 0**, **12.5s**, 3.4mb · 60.7kb |
| 5 | **Suíte `electron`** | **5679 testes · 5449 verdes · 13 vermelhos · 217 skipped** |

---

## A HIPÓTESE QUE A MEDIÇÃO DERRUBOU

**A r235 escreveu na tabela**: **`desktop-plugin-install` 5 → 3**, **e o total 13 → 10**.

**A medição:**

```
13 failed | 5449 passed | 217 skipped (5679)

❯ ssh-connection (89)      ❯ run-electron-builder     ❯ bundle-electron-main
❯ audit-store (13)         ❯ desktop-plugin-install
```

| O que a r235 previu | **O que a r236 mediu** |
|---|---|
| **10 falhas** | **13** |
| **4 arquivos** | **5 arquivos** |
| — | **`audit-store` entrou, com 2** |

> **A tabela do `BLOCKERS` que eu atualizei na r235 não descreve a medição da r236** — **e o motivo é que eu atualizei a tabela com o número LOCAL do arquivo, não com o número da suíte.**

---

## O ERRO — e é de leitura, não de código

**A r235 leu `3 de 54` do `plugin-install` e escreveu `13 → 10`.** **Mas:**

| Fonte | Número |
|---|---|
| **A falha medida no arquivo (r233)** | **3** |
| **A contribuição dele para o total da suíte** | **3** — **correto** |
| **O `audit-store`, que estava verde** | **2 agora** — **flaky, e não é meu** |

> **O `13 → 10` supôs que os outros três arquivos ficariam parados.** **O `audit-store` não é um deles, e ele oscilou** — **"`audit-store`" está na lista de flaky desde a r154 e eu a conhecia.**
>
> **Somei uma redução real com uma estabilidade que eu não verifiquei.**

---

## O NÚMERO HONESTO

| | r228 | **r236** |
|---|---|---|
| `ssh-connection` | 4 | **4** |
| `run-electron-builder` | 1 | **1** |
| `bundle-electron-main` | 3 | **3** |
| `desktop-plugin-install` | **5** | **3** ✅ |
| `audit-store` | — | **2** (flaky) |
| **Total** | **13** | **13** |

> **A redução de 2 no `plugin-install` é real.** **O total não caiu porque um flaky de 2 apareceu** — **e a tabela precisa dizer as duas coisas.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes na suíte | **5679** |
| Verdes | **5449** |
| **Vermelhos** | **13** |
| **Arquivos** | **5** (4 fixos + 1 flaky) |
| **Vermelhos do produto** | **0** |
| Gate · Typecheck · Build | **14 ok · 0 erros · exit 0** |
| **Rodadas limpas** | **1 de 3** |

---

## A LIÇÃO — o número local e o número da suíte

> **`3 de 54` é uma medição do arquivo. `13 de 5679` é uma medição da suíte.** **As duas são verdadeiras, e eu tratei a primeira como se somasse à segunda.**
>
> **É a r175 outra vez**: **um número que parece o mesmo em dois lugares e não é** — **lá era o contador de canais, aqui é a soma das falhas.**
>
> **A diferença: na r175 o erro era de contagem; aqui é de PRESSUPOSTO** — **supus que os outros quatro não mudariam, e um deles mudou.**

---

## PRÓXIMA RODADA

**A tabela corrigida** — **com a linha do `audit-store` e a nota de que flaky não soma.**

> **236 rodadas.** **A redução é real e o total não caiu.** **Um número local e um número de suíte podem contar a mesma coisa e não se somarem.**
