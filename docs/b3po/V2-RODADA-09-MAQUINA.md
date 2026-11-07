# GOAL V2 — RODADA 9: FRONTEIRA DE MÁQUINA

**Data**: 05/11/2026 · `git-ipc` protegido · `terminal-ipc` não tocado (decisão registrada)

---

## A DISTINÇÃO QUE GOVERNA ESTA RODADA

`exigirAtor` responde *"esta pessoa pode lançar no financeiro?"* — decide por **recurso de negócio**.

`git:review:push` e `createPr` **não são recursos de negócio**. São **publicação para fora da máquina**.

> Se as duas usassem o mesmo critério, um operador de vendas com nível `EXECUTE_ALLOWED` no domínio `sales` passaria a poder **dar `git push` no repositório da empresa** — porque a guarda só olharia o nível.

Por isso a fronteira é **própria**: `machine-access.ts`, com três degraus.

---

## O QUE FOI CRIADO

### `machine-access.ts`

```ts
export type MachineCapability = 'externo' | 'leitura' | 'escrita'

export function podeOperarMaquina(ator: Actor | null, capacidade: MachineCapability): boolean
```

| Capacidade | Quem passa | Por quê |
|---|---|---|
| **`leitura`** | qualquer nível efetivo, **inclusive `READ`** | status, diff, lista de branches — a tela de revisão já mostra |
| **`escrita`** | `EXECUTE_ALLOWED` ou `SUPERVISED_AUTONOMY` | altera o repositório |
| **`externo`** | **`owner`** com nível de execução | **sai da máquina e não tem desfazer** |

**Negar por padrão**: sem ator, sem decisão. `level === null` **não é "acesso padrão"**.

### `machine-actor.ts`

Resolvedor do dono da instalação. Extraído para sibling porque **`main.ts` está no teto de linhas** (18220) e o ratchet `FILE_LINES` só permite diminuir.

### `git-ipc.ts` — 8 canais envelopados

| Canal | Capacidade |
|---|---|
| `worktreeAdd` · `worktreeRemove` · `branchSwitch` | `escrita` |
| `review:stage` · `review:unstage` · `review:revert` | `escrita` |
| **`review:commit`** | **`externo` quando `push=true`**, senão `escrita` |
| **`review:push`** | **`externo`** |
| **`review:createPr`** | **`externo`** |

**Os 13 canais de leitura não foram envelopados** — `worktreeList`, `branchList`, `repoStatus`, `review:list`, `review:diff`, `fileDiff`, `revParse`, `commitContext`, `shipInfo`, `prList`, `scanRepos`, `baseBranchList`. O modelo já permite com qualquer nível; envolver cada um seria ruído sem ganho.

---

## A PROVA — 7 testes

| Regra | Teste |
|---|---|
| sem ator, nada passa | ✓ |
| `level: null` não é acesso padrão | ✓ |
| `READ` alcança leitura | ✓ |
| `READ` **não** alcança escrita | ✓ |
| `operator` escreve mas **não publica** | ✓ |
| `owner` publica | ✓ |
| recusa nomeia `capacidade_de_maquina`, não erro genérico | ✓ |

> O teste que importa: **`operator` com `EXECUTE_ALLOWED` pode `stage` mas não pode `push`.** É a diferença entre ter a fronteira e não ter.

---

## O QUE **NÃO** FOI FEITO — e é uma decisão, não um esquecimento

### `terminal-ipc.ts` (6 canais) — **não tocado**

O terminal é a **ferramenta de desenvolvimento do desktop**: o usuário abre um shell para trabalhar no próprio projeto. Ele **não passa pelo ERP** e não é operação de empresa.

Aplicar `podeOperarMaquina(..., 'externo')` nele exigiria decidir **se o terminal do B-3PO é uma capacidade restrita ou um recurso de primeira classe do app**. Isso é **decisão de produto**, e tomá-la sozinho na rodada 9 seria pior que deixar registrada.

**Registrado como pendência explícita**, não como "feito".

---

## UM ERRO MEU QUE QUASE PASSOU

Ao reduzir as linhas do `main.ts`, meu script procurou *"o primeiro comentário que começa com `// Git-driven features`"* — e achou **um comentário novo que eu tinha acabado de criar na seção de imports**. Ele inseriu o texto **entre os imports** e quebrou o TypeScript (`TS1005: '=' expected`).

**Recuperado com `git checkout -- main.ts`** e refeito de forma cirúrgica: 1 import + 1 chamada, sem comentário novo.

> Se eu não tivesse rodado o typecheck antes do gate, o arquivo teria ido quebrado. **O typecheck pegou em 3 segundos.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Canais de máquina com fronteira | **8** (os de escrita e os externos) |
| Canais de leitura deixados abertos, por decisão | 13 |
| Testes novos | **7** |
| `main.ts` | **18220 linhas** — exatamente o teto |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |
| Regressão (machine + permissão + git + erp) | **94 verdes · 7 pulados** |

---

## PRÓXIMA RODADA

**Fase 3 — o CRM órfão e as fontes de verdade** (item 3 da ordem do GOAL).

O achado está documentado desde a r2: `crm/src/` com **19 arquivos**, pacote `@dz23/crm-core`, **zero consumidores**, e a CI rodando seus testes — o que dá a impressão de que "o CRM tem testes verdes" quando o CRM que o usuário usa é outro.

A decisão a tomar: **consumir `crm/src` ou removê-lo.** Não é escolha estética — é escolher qual é a fonte de verdade.
