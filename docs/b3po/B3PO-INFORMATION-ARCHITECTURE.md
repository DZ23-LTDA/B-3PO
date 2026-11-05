# B-3PO — ARQUITETURA DA INFORMAÇÃO

**Rodada**: 23 do GOAL V2 (§13) · **Data**: 05/11/2026
**Estado**: **ESPECIFICAÇÃO**. Nenhuma rota removida, nenhum menu alterado nesta rodada.

---

## 0. O QUE O §13 MANDA, E O QUE ELE PROÍBE

**Manda**:

> *"Adotar navegação contextual por ambiente. Ambientes principais: 1. EMPRESA — criar, administrar e operar negócios. 2. ENGENHARIA E CRIACAO — desenvolver SaaS, sites, apps, APIs, jogos, sistemas e produtos."*

**Proíbe, com todas as letras**:

> *"**Não escolher a opção A/B sugerida pelo DeepSeek** como arranjo definitivo."*

**E protege o que existe**:

> *"Não remover rotas nem funcionalidades existentes sem mapear consumidores, permissões, links, deeplinks, testes e redirects."*

---

## 1. O QUE EXISTE HOJE — 31 rotas

| # | Rota | View | Natureza |
|---|---|---|---|
| 1 | `/session-import` | session-import | plataforma |
| 2 | `/new` | chat | plataforma |
| 3 | `/settings` | settings | **configuração** |
| 4 | `/command-center` | command-center | plataforma |
| 5 | `/capabilities` | capabilities | plataforma |
| 6 | `/messaging` | messaging | **canal** |
| 7 | `/webhooks` | webhooks | plataforma |
| 8 | `/artifacts` | artifacts | **criação** |
| 9 | `/cron` | cron | **automação** |
| 10 | `/agenda` | agenda | **operação** |
| 11 | `/compras` | compras | **comércio** |
| 12 | `/agentes` | agentes | **IA** |
| 13 | `/posvenda` | posvenda | **crescimento** |
| 14 | `/marketing` | marketing | **crescimento** |
| 15 | `/painel` | painel | **visão geral** |
| 16 | `/automacoes` | automacoes | **automação** |
| 17 | `/sofia` | sofia | **IA** (r21) |
| 18 | `/documentos` | documentos | **inteligência** |
| 19 | `/privacidade` | privacidade | **configuração** |
| 20 | `/atendimento` | atendimento | **operação** |
| 21 | `/crm` | crm | **operação** |
| 22 | `/empresa` | empresa | **configuração** *(ver §3)* |
| 23 | `/finance` | finance | **comércio** |
| 24 | `/products` | products | **comércio** |
| 25 | `/sales` | sales | **comércio** |
| 26 | `/rh` | rh | **operação** |
| 27 | `/servicos` | servicos | **operação** |
| 28 | `/stock` | stock | **comércio** |
| 29 | `/profiles` | profiles | plataforma |
| 30 | `/agents` | agents | **IA** (runtime) |
| 31 | `/starmap` | starmap | plataforma |

**18 estão no menu** (r21). **13 não estão** — e essa é a primeira dívida: existem, resolvem por URL, e o usuário **não chega** nelas por navegação.

---

## 2. OS DOIS AMBIENTES

### EMPRESA — criar, administrar e operar negócios

Agrupamento que o §13 fixa:

| Grupo | Telas |
|---|---|
| **Visão geral** | `/painel` |
| **Operação** | `/crm` · `/atendimento` · `/agenda` · `/servicos` · `/rh` |
| **Comércio** | `/products` · `/stock` · `/compras` · `/sales` · `/finance` · *(logística, quando houver)* |
| **Crescimento** | `/marketing` · `/posvenda` |
| **Inteligência e automação** | `/sofia` · `/agentes` · `/automacoes` · `/documentos` |
| **Configuração** | `/empresa` · `/privacidade` · `/settings` |

### ENGENHARIA E CRIAÇÃO — desenvolver produtos

O §13 diz: *"navegação própria para projetos, repositórios, issues/tarefas, arquitetura, código, testes, CI/CD, artefatos e entregas, **conforme recursos comprovados**."*

**O que existe hoje**: `/artifacts` (artefatos). **O que não existe**: projetos, repositórios, issues, arquitetura, CI/CD.

| Grupo | Telas | Estado |
|---|---|---|
| **Trabalho** | `/artifacts` | ✅ existe |
| **Projetos** | — | ❌ **não existe** (é o Project Builder do §12) |
| **Repositórios / código** | — | ❌ **não existe** (há `git-ipc`, sem tela) |
| **Testes / CI-CD** | — | ❌ **não existe** |

**Consequência honesta**: o ambiente ENGENHARIA hoje teria **uma tela**. Criar o ambiente com uma tela é pior que não criar — daria a impressão de um produto que não existe.

---

## 3. A COLISÃO DE NOMES QUE O §13 APONTA

> *"'Empresa' como ambiente não deve ser confundida com configuração da organização; renomear a configuração para 'Organização' ou equivalente."*

**Hoje**: `/empresa` é a **configuração da organização** (CNPJ, fuso, moeda, imposto) — e na r15 eu a subi para o 2º item do menu, porque **é o contexto de tudo**.

**Depois do §13**: "Empresa" passa a ser o **nome do ambiente**. Manter `/empresa` como configuração criaria exatamente a confusão que o §13 proíbe.

**Decisão proposta**: a rota **continua** `/empresa` (removê-la exigiria mapear consumidores — o §13 proíbe sem isso), e o **rótulo no menu** passa a ser **"Organização"**.

> **A rota é identificador técnico; o rótulo é produto.** Trocar o rótulo não quebra link, deeplink nem teste; trocar a rota quebraria os três.

---

## 4. O QUE O SDK PERMITE HOJE

```ts
export interface SidebarNavContribution {
  codicon: string
  label: string
  path: string
  tier?: InterfaceTier     // 'advanced' | undefined
}
```

**Não há campo de ambiente nem de grupo.** Três caminhos:

| Caminho | Custo | Risco |
|---|---|---|
| **A.** Estender `SidebarNavContribution` com `ambiente?: 'empresa' \| 'engenharia'` + render filtrando | mudança no SDK + os 2 consumidores existentes (kanban e teste) | médio — muda contrato compartilhado |
| **B.** Filtro no plugin: registrar todos e o plugin decide quais expõe, por um estado de ambiente | **nenhuma mudança no SDK** | baixo — mas o menu só reage a re-render |
| **C.** Duas áreas `SIDEBAR_NAV_AREA` distintas | contornar o SDK por convenção | **alto** — duas áreas para a mesma coisa é o começo de uma terceira |

**Recomendação: B.** É o único que **não muda contrato compartilhado** e não duplica área. O §13 não exige que o SDK saiba de ambientes — exige que **o usuário veja o menu do contexto em que está**.

---

## 5. O QUE NÃO PODE ACONTECER

O §13 proíbe remover rota sem mapear. A matriz (§ `B3PO-NAVIGATION-AND-UX-SPEC.md`) lista, para **cada** das 31, quem consome. **Nenhuma será removida nesta fase.**

E a regra que vale desde a r2: **uma tela sem item de menu é código inalcançável** — e há **13 assim hoje**.
