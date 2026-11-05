# B-3PO — NAVEGAÇÃO E UX: ESPECIFICAÇÃO + MATRIZ DE MIGRAÇÃO

**Rodada**: 23 do GOAL V2 (§13) · **Data**: 05/11/2026
**Par**: `B3PO-INFORMATION-ARCHITECTURE.md`

---

## 1. A REGRA QUE GOVERNA TODA MUDANÇA AQUI

> *"Não remover rotas nem funcionalidades existentes sem mapear consumidores, permissões, links, deeplinks, testes e redirects."* — §13

**Esta especificação não remove nada.** Cada linha da matriz diz, para cada rota: **quem consome**, **qual o teste**, e **qual o plano**.

---

## 2. MATRIZ DE MIGRAÇÃO — as 31 rotas

Legenda de **plano**:
- **MANTER** — entra no menu do ambiente, sem mudança de rota
- **ROTULAR** — rota igual, rótulo do menu muda
- **ADIAR** — existe, não entra no menu ainda (falta grupo/ambiente onde caiba)
- **PLATAFORMA** — não é de negócio; fica fora dos dois ambientes

| # | Rota | Plano | Ambiente | Grupo | Consumidor hoje |
|---|---|---|---|---|---|
| 1 | `/painel` | MANTER | Empresa | Visão geral | menu (r21) |
| 2 | `/empresa` | **ROTULAR → "Organização"** | Empresa | Configuração | menu, `plugin.test.ts` |
| 3 | `/crm` | MANTER | Empresa | Operação | menu, `crm/*` |
| 4 | `/atendimento` | MANTER | Empresa | Operação | menu |
| 5 | `/agenda` | MANTER | Empresa | Operação | menu |
| 6 | `/servicos` | MANTER | Empresa | Operação | menu |
| 7 | `/rh` | MANTER | Empresa | Operação | menu |
| 8 | `/products` | MANTER | Empresa | Comércio | menu |
| 9 | `/stock` | MANTER | Empresa | Comércio | menu |
| 10 | `/compras` | MANTER | Empresa | Comércio | menu |
| 11 | `/sales` | MANTER | Empresa | Comércio | menu |
| 12 | `/finance` | MANTER | Empresa | Comércio | menu |
| 13 | `/marketing` | MANTER | Empresa | Crescimento | menu |
| 14 | `/posvenda` | MANTER | Empresa | Crescimento | menu |
| 15 | `/sofia` | MANTER | Empresa | Inteligência | menu, `sofia-*` (r17–r22) |
| 16 | `/agentes` | MANTER | Empresa | Inteligência | menu |
| 17 | `/automacoes` | MANTER | Empresa | Inteligência | menu |
| 18 | `/documentos` | MANTER | Empresa | Inteligência | menu |
| 19 | `/privacidade` | MANTER | Empresa | Configuração | menu |
| 20 | `/artifacts` | MANTER | **Engenharia** | Trabalho | — **sem menu hoje** |
| 21 | `/messaging` | ADIAR | — | — | **sem menu** |
| 22 | `/webhooks` | ADIAR | — | — | **sem menu** |
| 23 | `/cron` | ADIAR | — | — | **sem menu** |
| 24 | `/capabilities` | PLATAFORMA | — | — | **sem menu** |
| 25 | `/command-center` | PLATAFORMA | — | — | **sem menu** |
| 26 | `/settings` | MANTER | Empresa | Configuração | **sem menu** |
| 27 | `/profiles` | PLATAFORMA | — | — | — |
| 28 | `/agents` | PLATAFORMA | — | — | — |
| 29 | `/starmap` | PLATAFORMA | — | — | — |
| 30 | `/new` | PLATAFORMA | — | — | — |
| 31 | `/session-import` | PLATAFORMA | — | — | — |

### O que a matriz revela

**5 rotas de negócio estão sem menu** (`/messaging`, `/webhooks`, `/cron`, `/settings`, `/artifacts`) — e **`/settings` é configuração da organização**, que o §13 quer no grupo Configuração.

**6 são plataforma** e não pertencem a nenhum dos dois ambientes: `/profiles`, `/agents`, `/starmap`, `/new`, `/session-import`, `/command-center`, `/capabilities`.

---

## 3. O PROBLEMA DO AMBIENTE ENGENHARIA

O §13 quer um ambiente para *"projetos, repositórios, issues/tarefas, arquitetura, código, testes, CI/CD, artefatos e entregas"*.

**O que existe**: `/artifacts`. **O que não existe**: todo o resto.

Criar o ambiente agora daria **um menu de um item** — e um produto que se apresenta como "ambiente de engenharia" com **uma tela** é pior que um produto que **não promete** isso.

**Decisão**: o ambiente ENGENHARIA **não é criado nesta fase**. Ele nasce quando houver **as telas que ele promete** — e o §12 do GOAL já lista o **Project Builder** como o componente que as produz.

**Registrado como dependência explícita**, não como esquecimento.

---

## 4. O SELETOR DE AMBIENTE — quando ele passa a fazer sentido

O §13 pede *"seletor persistente de ambiente e organização/projeto ativos"*.

**Com um ambiente só, um seletor de um item não é seletor.** Ele passa a valer quando houver **dois** — ou seja, quando a Engenharia existir.

**O que fazer agora**: a estrutura de dados (o ambiente ativo, persistido) **nasce junto com o multiempresa**, que já existe (`tenant_id`). O **seletor visual** espera o segundo ambiente.

> **Um controle que não muda nada é pior que a ausência dele**: ensina o usuário a ignorar a barra.

---

## 5. O QUE ESTA ESPECIFICAÇÃO **NÃO** DECIDE

| Decisão | Por quê |
|---|---|
| **Onde fica o seletor** (topo da sidebar? barra?) | é UX e depende do segundo ambiente existir |
| **Agrupamento visual** (separadores, títulos de grupo) | o SDK não tem `group`; exige mudança de contrato (§4 do doc de arquitetura) |
| **Busca global** | o §13 pede; não há hoje. É um componente próprio |
| **Renomear `/empresa`** (rota, não rótulo) | exigiria redirects + mapear deeplinks; o §13 manda mapear antes. **Não fazer agora** |

---

## 6. ORDEM DE IMPLEMENTAÇÃO PROPOSTA

| Fase | O que | Pré-requisito |
|---|---|---|
| **1** | Rotular `/empresa` → **"Organização"** no menu | nenhum — só rótulo |
| **2** | Levar `/settings` para o grupo Configuração | nenhum |
| **3** | Expor `/artifacts` e `/cron` no menu (hoje inalcançáveis) | decidir grupo do `cron` |
| **4** | Agrupamento visual | estender `SidebarNavContribution` com `grupo?` |
| **5** | Ambiente ENGENHARIA | **as telas do Project Builder (§12)** |
| **6** | Seletor persistente | dois ambientes |

**As fases 1–3 não exigem mudança de SDK.** As 4–6 exigem.

---

## 7. O QUE NÃO MUDOU NESTA RODADA

**Nenhuma rota, nenhum rótulo, nenhum item de menu.**

Esta rodada produziu **dois documentos e uma matriz**, como o §13 pede nos entregáveis. Implementar antes de mapear era exatamente o que o §13 proíbe.
