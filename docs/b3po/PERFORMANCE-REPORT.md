# PERFORMANCE-REPORT — B-3PO

**Data:** 2026-11-02 · **Escopo:** números medidos nesta máquina; nada extrapolado.

## 1. Medido

| Item | Valor | Como |
|---|---|---|
| `npm ci` (monorepo) | **~1 min**, 1222 pacotes | execução real |
| Typecheck do desktop | concluído sem erro (≈40 s) | `npm run typecheck` |
| Build de produção do desktop | **0,5 min** | `npm run build` |
| Empacotamento (`--dir`) | **1,3 min** | `npm run pack` |
| Bundle do processo principal | **3,0 MB** (`electron-main.mjs`) | saída do build |
| Preload | 45,5 KB | saída do build |
| Instalador MSIX | **185,53 MB** | artefato |
| Aplicativo empacotado | **235,4 MB** | `B-3PO.exe` + recursos |
| Turno real do agente (local) | **13,4 s** | `hermes -z` com Ollama `qwen3.5:4b` |

## 2. Observação de gargalo no build

O build reporta callbacks lentos do plugin Babel: **20,6 s em 865 chamadas** (~85% do tempo de transformação).
É custo de build, não de produto — mas encarece CI.

## 3. Não medido (não pode ser alegado)

- Tempo de **startup** do app empacotado.
- Uso de **memória/CPU** em sessão longa, com transcript grande.
- **Latência de UI** (streaming, lista de bots, drag/resize).
- **Bateria** e comportamento em background (mobile).
- **Rede**: reconexão, latência de provider real (o teste usou Ollama local).
- Tamanho do bundle do renderer (só o main foi lido da saída).

## 4. Riscos

1. **235 MB de app** e **185 MB de MSIX** são pesados para distribuição; Electron + payload explicam, mas
   convém comparar com a build oficial do upstream antes de decidir canal.
2. Startup não medido: o produto abre um gateway Python junto? Se sim, o primeiro paint pode ser lento —
   precisa de medição antes de prometer "instantâneo".
3. Provider local de 4B é rápido por ser pequeno; **não** representa latência de modelo grande.

## 5. Plano mínimo

1. Medir startup frio/quente do `B-3PO.exe` (3 execuções, mediana).
2. Medir memória após 30 min de sessão.
3. Perfilar o build do Babel (875 ms por chamada é muito para CI).
4. Medir reconexão com o gateway derrubado.
