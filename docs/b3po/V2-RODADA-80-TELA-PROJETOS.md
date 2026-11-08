# GOAL V2 — RODADA 80: A TELA DE PROJETOS — AS SEIS CAMADAS

**Data**: 05/11/2026 · **§12** · P4 completa

---

## O QUE A r79 DEIXOU

*"A única que falta é a que o usuário toca."*

**Esta rodada fez a tela.**

---

## AS SEIS CAMADAS — COMPLETAS

| Camada | Desde |
|---|---|
| 1. Regra | r76 |
| 2. Store | r77 |
| 3. Canal | r78 |
| 4. Preload | r79 |
| 5. Wrapper | r79 |
| **6. Tela** | **r80** |

### E os 7 registros

rota · `AppView` · `AppRouteId` · `APP_ROUTES` · `lazy` · `<Route>` · **menu**

> **Menu foi de 19 para 20** — e o teste `o menu tem exatamente os 19 modulos` **falhou, como devia**.

---

## AS DECISÕES DA TELA

### O botão "Concluir" fica **desabilitado** sem critério — e diz **por quê**

```tsx
disabled={!podeConcluir}
```

E ao lado do formulário, **antes do clique**:

> *"Sem critério, ele não poderá ser concluído depois."*

> **Um botão morto sem explicação é pior que um botão ausente.** A tela **torna a recusa visível antes do clique** — sem tirar do processo principal o poder de recusar.

### O critério é uma **linha por critério**, não uma nota

```
o cliente consegue comprar pelo site
o estoque baixa sozinho
```

> **Uma nota corrida não pode ser verificada; uma lista pode.** É o que transforma "terminamos" em "terminamos o que combinamos".

### `STATUS_LABEL`, não o código

> *"a começar"*, *"em andamento"*, *"concluído"* — **a tela existe para não exigir tradução**.

### O prazo é `date`, não texto

> Um campo livre aceitaria "amanhã" e gravaria `NaN`. O `input type="date"` **só produz o que o store aceita**.

---

## A PROVA

| Verificação | Resultado |
|---|---|
| Typecheck | **0 erros** |
| Gate | **14 checks, ok** |
| Nav (13) · IPC (10) · Regra+store (43) | **66 verdes** |
| Menu | **19 → 20**, e o teste foi atualizado junto |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas da tela | **~290** |
| Registros | **7** (6 + menu) |
| Testes de menu corrigidos | **2** |

---

## O P4 — **COMPLETO**

| Item | Estado |
|---|---|
| ADR operacional de Sofia | ✅ |
| Task Orchestrator | ✅ r22 |
| **Planos persistentes** | ✅ **r76–r80, 6 camadas** |
| **Project Builder** | ✅ **regra, disco, canal, preload, wrapper, tela** |
| Organization Builder | ⚠️ `companies-store` existe; **o Builder não** |
| Agent Factory | ⚠️ agentes existem; **a fábrica não** |

> **O "plano persistente" do §12 deixou de ser uma ideia e é um lugar onde se clica.**

---

## O QUE **AINDA** FALTA NO P4

| Item | O que seria |
|---|---|
| **Organization Builder** | estruturar empresas **conforme setor** — hoje `companies-store` guarda o cadastro, não o desenho |
| **Agent Factory** | reutilizar agentes/skills/providers **configurando especialização** — hoje o agente existe, a fábrica não |
| **Trabalho pontual** | o terceiro tipo do §12: documento, pesquisa, análise — **não existe** |

---

## PRÓXIMA RODADA

**O Organization Builder** — o próximo item do §12, e o que o §13 (navegação contextual *Empresa*) exige por baixo.

> **80 rodadas.** O §12 pede três tipos de trabalho; **dois existem com seis camadas cada** — e o terceiro (projeto) **acabou de chegar à tela**. A recusa que o define está no arquivo, no store, na porta **e agora no botão**.
