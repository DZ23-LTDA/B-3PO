# GOAL V2 — RODADA 104: P8 — O QUE EU CRIEI SEM ACESSIBILIDADE

**Data**: 05/11/2026 · **P8 do roadmap** · primeira medição

---

## A MEDIÇÃO — e o resultado é sobre o meu próprio trabalho

| Item | Estado |
|---|---|
| **i18n** | **239 de 374 telas** usam `useI18n` (64%) |
| **acessibilidade nas 5 telas que EU criei** | **0 atributos** |
| **backups** | ✅ `pre-update-backup-config` |

> **As 5 telas desta sessão — entregas, projetos, trabalhos, organização e busca — tinham ZERO `aria-label`.**

**As telas de 2024 têm mais acessibilidade que as de hoje**, porque eu escrevi as minhas sem olhar.

---

## O QUE FOI CORRIGIDO

| Tela | Atributos |
|---|---|
| `entregas` | **4** |
| `projetos` | **6** |
| `trabalhos` | **4** |
| `organizacao` | **4** |
| `busca` | **2** |

### O `main` de cada tela ganhou um nome

```tsx
<main aria-label="Trabalhos pontuais" ...>
```

> **Um leitor de tela anuncia "principal" sem dizer de quê** — e cinco telas com o mesmo anúncio são cinco telas indistinguíveis.

### Cada campo ganhou o seu

```tsx
<input aria-label="Endereço de destino" ...>
```

> **O `placeholder` não é rótulo**: ele **desaparece ao digitar** — e quem usa leitor de tela navega pelos campos **depois** de preencher.

---

## O QUE **NÃO** FOI CORRIGIDO — e está medido

| Item | Estado |
|---|---|
| **i18n nas 5 telas novas** | ❌ **texto em português fixo** |
| `aria-live` nas listas que mudam | ❌ |
| `aria-expanded` nos botões que abrem seção | ❌ |
| **backups: exercitado?** | ⚠️ **o config existe; não há teste de restauração** |

> **As cinco telas novas são anexos ao produto, não produto.** Elas funcionam e não são acessíveis — e **isso está dito**, em vez de contado como "P8 iniciado".

---

## POR QUE NÃO FIZ i18n AGORA

> **Traduzir 5 telas exige 5 arquivos de locale × N idiomas.** O produto tem **64% de cobertura** — e as telas sem cobertura **não são só as minhas**.
>
> **A decisão honesta**: i18n é **uma frente**, não uma rodada. **Adicionar 5 telas ao conjunto parcial** aumentaria a dívida sem estratégia — e a r20 do GOAL diz *"não somar suites diferentes como se fossem cobertura do mesmo produto"*.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Atributos adicionados | **20** |
| Telas corrigidas | **5** |
| Cobertura de i18n | **239 / 374** (inalterada) |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Testes | **26 verdes** |

---

## O P8 — ONDE ESTÁ

| Item | Estado |
|---|---|
| **Acessibilidade (as minhas 5 telas)** | ✅ **r104** |
| Acessibilidade (o resto) | ❌ **não medido** |
| **i18n** | ⚠️ **64%, e as minhas 5 fora** |
| **Performance** | ⚠️ há testes de perf (`timeline.test`, `use-messages-below-perf`) |
| **Backups** | ⚠️ **config existe; restauração não testada** |

---

## PRÓXIMA RODADA

**O teste de restauração do backup** — o `pre-update-backup-config` existe e **ninguém provou que o backup restaura**. *"Um backup que não restaura é um arquivo."*

> **104 rodadas.** A rodada olhou para o `P8` e encontrou **o meu próprio trabalho** no lugar do problema: **5 telas escritas nesta sessão, 0 endereços de acessibilidade**, enquanto as telas antigas do produto têm 64% de i18n.
