# GOAL V2 — RODADA 86: PRELOAD E WRAPPER DO TRABALHO PONTUAL

**Data**: 05/11/2026 · **§12** · rodada 4 do trabalho pontual

---

## O QUE FOI CONSTRUÍDO

| Camada | Estado |
|---|---|
| 1. Regra | ✅ r83 |
| 2. Store | ✅ r84 |
| 3. Canal | ✅ r85 |
| **4. Preload** | ✅ **r86** |
| **5. Wrapper** | ✅ **r86** |
| 6. Tela | ❌ |

---

## AS DECISÕES DO WRAPPER

### A tela **não calcula a expiração**

> *"`expirado` vem do processo principal, que compara `expira_em` com o relógio **dele**. Se a tela fizesse a conta, **um renderer com relógio adiantado mostraria vencido o que ainda vale** — e a pessoa **descartaria trabalho vivo**."*

### `vencidos` é **consulta separada**, não filtro local

> *"No processo principal, ele é **a mesma função** que decide o que a faxina pega."*

### `prazoLabel` diz **quatro coisas diferentes**

| Situação | Texto |
|---|---|
| falta 1 dia | **"vence hoje"** |
| falta N dias | **"vence em N dias"** |
| passou | **"venceu"** |
| entregue/descartado | **""** (não é mais prazo) |

> **`diasRestantes` devolve `null` quando venceu** — *"a ausência é dita, em vez de virar «0 dias», que **pareceria «vence hoje» e não «venceu há três semanas»**"*.

### `entrega_incompleta` **não é erro de sistema**

> *"Diga onde o resultado está e resuma-o em uma frase. **Sem isso não há entrega, só promessa.**"*

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais no preload | **6** |
| Funções no wrapper | **10** |
| Recusas traduzidas | **8** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §12 — ONDE ESTÁ

| Tipo | Estado |
|---|---|
| Organização permanente | ✅ regra |
| Projeto | ✅ **6 camadas** |
| **Trabalho pontual** | ⚠️ **5 de 6 camadas** |

---

## PRÓXIMA RODADA

**A tela de trabalhos** — `src/app/trabalhos/`, com o prazo visível, o botão de entregar e a faxina como **ação explícita**.

> **86 rodadas.** O terceiro tipo do §12 está a **uma camada** de chegar a quem usa — e o wrapper que faltava carrega a decisão que o define: **o relógio que importa é o do processo principal**, porque o do renderer pode estar errado.
