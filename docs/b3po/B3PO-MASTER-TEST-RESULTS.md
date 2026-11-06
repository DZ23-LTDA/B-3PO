# B-3PO — RESULTADOS DE TESTE

**Checkpoint do §23** · atualizado em 2026-11-06T05:45:00-03:00 · commit `ae4829c5f0`

---

## O QUE ESTE ARQUIVO É

> **§20: "Registrar comando, ambiente, exit code, contagem e logs."**

**Não é uma lista de "passou".** É **o que foi rodado, onde, e com que resultado** — inclusive o que falhou e por quê.

---

## OS COMANDOS OFICIAIS (§20)

| Comando | O que verifica |
|---|---|
| `python scripts/check` | **14 checks** — lint, health, docs, brand, ratchets |
| `python scripts/check-b3po-types` | typecheck **de 2 projetos** (main + renderer) |
| `npx vitest run [filtro]` | testes (em `apps/desktop`) |
| `npm run build` | **7 bundlers** — renderer, main, preloads |
| `npm run pack` | instalador `--dir` |
| `npm run dist:win:msix` | **o MSIX** que o cliente instala |

---

## A ÚLTIMA MEDIÇÃO GLOBAL — r109

| Item | Resultado |
|---|---|
| **Gate** | ✅ **14 checks, ok** |
| **Typecheck** | ✅ **0 erros** |
| **Suíte `electron`** | **5446 passaram · 26 falharam · 207 skipped** (5679) — r205 |
| **branch** | `b3po-brand` |
| **`main`** | ✅ **intacta** (espelho do upstream) |
| **sincronizado** | ✅ **sim** |

### As 41 falhas da r111 → 26 na r205

> **Não são do produto.** Elas procuram `python3`, que **não existe neste Windows** (é `python`).
>
> **Confirmado em dois arquivos diferentes**, com a mesma mensagem do Windows Store.

| Falhas do produto | **0** |
|---|---|
| Falhas de ambiente | **41** |

---

## OS FLUXOS PROVADOS — 4

| Fluxo | Teste | Linhas |
|---|---|---|
| **Compras** | `purchases-fluxo-completo` | 296 |
| **Venda** | `sales-fluxo-completo` | 308 |
| **Orquestração** | `sofia-fluxo-completo` | 159 |
| **Atendimento** | `atendimento-fluxo-completo` | ~150 |

> **Um fluxo verde prova que as peças encaixam**; um teste de unidade prova só que a peça existe.

---

## OS TESTES QUE **IMPEDEM** REGRESSÃO

| Teste | O que impede |
|---|---|
| `erp-mounting` | **capacidade sem porta** (r110) |
| `ipc-invariants` | canal duplicado ou string mágica |
| `permission-coverage-ratchet` | **16 de 46 sem guarda, 0 do produto** (r176) |
| `routes-map` | rota morta no menu |
| `b3po-modulos` | catálogo da busca divergindo do menu |

---

## O QUE **NÃO** FOI TESTADO

| Item | Por quê |
|---|---|
| **instalação real do MSIX** | exige instalar no Windows (B5) |
| **foco, tabulação, contraste** | exige o app aberto (B6) |
| **execução real com o Hermes** | exige credencial (B3) |
| `install-stamp.ts` | **constante do bundler** — não é testável por unit test |
