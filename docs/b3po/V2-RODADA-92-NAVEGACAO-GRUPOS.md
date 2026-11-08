# GOAL V2 — RODADA 92: §13 — A NAVEGAÇÃO POR GRUPOS, E A AMBIGUIDADE QUE EU CRIEI

**Data**: 05/11/2026 · **§13 — NAVEGAÇÃO** · primeira leitura

---

## O BUG QUE A r91 CRIOU — e o §13 nomeia

**Medido no menu:**

```
{ label: 'Organização', path: '/empresa' }      ← r24
{ label: 'Organização', path: '/organizacao' }  ← r91
```

**Duas entradas com o mesmo rótulo.**

> **O §13:444-445 diz exatamente isso**: *"«Empresa» como ambiente não deve ser confundida com configuração da organização; renomear a configuração para «Organização» ou equivalente."*
>
> **A r24 tinha renomeado `/empresa` para «Organização»** quando o §13 criou o ambiente EMPRESA — e a r91, sem saber, criou **a segunda**.

---

## A CORREÇÃO

| Rota | Antes | Agora | Por quê |
|---|---|---|---|
| `/empresa` | Organização | **Empresa** | é o **ambiente** do §13:417 |
| `/organizacao` | Organização | **Estrutura** | nome preciso do que ela é: **quem faz o que** |

> **«Estrutura» descreve o que a r91 fez** (departamentos, funções) — e **não colide** com nenhum outro rótulo.
>
> **As rotas continuam**: o §13:456 manda mapear consumidores antes de remover, e **o rótulo resolve sem remover nada**.

---

## OS GRUPOS DO §13:429-438

| # | Grupo | Itens |
|---|---|---|
| 1 | **Visão geral** | **Painel · Empresa** |
| 2 | **Operação** | Atendimento · Agenda · **Serviços · RH** |
| 3 | **Comércio** | Produtos · Estoque · Compras · Vendas · Entregas · Financeiro |
| 4 | **Trabalho** | Projetos · Trabalhos |
| 5 | **Crescimento** | Marketing · Pós-venda |
| 6 | **Inteligência e automação** | Agentes · Automações · Sofia · Documentos |
| 7 | **Configuração** | Estrutura · Privacidade |

### A seção que o §13 **não** previu

> **O §13 foi escrito antes do §12**, então não tem grupo para projeto e trabalho pontual.
>
> **Eles não são «comércio» nem «configuração»: são o trabalho que atravessa os dois.** A seção existe — **e a ausência dela no texto do GOAL está dita**, não escondida.

### E `Serviços`/`RH` subiram de posição

> O §13:432 os põe em **Operação**: **o serviço prestado e a equipe que presta são operação, não venda de produto.**

---

## O TESTE DA r15 SABIA MAIS QUE EU

O teste `Empresa vem logo depois de Painel, nao no fim` **falhou** quando pus `Empresa` na configuração.

> **E estava certo**: `/empresa` **não é configuração** — é o **ambiente**, e vem logo após o Painel porque **é o contexto de tudo o que segue**.
>
> **A configuração é «Estrutura»** — que fica no último grupo.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Grupos | **7** |
| Rótulos corrigidos | **2** |
| Rotas removidas | **0** |
| Testes de menu | **13 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §13 — ONDE ESTÁ

| Item | Estado |
|---|---|
| **Agrupar por fluxo de trabalho** | ✅ **r92** |
| **`Empresa` ≠ configuração** | ✅ **r92** |
| Seletor de ambiente | ❌ |
| Busca global | ❌ |
| Modo Engenharia | ❌ |
| **3 documentos** (`INFORMATION-ARCHITECTURE`, `NAVIGATION-AND-UX-SPEC`, mapa de rotas) | ❌ |

---

## PRÓXIMA RODADA

**Os entregáveis do §13** — `B3PO-INFORMATION-ARCHITECTURE.md` e o **mapa de rotas**, que são o que o §13:459-462 pede explicitamente.

> **92 rodadas.** A navegação passou a ter **sete grupos** em vez de uma lista de 23 — e a rodada corrigiu **uma ambiguidade que eu mesmo criei** na r91: dois itens chamados "Organização", um sendo o ambiente e o outro a configuração.
