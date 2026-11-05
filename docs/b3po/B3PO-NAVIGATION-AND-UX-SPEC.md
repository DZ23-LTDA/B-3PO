# B3PO — NAVEGAÇÃO E UX SPEC

**Entregável do §13** · rodada 99 do GOAL V2 · o mapa é **teste**, não tabela

---

## O MAPA DE ROTAS É UM TESTE

> *"Um mapa de rotas num documento **envelhece na próxima rodada** — e um mapa errado **é pior que nenhum** (a r93 provou: três de três achados falsos)."*

**`apps/desktop/electron/routes-map.test.ts`** lê `routes.ts` e `plugin.tsx` e **falha** quando o mapa deixa de ser verdade.

| Teste | O que impede |
|---|---|
| 36 rotas declaradas | o documento diz um número que o código não tem |
| **toda constante está registrada** | rota declarada e esquecida |
| **toda registrada tem constante** | string mágica no `APP_ROUTES` |
| sem path repetido | duas rotas para o mesmo lugar |
| **todo item do menu aponta para rota que existe** | **link morto com aparência de módulo** |
| menu tem 23 itens | item duplicado ou faltando |
| **13 rotas fora do menu, nomeadas** | **rota removida sem decisão** |

---

## O QUE O §13 PEDE, E ONDE ESTÁ

| Item | §13 | Estado |
|---|---|---|
| Navegação contextual por ambiente | :413-414 | ⚠️ **grupos sim, seletor não** |
| **Modo Empresa com grupos por fluxo** | :429-438 | ✅ **r92** |
| **`Empresa` ≠ configuração** | :444-445 | ✅ **r92** |
| Não duplicar Mensageria/Atendimento | :440 | ✅ **não há duplicata** (r95) |
| Agenda × Tarefas agendadas distintas | :441 | ✅ **são distintas** (r95) |
| **Seletor persistente de ambiente** | :447 | ❌ |
| **Menu conforme RBAC e plano** | :448 | ❌ menu estático |
| **Sofia no contexto ativo** | :449 | ⚠️ `/sofia` está no menu |
| **Busca global** | :450 | ✅ **r96–r98** |
| **Modo Engenharia** | :452-454 | ❌ |
| Não remover rota sem mapear | :456 | ✅ **o teste agora mapeia** |

---

## OS 7 GRUPOS — o Modo Empresa

```
1. VISÃO GERAL      Painel · Empresa · Busca
2. OPERAÇÃO         Atendimento · Agenda · Serviços · RH
3. COMÉRCIO         Produtos · Estoque · Compras · Vendas · Entregas · Financeiro
4. TRABALHO         Projetos · Trabalhos
5. CRESCIMENTO      Marketing · Pós-venda
6. INTELIGÊNCIA     Agentes · Automações · Sofia · Documentos
7. CONFIGURAÇÃO     Estrutura · Privacidade
```

> **O grupo 4 não existe no §13** — ele foi escrito antes do §12. Projeto e trabalho pontual **não são comércio nem configuração**: são **o trabalho que atravessa os dois**.

---

## AS 13 ROTAS FORA DO MENU — e a matriz de migração

| Rota | Dono | Decisão |
|---|---|---|
| `/` | **núcleo** | é o chat, não um módulo |
| `/settings` | **núcleo** | configuração do app |
| `/command-center` · `/capabilities` · `/artifacts` · `/profiles` · `/starmap` · `/webhooks` | **núcleo** | avançado — não é uso diário |
| `/session-import` | **núcleo** | fluxo pontual |
| **`/crm`** | **núcleo** | **está no menu do núcleo** (r94) — a busca do produto não o vê |
| **`/agents`** | **núcleo** | **subagentes do runtime** — diferente de `/agentes` (r95) |
| **`/messaging`** | **núcleo** | **configuração de canais** — diferente de `/atendimento` (r95) |
| **`/cron`** | **núcleo** | **cron do runtime** — mantido distinto de `/agenda`, como o §13:441 manda |

> **Nenhuma rota foi removida.** A matriz de migração **não migra nada**: ela **declara a fronteira** entre o menu do produto (23) e o do núcleo (as 13).

---

## A FRONTEIRA QUE O MAPA REVELOU

> **O produto tem DOIS menus** — o do núcleo (upstream) e o do plugin (`b3po-nav`).
>
> **O §13 fala de «um menu».** A arquitetura real tem dois, e **é por isso que a r93 errou três de três**: ela leu **um** e concluiu sobre **os dois**.

**A decisão de produto que fica registrada**: o menu do produto **não repete** o do núcleo (o teste da r97 recusa), e **a busca do produto não vê o do núcleo** (a frase da tela diz isso).

---

## O QUE FALTA — as três lacunas do §13

| Lacuna | Por que não foi feita |
|---|---|
| **Seletor de ambiente** | exige o **Modo Engenharia** existir primeiro — um seletor para um modo que não existe é um botão morto |
| **Menu conforme RBAC** | o menu é **estático**; torná-lo dinâmico exige o canal de permissões no renderer, que hoje só valida **por ação** |
| **Modo Engenharia** | é **um produto dentro do produto** (§13:452-454: projetos, repositórios, issues, arquitetura, código, testes, CI/CD, artefatos) |

> **As três estão nomeadas.** Nenhuma delas é uma linha de código — as três são **trabalho de semanas**, e fingir que são uma rodada seria o tipo de relatório que o §20 proíbe.

---

## PRÓXIMA RODADA

O §13 está **medido por inteiro**: o que existe tem teste, o que falta tem nome. **A próxima frente é o §11 — a definição operacional de Sofia**, que a ordem do dono pede no item 6.

> **99 rodadas.** Este documento **não é um mapa** — é **a explicação de por que o mapa é um teste**. Um mapa em markdown envelhece; um mapa em `expect` **para de compilar quando mente**.
