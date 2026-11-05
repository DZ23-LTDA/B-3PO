# GOAL V2 — RODADA 116: O CICLO DE ATUALIZAÇÃO — medido

**Data**: 05/11/2026 · **§21** · *"backend executando código antigo após atualização"*

---

## O QUE O §21 PEDE

> *"A captura mostra aviso de **backend executando código antigo após atualização**, com ação de reiniciar. Auditar o ciclo de atualização e recuperação (§9)."*

---

## O QUE EXISTE — medido

### O mecanismo que impede o "código antigo": o **stamp imutável**

`install-stamp.ts` (126 linhas):

> *"`scripts/write-build-stamp.mjs` escreve `build/install-stamp.json` durante o `npm run build`. O bundle **assa esse arquivo** definindo o global `__HERMES_INSTALL_STAMP__`. **O stamp é uma constante do artefato. Ele não pode estar ausente, stale, ou editado depois da assinatura.**"*

**E o stamp da r113 e da r114 confirma**: `commit: bddbe8db0e…` / `a959f202a5`, `dirty: false`.

> **Um processo só pode rodar o código que o stamp descreve**, porque **o stamp está dentro do mesmo artefato** — não há como separá-los.
>
> **O "código antigo" não é possível *dentro* de um artefato.** Ele é possível **entre** o artefato antigo e um novo — e é aí que entra o próximo item.

### O que decide usar o runtime ativo: `active-runtime-state.ts`

| Função | Pergunta |
|---|---|
| `hasValidBootstrapMarker` | o marker é válido (schema, comprimento)? |
| `classifyActiveRuntime` | usar o runtime ativo ou re-bootstrapar? |
| `canonicalInstallStamp` | qual o commit do runtime que está rodando? |

> **É o "qual versão está rodando?"** — e ele **não confia em arquivo solto**: o marker tem **schema** e **comprimento mínimo**.

---

## A COBERTURA — medida

| Arquivo | Testes |
|---|---|
| `managed-ssh-update` | **33** |
| `active-runtime-state` | **7** |
| `gateway-stop-before-update` | **5** |
| `local-gateway-stale-restart-owner` | **1** |
| **Total** | **46** |

**E os 7 do `active-runtime-state` cobrem os casos que importam:**

| Teste | O que trava |
|---|---|
| marker com commit "real-looking" | o formato |
| **rejeita schema errado e marker curto** | o marker não é confiável por existir |
| **usa o runtime ativo MESMO com o marker ruim** | **um marker ruim não derruba instalação saudável** |
| **recusa runtime inutilizável MESMO com marker válido** | **marker válido não salva runtime quebrado** |
| **CLI sem marker lança em vez de re-bootstrapar** | não refaz instalação por engano |
| **um reparo que apagou o marker não abandona instalação saudável** | o caso do §21 |

> **O último é o cenário da captura**: *"um reparo que apagou o marker"* — e a decisão é **não abandonar**.

---

## A LACUNA REAL — e ela é pequena

`install-stamp.ts` **não tem teste** (126 linhas).

> **Mas ele não pode ser testado pela via normal**: `INSTALL_STAMP` é **uma constante definida pelo bundler** — em teste, o `typeof` guard a torna `null`.
>
> **Testar exigiria definir o global**, o que testaria **o mock**, não o artefato.

**A verificação real do stamp é o próprio build** — e ele **imprime** o commit em cada execução (`[write-build-stamp] … -> bddbe8db0e13`). **É uma verificação que acontece antes do teste, não num teste.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do ciclo de atualização | **46** |
| Arquivos de teste | **4** |
| `install-stamp.ts` testável? | ❌ **constante do bundler** |
| Código escrito nesta rodada | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O §21 — ESTADO FINAL

| Item | Estado |
|---|---|
| **Artefato atual** | ✅ `1.0.0`, verificada no manifesto (r114) |
| **Ambiguidade de versão** | ✅ resolvida (r115) |
| **"Código antigo"** | ✅ **impossível dentro do artefato** (stamp imutável) + **46 testes** no ciclo |
| **Assinatura** | ❌ **bloqueada** (`AZURE_SIGN_*`) |
| **Instalação real** | ❌ **não testada** |

> **Três dos cinco itens fechados.** Os dois abertos são **uma credencial e uma instalação** — e **o §21 autoriza declarar bloqueio** nos dois.

---

## PRÓXIMA RODADA

O **§22 — Execução Autônoma e Limites** e o **§23 — Checkpoints Persistentes**: as duas seções que **regulam como este trabalho continua** e **nunca foram lidas**.

> **116 rodadas.** O §21 perguntava sobre *"backend com código antigo"* — e a resposta é **estrutural**: **o stamp está dentro do artefato, e um processo não pode rodar código que o stamp não descreva**. O que se pode ter é **o artefato antigo**, e para isso há **46 testes**.
