# GOAL V2 — RODADA 88: O STORE DA ESTRUTURA — E POR QUE NÃO DENTRO DE `companies-store`

**Data**: 05/11/2026 · **§12** · organização permanente, camada 2

---

## A PERGUNTA QUE A r87 DEIXOU

> *"A primeira pergunta é se `companies-store` já serve de store."*

## A RESPOSTA, MEDIDA

`companies-store` (186 linhas) guarda **o cadastro e as filiais**: CNPJ, endereço, nome — e tem `upsertBranch`.

> **Tem `branches` (unidades), mas não tem departamentos.**

---

## A DECISÃO: **store próprio**, e não um campo a mais

> `companies-store` guarda **o cadastro** — trezentas empresas cabem ali.
>
> O que a r81 desenhou é outra coisa: **departamentos e o que cada um faz**. Isso muda **quando a operação muda**, não quando a empresa muda de endereço — e são **duas frequências de mudança diferentes**.

### Mas **não são duas verdades sobre a mesma empresa**

> **`company_id` liga, e cada campo tem um dono só.** O cadastro é de `companies-store`; o desenho é daqui; `organization.ts` valida o desenho.

---

## AS TRÊS DECISÕES DO STORE

### 1. **Empresa inexistente recusa**

```ts
if (!(await this.directory.exists(companyId))) return { error: 'empresa_inexistente' }
```

> **Uma estrutura sem cadastro é um organograma solto.** E a checagem é feita **aqui**, não na tela: **o canal pode ser chamado direto**.

**E ela é feita por uma interface mínima** (`CompanyDirectory`), não importando `companies-store`: o store não precisa do cadastro inteiro, só saber **se existe**.

### 2. **Uma estrutura por empresa** — definir de novo **substitui**

> *"Duas deixariam «quem faz o quê» sem resposta."*

### 3. Estrutura de **setor desconhecido** é descartada na leitura

> *"Ela veio de **uma sugestão inventada**, e uma sugestão que o produto não sabe validar **não deve virar o desenho de uma empresa**."*

---

## A PROVA — 15 testes novos (37 no total)

| Grupo | O que trava |
|---|---|
| **caminho** | **setor desconhecido é descartado** · **sem `company_id` é descartada** |
| **definir** | grava o desenho · **empresa inexistente recusa** |
| | **setor inválido recusa** · **departamento duplicado recusa** — a regra da r81 atravessa o disco |
| | **uma estrutura por empresa** · **sobrevive a instância nova** |
| **consultas** | `porEmpresa` devolve `null` · **o desenho de outro tenant não aparece** |
| **`setorDoCadastro`** | devolve quando conhecido, `null` quando não |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas | **~240** |
| Testes novos | **15** |
| Total de organização | **37** |
| Regressão (organization + companies) | **51 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §12 — ORGANIZAÇÃO PERMANENTE

| Camada | Estado |
|---|---|
| 1. Regra | ✅ r81 |
| **2. Store** | ✅ **r88** |
| 3–6. Canal · Preload · Wrapper · Tela | ❌ |

> **A organização saiu de 1 para 2 de 6.** — e a decisão de não fundir com `companies-store` foi **medida**, não estética: são **frequências de mudança diferentes**.

---

## PRÓXIMA RODADA

**O canal da estrutura** — `hermes:organizacao:{estrutura,definir}` com guarda, mais a **sugestão** por setor (`estruturaPara` da r81) como canal de leitura.

> **88 rodadas.** A organização ganhou o seu segundo arquivo — e o argumento para ele **não** ser um campo em `companies-store` está escrito: **cadastro muda quando a empresa muda; desenho muda quando a operação muda**.
