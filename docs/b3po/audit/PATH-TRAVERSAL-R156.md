# Path traversal em `fs-ipc` — o que existe e o que o comentário afirmava (rodada 156)

**Pendência declarada que nunca tinha sido auditada.**

## O que a auditoria encontrou

### 1. `rename` está correto

`hermes:fs:rename` recebe `newName` e **recusa** `.`, `..`, `/` e `\` antes de montar o destino. Não há traversal
por ali.

### 2. `fs-ipc.test.ts` DESLIGA a hardening

```ts
resolveRequestedPathForIpc: value => value,
```

O teste do `fs-ipc` substitui a função de hardening por **identidade**. Faz sentido para exercitar o encanamento
das rotas, mas o efeito colateral é que **nenhum teste de `fs-ipc` prova proteção de caminho**.

### 3. `hardening.test.ts` não cobria `..`

Cobria `\0`, device paths (`//?/`, `globalroot/device/`) e URL `file:` malformada. **Nenhum caso de `..`.**

### 4. O comentário afirmava uma proteção inexistente — o achado principal

`fs-ipc.ts` dizia, sobre `writeText`:

> *"the path is hardened … this **never** creates directory trees or escapes the **allowed roots**"*

**Não existe lista de "allowed roots" em `hardening.ts`.** `rejectUnsafePathSyntax` rejeita sintaxe insegura
(NUL, device path) e `path.resolve` **normaliza** `..` em vez de recusá-lo. Nada compara o resultado com uma raiz.

**Um comentário que descreve uma garantia não implementada é pior que nenhum**: quem revisa lê, acredita e passa.

## O comportamento real, agora fixado em teste

`hardening-traversal.test.ts` — **7 testes, todos verdes**, documentando o fato:

| Entrada | Resultado |
|---|---|
| `arquivo\0.txt` | **rejeitado** |
| `""` / `"   "` | **rejeitado** |
| `//?/C:/Windows/.../SAM` | **rejeitado** |
| `../../../etc/passwd` com base `C:\proj\app` | **aceito**, normalizado para fora da árvore |
| `C:\Windows\System32\drivers\etc\hosts` | **aceito** |
| `~/.ssh/id_rsa` | **aceito**, expandido para o home |

Nenhum destes testes "conserta" nada. Todos fixam o comportamento **real** para que a decisão seguinte seja
tomada com o fato à vista.

## Qual é o modelo de ameaça, na prática

O renderer é **código do próprio app** (`contextIsolation`, `nodeIntegration: false`). O `fs-ipc` existe porque
o app é um editor/host: abrir qualquer arquivo que o usuário escolha é **função**, não falha.

A consequência honesta:

> **Um XSS no renderer equivale a escrita arbitrária de arquivo no computador do usuário**, limitada a 1 MB por
> chamada e a diretórios-pai que já existam.

Isso **não é** o mesmo que "path traversal clássico" (onde um invasor remoto escolhe o caminho). É uma
**superfície de escalada pós-XSS**.

## O que eu fiz, e o que eu NÃO fiz

| | |
|---|---|
| Corrigi o comentário para dizer a verdade | **sim** |
| Escrevi o teste que fixa o comportamento | **sim** |
| Adicionei lista de roots | **NÃO** |

**Por que não adicionei roots.** Confinar o caminho a uma raiz mudaria o produto: o usuário deixaria de abrir
arquivos fora dela. Não é uma correção de bug — é uma **decisão de modelo de ameaça** que pertence a quem
responde pelo produto, e tomá-la sozinho quebraria a função principal do `fs-ipc` para resolver um risco que só
existe **depois** de outro defeito (XSS).

O que ficou registrado é o que faltava: **o fato medido, a consequência declarada, e o que decidiria a questão.**

## Recomendação para a faixa 211–225

| Ação | Por que |
|---|---|
| Habilitar CSP estrita no renderer | reduz a probabilidade do XSS que precede esta escalada |
| `setWindowOpenHandler` já nega tudo | verificado em rodadas anteriores |
| Considerar root opcional por perfil | se o produto quiser modo "operar só dentro de pasta" |
| Manter o teste de traversal | impede que alguém reintroduza o comentário mentiroso |

## Medido

| Medida | Valor |
|---|---|
| Handlers de `fs-ipc` auditados | 11 |
| Comentários de segurança falsos encontrados | **1** |
| Testes de traversal escritos | **7** (todos verdes) |
| Testes de traversal que existiam antes | **0** |
| Vulnerabilidades "consertadas" | **0** — uma foi **nomeada** |
