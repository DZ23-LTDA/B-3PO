# GOAL V2 — RODADA 193: A 4ª ORDEM FECHADA — SEIS DE SEIS

**Data**: 06/11/2026 · **4ª ordem do owner** · *"corrigir os problemas de inicialização e atualização do Desktop"*

---

## O RESULTADO

```
npx vitest run packaged-working-directory updater channel-build-version \
               state-db-preflight checkout-source system-proxy-env
  Tests  230 passed | 37 skipped (267)
```

> **Os seis arquivos que a r181 abriu, rodando juntos, verdes.**

---

## O QUE A r193 MEDIU — e o que ela **não** precisou fazer

| Arquivo | Estado na r181 | **Na r193** |
|---|---|---|
| `system-proxy-env` | ❌ | ✅ r184 |
| `packaged-working-directory` | ❌ | ✅ r186, r189, r190 |
| `checkout-source` | ❌ | ✅ r188 |
| `channel-build-version` | ❌ | ✅ r192 |
| **MSIX manifest** | ❌ | ✅ **r192 — é o MESMO `test` do #4** |
| **`state-db-preflight`** | ❌ | ✅ **já estava verde: efeito da r188** |

> **O #5 e o #6 não precisaram de rodada própria.**
>
> **O #5 é o mesmo `test` que o #4** — a r192 fechou os dois com uma linha de fixture.
>
> **O #6 fechou com a r188**: o `state-db-preflight` **também chama Python**, e **o `HERMES_PYTHON` resolvido no Windows o destravou sem que eu o tocasse.**

**Isso é a prova de que as correções eram da MESMA raiz**: **um caminho do Windows que o fixture não preparava**, e **um `globalSetup` que pulava onde importava**.

---

## A 4ª ORDEM — FECHADA

| # | Bug | Corrigido em |
|---|---|---|
| **1** | `system-proxy-env` — o `no_proxy` que sobra | **r184** |
| **2** | `packaged-working-directory` — fixture, limpeza, árvore | **r186, r189, r190** |
| **3** | `checkout-source` — o interpretador | **r188** |
| **4** | `channel-build-version` + o MSIX | **r192** |
| **5** | MSIX manifest | **r192 (junto com o #4)** |
| **6** | `state-db-preflight` | **r188 (efeito)** |

> **Seis de seis.** **E a quarta ordem não era o B5** — **era seis defeitos que a sessão chamava de "flaky" há 40 rodadas.**

---

## O QUE A 4ª ORDEM **NÃO** RESOLVE

| Item | Por quê |
|---|---|
| **B5 — instalar o MSIX no Windows** | **precisa de uma máquina real e de um certificado** — **os testes provam o gerador, não a instalação** |
| **o MSIX está velho relativo ao build** | **regenerar exige assinar** |

> **O escopo do que os testes cobrem está escrito**: **eles exercitam o `record`, o writer do manifesto e o resolve do interpretador** — **não a instalação na Store.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Bugs da 4ª ordem** | **6 de 6** ✅ |
| **Testes da 4ª ordem** | **230 verdes, 37 skipped** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## AS SETE ORDENS — O ESTADO

| # | Ordem | Estado |
|---|---|---|
| **1** | Proteger e reconciliar o estado | ✅ r1–r40 |
| **2** | Autorização IPC | ✅ r60–r176 |
| **3** | CRM órfão e fontes de verdade | ✅ r133–r149 |
| **4** | **Inicialização e atualização** | ✅ **r184–r193** |
| **5** | Navegação contextual | ✅ r174 |
| **6** | Sofia | ✅ r100–r132 |
| **7** | Orquestrador e negócios | ✅ r174 |

> **Seis fechadas com prova. A sétima (orquestrador) está montada e com 8 ligações + o ciclo.**
>
> **O que resta é o que depende do dono: o B5, as credenciais (B2–B4) e o certificado (B1).**

---

## A LIÇÃO — a ordem que não era uma, eram seis

> **A r4ª estava registrada como "B5 — o MSIX precisa do dono"**. **Eram seis defeitos reais** — **e cinco deles eram fixtures que não preparavam o caminho do Windows**.
>
> **A frase "é flaky" custou 40 rodadas.** **E o que a desfez foi rodar UM arquivo sozinho** — **a r181 fez isso em uma execução.**

---

## PRÓXIMA RODADA

**A verificação completa** — build, as duas suítes e o `diff --check` — **e depois o wrapup**.

> **193 rodadas.** **A 4ª ordem fechou, e o que a fechou não foi escrever código novo: foi abrir seis arquivos vermelhos e ler a mensagem de cada um.**
