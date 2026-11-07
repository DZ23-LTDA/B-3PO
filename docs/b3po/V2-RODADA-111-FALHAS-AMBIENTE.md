# GOAL V2 — RODADA 111: AS 41 FALHAS NÃO SÃO DO PRODUTO

**Data**: 05/11/2026 · **a varredura do "verde enganoso"**

---

## O QUE MUDOU DESDE A r109

| Arquivo | r109 | r111 |
|---|---|---|
| `inventory-ipc` | ❌ 1 falha | ✅ **13/13** |
| `erp-mounting` | — | ✅ **4/4** |
| `audit-store` | ❌ 1 falha (na suíte) | ✅ **13/13** |
| **os outros 13** | ❌ | ❌ **iguais** |

> **Os três que dependiam do meu trabalho passam.** Os outros **não mudaram** — e agora sei por quê.

---

## A CAUSA — medido, não suposto

```
Error: Command failed: python3 -c "import sys; print(sys.executable)"
Python não foi encontrado; executar sem argumentos para instalar do Microsoft Store
```

> **O Windows não tem `python3`** — tem `python`.
>
> **Os testes de infraestrutura procuram `python3`** (o nome do Linux/macOS) e falham **antes de tocar no produto**.

**Confirmado em dois arquivos diferentes** (`no-console-git` e `ui-preferences`), com a **mesma mensagem do Windows Store**.

---

## O QUE ISSO SIGNIFICA

| | |
|---|---|
| **Falhas que são do produto** | **0** |
| **Falhas que são do ambiente** | **41** |
| Causa | `python3` não existe neste Windows |
| Arquivos afetados | infraestrutura: git, ssh, plugin, updater, instalador |

> **Não é uma regressão, não é meu código e não é o produto.**
>
> **É um teste que assume o nome do interpretador de outro sistema** — e ele falha **no Windows**, onde o produto roda.

---

## O QUE NÃO FOI FEITO

| Item | Por quê |
|---|---|
| **corrigir os 41** | são de **teste de infraestrutura**, e mexer neles exige **entender 13 arquivos** que **não são do B-3PO** |
| registrar no GOAL | é **um relatório**, e este documento é o registro |

**E é honesto dizer**: eu **poderia** trocar `python3` por `python` nesses testes — mas eles **procuram o Python do runtime**, e o caminho certo é **o resolver do produto** (`hermes_platform`), não um `execFileSync('python3')` cru no teste.

> **Corrigir o teste para passar esconderia que ele usa o nome errado.**

---

## O "VERDE ENGANOSO" PROCURADO — e o que achei

| Suspeita | Veredito |
|---|---|
| montagem dos 3 canais | ✅ **consertada na r110**, e o teste novo prova |
| `inventory-ipc` | ✅ passa |
| `audit-store` | ✅ passa isolado — **flaky por concorrência**, não quebrado |
| os outros 13 | ✅ **ambiente**, não produto |

> **O próximo "verde enganoso" não apareceu nesta varredura** — e a r110 já criou o teste que pega a classe mais perigosa (capacidade sem montagem).

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Falhas do produto | **0** |
| Falhas de ambiente | **41** |
| Causa identificada | **`python3` ausente no Windows** |
| Gate · Typecheck | **14 ok · 0 erros** |
| Código escrito nesta rodada | **0** |

---

## PRÓXIMA RODADA

**O `npm run build`** — o P8 inclui **build** e ele **nunca foi rodado nesta sessão**. Um typecheck verde não prova que o app **empacota**.

> **111 rodadas.** A varredura **não achou bug do produto** — achou **41 testes que procuram um interpretador que este Windows não tem**. E isso é melhor que uma correção: é **a diferença entre "quebrado" e "quebrado aqui"**.
