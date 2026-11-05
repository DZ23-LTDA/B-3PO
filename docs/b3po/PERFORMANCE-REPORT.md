# PERFORMANCE — medido pela primeira vez (rodada 227)

## Como foi medido

Electron real, perfil temporário limpo, CDP por WebSocket. **Não é estimativa.**

## Os números

| Medida | Valor |
|---|---|
| CDP responde (processo de pé) | **352 ms** |
| **UI montada** (DOM com conteúdo) | **931 ms** |
| IPC `finance:list` — **p50** | **0,3 ms** |
| IPC `finance:list` — p95 | 38,3 ms |
| IPC `finance:list` — máx | 41,2 ms |
| Navegação `/crm` | **28 ms** |
| Navegação `/finance`, `/stock`, `/sales` | **17–18 ms** |

### Como ler os números

- **931 ms até a UI útil** é o que o usuário sente ao abrir o app. Abaixo de 1 s num Windows sem warm cache é bom.
- **p50 de 0,3 ms** no IPC significa que listar o financeiro **já em memória** é desprezível.
- **p95 de 38 ms** é a **primeira** chamada: paga a leitura do arquivo JSON. As seguintes são 100× mais rápidas.
- **17–28 ms de navegação** é o tempo até o conteúdo aparecer, não o tempo de transição visual.

## O achado: 19 MB de um bundle de 53 MB

| Item | Tamanho |
|---|---|
| `dist/` inteiro | **53,46 MB** (1171 arquivos) |
| **`shiki-*.js`** | **19,07 MB** — **36% do bundle** |
| `main-*.js` | 3,22 MB |
| `context-*.js` | 2,62 MB |

**`shiki` é realce de sintaxe.** 19 MB parece absurdo — **e não é, porque não está no caminho crítico**:

```tsx
// shiki-block.tsx:22 — import estático, MAS o módulo é carregado dinamicamente
import { bundledLanguages, getSingletonHighlighter } from 'shiki'
// diff-lines.tsx:389
void import('shiki')
// shiki-block.tsx:6,84 · shiki-highlighter.tsx:52
await import('...shiki-block')
```

**O bloco de código só carrega o realçador quando existe um bloco de código na tela.** A prova é o número: **931 ms de UI com 19 MB não carregados**.

**No disco: 19 MB. No boot: 0.**

## O que NÃO consegui medir, e por quê

Tentei usar `performance.getEntriesByType('resource')` para confirmar quais chunks foram carregados. **Retornou 1 recurso** — o Electron serve o renderer por `file://`, e o Resource Timing **não registra** carregamentos de disco local.

**Então a confirmação de que `shiki` é lazy vem do código, não da medição em runtime.** Isso é uma inferência, e a diferença importa: os números de tempo são **medidos**, a classificação do chunk é **lida**.

## O que continua sem medição

| Item | Estado |
|---|---|
| Memória (heap) depois de 1 h de uso | **não medido** |
| Performance com 10 mil contatos | **não medido** — todos os testes usam dezenas |
| Tempo de build | **não medido** |
| Performance do `main.ts` (680 KB, 15 mil linhas) | **não medido** isoladamente |
| Concorrência (2 vendas do mesmo SKU) | **nunca testado** |

## Medido

| Medida | Valor |
|---|---|
| Bundle | 53,46 MB |
| Maior chunk | 19,07 MB (`shiki`, lazy) |
| UI pronta | **931 ms** |
| IPC p50 | **0,3 ms** |
| Navegação | **17–28 ms** |
