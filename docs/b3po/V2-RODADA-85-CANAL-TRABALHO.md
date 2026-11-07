# GOAL V2 — RODADA 85: O CANAL DO TRABALHO PONTUAL — A FAXINA É AÇÃO

**Data**: 05/11/2026 · **§12** · rodada 3 do trabalho pontual

---

## OS 6 CANAIS

| Canal | Ação |
|---|---|
| `listar` | **`read`** — tudo, inclusive entregues e descartados |
| `abertos` | **`read`** — só o que ainda é trabalho |
| `vencidos` | **`read`** — o que alguém precisa resolver |
| `criar` | **`execute`** |
| `mudar` | **`execute`** |
| **`descartarVencidos`** | **`execute`** |

---

## AS DUAS DECISÕES DO CANAL

### 1. `descartarVencidos` é **`execute`**, e isso é o ponto

> *"Limpar vencidos **muda o status de várias linhas** — é ação, não leitura. Um canal que fizesse isso no `listar` transformaria **uma consulta numa escrita**, e a regra do produto é que **quem lê não muda nada**."*

**O teste prova**: `LEITOR` consulta as três listas, **mas não faz a faxina**.

### 2. **Três leituras, e não uma com filtro**

| Canal | Pergunta |
|---|---|
| `listar` | **o arquivo inteiro** |
| `abertos` | **o que ainda é trabalho** |
| `vencidos` | **o que precisa de decisão** |

> *"Duas perguntas, dois nomes, porque **uma resposta só faria a tela mentir para um dos dois usos**."*

---

## A PROVA — 9 testes

| Teste | O que trava |
|---|---|
| **6 canais com o prefixo** | nada fora do padrão |
| **sem ator, recusa** | a lista não é pública |
| **LEITOR consulta, mas NÃO faz a faxina** | `read` ≠ `execute` |
| **as três leituras respondem diferente** | um criado há 2 meses está em `vencidos`, não em `abertos` |
| **entregar exige `onde` e `resumo` ATRAVÉS DO CANAL** | a regra da r83 chega na porta |
| **`descartarVencidos` devolve quantos** | uma ação que não diz o que fez obriga a conferir na mão |
| **ler NÃO limpa** | a faxina é a ação, não o efeito colateral |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais novos | **6** |
| Testes | **9** |
| **Ratchet** | **17 de 45** — a dívida **não subiu** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §12 — ONDE ESTÁ

| Tipo | Estado |
|---|---|
| Organização permanente | ✅ regra |
| Projeto | ✅ 6 camadas |
| **Trabalho pontual** | ⚠️ **regra + disco + canal** (3 de 6 camadas) |

---

## PRÓXIMA RODADA

**Preload + wrapper do trabalho pontual** — e a tela, que é o que falta para o terceiro tipo do §12 **chegar a quem usa**.

> **85 rodadas.** O trabalho pontual atravessou **três camadas** e a mais importante delas é uma **recusa**: **quem só consulta não pode reorganizar a lista de trabalho dos outros** — nem limpando o que venceu.
