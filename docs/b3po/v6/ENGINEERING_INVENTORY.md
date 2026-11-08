---
tipo: inventario-de-engenharia
agente: dsh
projeto: c3po-bot
data: 2026-11-08
fase: V6-§3
revisao: r1
---

# V6 — Inventário de engenharia (13 capacidades que o studio precisa)

> §3 do contrato: *"Auditar se o B-3PO já consegue … Para cada capacidade, registrar IMPLEMENTED,
> PARTIAL, MISSING ou BLOCKED, com evidências."*

**Método**: cada linha saiu do **código**, não de documento anterior. Os documentos do V5 foram lidos
primeiro (`RETRATATIONS` → `REPORT_FINAL` → `HANDOFF` → `OPEN_BLOCKERS`), mas **nenhuma classificação
abaixo é herdada deles** — todas foram reconferidas nos arquivos.

**Baseline**: `HEAD ea5b13643f` · branch `b3po-brand` · `main` intacta (`f4cf411f28`) · worktree limpo.

## O resumo, primeiro

| # | Capacidade | Estado | O que falta |
|---|---|---|---|
| 1 | Criar projetos do zero | **PARTIAL** | `createProject({ folders, primaryPath })` cria o projeto **com pasta vinculada**; nao ha scaffold de arquivos — a pasta tem de existir |
| 2 | Abrir diretório / importar repositório | **IMPLEMENTED** | `openFolderAsProject()` abre uma pasta **como** projeto (upsert); `pickProjectFolder(s)` com multi-select; `addProjectFolder(id, path)`; `git:scanRepos` |
| 3 | Ler/editar/criar/excluir arquivos | **IMPLEMENTED** | 4 canais com guarda (`podeOperarMaquina` + `recusaSeNaoPuder`) |
| 4 | Terminal isolado | **IMPLEMENTED** | `node-pty` real, 6 canais, posse por janela (r10/r50), 33 testes |
| 5 | Instalar dependências | **PARTIAL** | só via terminal; sem capacidade dedicada nem detecção |
| 6 | Executar testes e builds | **IMPLEMENTED (backend)**: `dev:detect` descobre o comando pelo manifesto; `dev:run` roda e devolve `exit_code`/`saida`/`erro` | falta a **UI** que ligue os dois (r7 entrega os canais) |
| 7 | Git e GitHub | **IMPLEMENTED / PARTIAL** | 21 canais de Git local; GitHub via `gh` (depende de instalado+autenticado) |
| 8 | Preview funcional | **MISSING** | o "preview" é renderização de arquivo no painel, **não** app rodando em porta |
| 9 | Inspecionar console e rede | **MISSING** | não há captura de console/rede de app em preview |
| 10 | Coordenar subagentes | **PARTIAL** | roster/execuções/aprovações existem; **D1 (r2) faz o pedido ser executado** — o turno roda e falha so' por falta de provedor |
| 11 | Memória e checkpoints | **PARTIAL** | camadas de memória no gateway; checkpoint de execução existe (`retomar`) |
| 12 | Recuperar trabalho interrompido | **IMPLEMENTED** | `retomar` + `expirarPendentes` (V5 r39/r40/r43), endurecidos |
| 13 | Gerar artefatos e documentação | **PARTIAL** | a tela lista artefatos de sessão; **não gera** |
| 14 | Preparar deploy com aprovação | **MISSING** | nenhum canal, nenhum fluxo |

**Nenhuma capacidade é declarada IMPLEMENTED sem o caminho completo** — ler arquivo existe (#3), mas isso
não é "trabalhar num projeto" (#1) nem "entregar código" (#13).

## D1 — r3: o vinculo automatico e o status da tarefa

**O ciclo fecha**: na r3 a execucao passou de `pendente` para **`executando`** com `session_id` gravado,
sem ninguem clicar em "Vincular":

```
2. antes:  exec-plano-...-v3a · tarefa "pendente"
3. depois: #/local-8d4fbeef...  · execucaoStatus "executando" · temSessionId: true
```

**O vínculo so' acontece na sessao NOVA**: o clique guarda a sessao de entao, e o efeito so' vincula
quando `$activeSessionId` muda para outro valor. Sem essa guarda, um trabalho delegado seria vinculado a
uma conversa que a pessoa ja' tinha aberta.

### E achei um mecanismo morto no caminho

`statusDerivadoDaExecucao` (sofia-ponte.ts:191) existe para converter status de **execucao** em status de
**tarefa**, e **nao tinha chamador nenhum**. Consequencia: a execucao virava `executando` e o painel de
Sofia continuava mostrando a tarefa como **`pendente` para sempre** — a tela mentia sobre o proprio
trabalho. E' o mesmo padrao do `retries: 2` contra `tentativas: 0` (V5 r40).

**Corrigido** no canal `hermes:sofia:execucao:vinculada`: depois do vinculo, o status derivado e' gravado
na tarefa. Escrita best-effort — o vinculo ja' aconteceu, e desfaze-lo por causa de um rotulo seria pior.

**ATENCAO — nao verificado ao vivo ainda**: a mudanca e' no **processo principal** (`electron/sofia-ipc.ts`),
e o Vite so' recarrega o renderer. A instancia em execucao tem o `main` anterior. Typecheck, gate (17) e
128 testes de Sofia passam; **a confirmacao no app exige reiniciar o Electron**.

## D1 entregue (r2): o pedido delegado passa a ser **executado**

Antes: delegar → a execução ficava `pendente` → o pedido chegava ao composer e **parava ali**.

Agora, com o botão **"Executar a tarefa"** no bloco de delegação:

```
1. Delegar d1a (UI)      -> execucao exec-plano-...-d1a criada, pendente
2. "Executar a tarefa"   -> bloco some, navega para conversa nova
3. composer recebe       -> "PEDIDO-D1 que deve ser executado\n\nObjetivo do plano: ..."
4. onSubmit do Enter     -> a mensagem E' ENVIADA
5. sessao criada         -> rota muda de #/ para #/local-2d2b1f0b...
6. turno do modelo       -> "O B-3PO nao conseguiu concluir esta resposta"
```

**Medido ao vivo.** O passo 4 e' o que faltava desde a V5: transportar punha o texto; **executar** envia.

**Por que o passo 6 falha e isso e' honesto**: `providers: {}` — sem credencial, nenhum modelo responde
(`EXT-3`). **O B-3PO nao simula a resposta**: ele mostra que a resposta falhou.

**O que o D1 NAO faz ainda**: vincular a execucao a sessao automaticamente. A sessao nasce no passo 5 com
id real; `execucaoVinculada` ainda precisa ser chamado com esse id. **E' o proximo passo do D1.**

## O bloqueio central da V6

**`sofia:delegar` cria a execução como `pendente` e nada a consome.**

Verificado por busca em `apps/desktop/electron`, `apps/desktop/src` e `hermes_cli`:

```
grep "assumirPendente|consomePendente|executarPendente|pendente.*executar|assumir("   -> 0 resultados
grep "agent_execution|execution_id.*pendente" em hermes_cli/                          -> 0 resultados
```

**O store de execuções é do processo principal do desktop.** O gateway — que é o runtime Hermes, o único
que sabe abrir sessão e rodar ferramenta — **não conhece esse store**.

**Consequência para o critério de aceite**: *"Coordenar pelo menos uma jornada de desenvolvimento"* não
pode ser satisfeito enquanto ninguém pegar o trabalho. O V5 entregou a **criação** do trabalho e o
**transporte do pedido**; falta o **consumo**.

## r7 — `dev:detect`: como ESTE projeto roda

Sem deteccao, `dev:run` exige que alguem saiba o comando de cor. `hermes:dev:detect` olha o manifesto e
responde `{ gerenciador, testes, build }`, com `argv` pronto — nunca string de shell.

| Manifesto | Detecta |
|---|---|
| `package.json` com `scripts.test` | `<npm\|pnpm\|yarn\|bun> test`, decidido pelo **lockfile** |
| `package.json` com `scripts.build` | `<gerenciador> run build` |
| `pyproject.toml` · `pytest.ini` · `setup.cfg` | `python -m pytest` |
| `Cargo.toml` | `cargo test` · `cargo build` |
| `go.mod` | `go test ./...` · `go build ./...` |
| `Makefile` | `make test` |

**O que ela NAO faz — e e' o ponto**: **nao inventa comando.**

- `package.json` sem `scripts.test` -> `testes: null`. Nao tenta `npx jest`, nao adivinha.
- pasta sem manifesto reconhecivel -> `null` nos tres campos.
- `package.json` acima de 1 MB -> nao e' lido como manifesto.
- JSON invalido -> `null`, sem excecao.

**Por que isso importa**: um botao que roda um comando adivinhado produziria falha, e a pessoa
concluiria que o **projeto** esta' quebrado quando o errado era o comando. **Nenhum botao e' melhor que
um botao errado.**

**11 testes**, incluindo os casos de ausencia: pasta vazia, sem `scripts.test`, JSON invalido, manifesto
gigante.

## r6 — `hermes:dev:run`: rodar e **ler o resultado**

O B-3PO ja' tinha terminal (PTY), mas *"abrir terminal e digitar `npm test`"* e' capacidade **humana**:
nada devolve exit code, nada separa stdout de stderr, nada sabe se passou.

**Canal novo**: `hermes:dev:run` -> `{ cwd, argv }` -> `{ exit_code, saida, erro, duracao_ms, sinal }`.

**E' execucao arbitraria, a capacidade mais perigosa do produto.** O que a cerca:

| Defesa | Por que |
|---|---|
| guarda **antes** de qualquer efeito | mesmo padrao de `terminal:start` (r8 da V4): sem ator com `escrita` em `terminal`, nem valida caminho |
| `cwd` absoluto e sem `..` | procurado no texto **cru**, antes de `normalize` — depois de normalizar o `..` ja' resolveu |
| `cwd` tem de existir e ser diretorio | `stat` antes de executar |
| **`argv` e' lista, nunca string** | sem shell nao ha interpolacao: `;`, `&&`, `|` e `$()` sao argumentos literais |
| `timeout` 15 min · `maxBuffer` 4 MB | comando travado ou que imprime gigabytes nao derruba o app |

**8 testes, 5 negativos** — sem ator, cwd relativo, cwd com `..`, cwd inexistente, argv vazio; e tres
positivos, um deles provando que `a;b && c` chega ao processo como **um argumento**.

**Onde registra**: dentro de `registerTerminalIpc` (que ja' tem `actorOf`), **nao em `main.ts`** — que esta'
no teto de `FILE_LINES` (18.221). A primeira tentativa estourou o teto e o `health` pegou.

**Dois erros meus no caminho, os dois registrados no teste**:
1. `join(pasta,'..','..')` **normaliza** o `..` fora, entao o teste media um caminho sem travessia — e
   rodou `node` sem argumentos, travando no REPL por 240 s. O teste agora monta a string literal.
2. Assumi que `atualizarTarefa` devolvia Promise (r3); o mesmo tipo de suposicao apareceu aqui com
   `execFile` e sua saida — resolvido com `String(...)` em vez de confiar no tipo.

## RETRATACAO (r5) — o inventario da r1 estava errado em duas linhas

**O que eu escrevi na r1**: *"`Projeto` nao tem nenhum campo de caminho … criar projeto = criar **registro de
coordenacao**. Nao ha scaffold, nao ha `mkdir` de projeto."*

**O que era**: existem **dois** stores de projeto.

| Store | O que e' |
|---|---|
| `apps/desktop/electron/project.ts` + `project-store.ts` | coordenacao: objetivo, escopo, criterios, orcamento, equipe — **sem pasta**, e isso esta' certo |
| **`apps/desktop/src/store/projects.ts` (1.454 linhas)** | **o projeto real**: `folders: [{path, label, is_primary}]`, `addProjectFolder`, `pickProjectFolder(s)`, `openFolderAsProject`, `createProject({folders, primaryPath})` |

**Eu auditei o primeiro e concluí sobre a capacidade inteira.** E' o erro nº 1 do `RETRATATIONS` do V5 —
*"eu subestimando o repositorio"* — repetido na primeira rodada da V6.

**Consequencia pratica**: na r5 eu cheguei a implementar um campo `caminho` em `Projeto` (com validacao de
caminho absoluto e `..`), e o `git checkout` mostrou que era **duplicacao** do que ja' existia. **Revertido.**
O §5 e' explicito: *"Nao construir uma segunda IDE se as funcionalidades ja' existirem."*

**O que sobra de real na lacuna**: nao ha **scaffold** — criar "do zero" exige uma pasta que ja' exista. Isso
e' `PARTIAL` honesto, nao `MISSING`.

## Detalhe por capacidade

### 1. Criar projetos do zero — PARTIAL

**Existe**: `hermes:projetos:criar` → `SofiaStore`-irmão `project-store.ts:114 criar()`.

**O que é um "projeto" aqui** (`project.ts`, campos reais): `objetivo, escopo, criterios, entregaveis,
equipe, orcamento_cents, prazo, status, tenant_id, id, nome, created_at, updated_at`.

**O que não existe**: **nenhum campo de caminho**. `grep "caminho|path|dir|pasta"` em `project.ts`
devolve uma única linha — um comentário. Um projeto **não sabe onde vive no disco**.

**Portanto**: criar projeto = criar **registro de coordenação**. Não há scaffold, não há `mkdir` de
projeto, não há template.

### 2. Abrir diretório / importar repositório — PARTIAL

**Existe**: `hermes:fs:openDir`, `hermes:selectPaths` (dialog nativo com `openDirectory`),
`hermes:fs:gitRoot`, `hermes:git:scanRepos` (varre repositórios).

**Falta**: o vínculo. Uma pasta aberta não vira "o projeto X"; o registro de projeto não aponta para ela.

### 3. Arquivos — IMPLEMENTED

**Canais**: `fs:readDir`, `fs:writeText`, `fs:rename`, `fs:trash` (+ `fs:reveal`, `fs:openDir`).

**Autorização**: os quatro de efeito passam por `podeOperarMaquina` e `recusaSeNaoPuder` — auditado por
canal na V5 r50 (4 de 4 com guarda).

### 4. Terminal isolado — IMPLEMENTED

`node-pty` real (`terminal-ipc.ts:13`). 6 canais. `attach`/`write`/`resize`/`cwd`/`dispose` exigem
**posse da janela** (`webContentsId === sender.id`) — r10 fechou quatro e a r50 o quinto.

### 5 · 6. Dependências, testes e builds — PARTIAL

**Não há canal de "instalar" nem de "rodar teste".** O caminho real é: abrir terminal e digitar.
Isso é **capacidade humana via PTY**, não capacidade do produto: nada detecta gerenciador de pacotes,
nada lê o resultado do teste, nada sabe se o build passou.

### 7. Git e GitHub — IMPLEMENTED (local) / PARTIAL (GitHub)

**21 canais** incluindo `repoStatus`, `branchList`, `worktree*`, `review:stage`, `review:unstage`,
`review:commit`, `review:push`, `review:createPr`.

**GitHub** depende de `gh` no PATH e autenticado (`git-review-ops.ts` augmenta PATH e trata
miss/unauthed sem lançar).

### 8 · 9. Preview e inspeção — MISSING

O que existe com nome "preview" é **renderização de arquivo** (`preview-row.tsx`,
`preview-script-runner.ts` roda script de pré-visualização do painel). **Não há servidor de preview**,
**não há porta**, **não há console/rede do app do usuário**.

### 10. Subagentes — PARTIAL

Canais: `agent:roster`, `agent:executions`, `agent:executions:cancel`, `agent:approvals`.

**O bloqueio central** (acima): nada consome `pendente`.

### 11 · 12. Memória, checkpoint e retomada — PARTIAL / IMPLEMENTED

- **Memória**: `apps/desktop/src/app/settings/memory/memory-layers.tsx` (UI sobre memória do gateway).
  A persistência é do runtime; **o desktop só a exibe**.
- **Retomada**: `agent-execution-store.retomar()` + `expirarPendentes()` — V5 r39/r40/r43. **IMPLEMENTED.**

### 13. Artefatos — PARTIAL

`artifact-utils.ts` + tela `#/artifacts`: **lista** os artefatos que a sessão produziu. Não há geração.

### 14. Deploy — MISSING

`grep` por `deploy` em `apps/desktop/electron` e `apps/desktop/src`: **nenhum arquivo**.

## Classificação da plataforma

| | |
|---|---|
| **B-3PO como IDE** (editar, terminal, git) | **PARTIAL** — as peças existem; falta o vínculo projeto↔pasta |
| **B-3PO como studio de agentes** | **NOT_READY** — nada consome `pendente` |
| **B-3PO como plataforma de entrega** | **NOT_READY** — sem preview, sem deploy, sem geração de artefato |

**A V6 não está READY**, e a razão principal é uma só: **o trabalho delegado não é executado**.

## O que a V6 precisa, em ordem de dependência

1. **Consumir `pendente`** — o gateway precisa saber que existe trabalho. Sem isso, nada em §6 e §7 é
   possível. **É o BLOCKER.**
2. **Vincular projeto a pasta** — §5 pede explorador de projetos; hoje projeto não tem caminho.
3. **Preview + console/rede** — §5 pede preview funcional.
4. **Ações de teste/build** — para o benchmark conseguir "executar testes e corrigir falhas".
5. **Deploy com aprovação** — último da fila; depende de 1–4.

**Inferência de modelo continua `BLOCKED_BY_EXTERNAL_DEPENDENCY`** (`EXT-3`, `providers: {}`): sem
credencial, nenhum benchmark real é possível e nenhuma jornada de agente completa.
