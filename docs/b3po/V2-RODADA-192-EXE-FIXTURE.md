# GOAL V2 — RODADA 192: O BUG #4 FECHADO — O FIXTURE GANHOU O BINÁRIO

**Data**: 06/11/2026 · **4ª ordem** · `channel-build-version`

---

## A CAUSA (r191)

```python
elif os.name == "nt":
    executable_name = PureWindowsPath(application.attrib["Executable"]).name
    executable = single(root.glob(f"*-unpacked/{executable_name}"))
```

> **Só no Windows**, o `record` procura o binário desempacotado — **porque o MSIX carrega a versão no metal, e o manifesto pode mentir**.
>
> **E o fixture não criava nenhum `*-unpacked/`.**

---

## A CORREÇÃO

```python
unpacked = root / 'Recorder-win-x64-unpacked'
unpacked.mkdir(exist_ok=True)
(unpacked / 'hermes-no-registry-needed.exe').write_bytes(b'')
```

> **O nome vem do `windowsExecutableName` que o próprio teste declara** (`hermes-no-registry-needed`), **e o diretório casa com o glob `*-unpacked/`**.
>
> **`write_bytes(b'')`** — **um arquivo vazio**, e **é o suficiente**: o `Get-Item` devolve `ProductVersion` vazia, e **o teste não olha esse campo**.

### A limitação, **declarada dentro do script**

> *"um arquivo vazio não tem `ProductVersion`, então este teste **NÃO prova a leitura do binário** — prova o resto do `record` (o `applicationId`, a `version` e o `channelBuild` do manifesto), que é o que ele se chama para provar. **Um `.exe` de verdade aqui seria um binário versionado dentro do repo.**"*

**Isso é o que separa um conserto de um atalho**: **o teste continua exercitando o writer real**, e **o que ele não cobre está escrito**.

---

## O QUE DEU ERRADO — e é a terceira vez na mesma família

**Coloquei os comentários com backticks DENTRO do template literal de Python** — **e o backtick fecha o template do TypeScript**:

```
electron/channel-build-version.test.ts(474,4): error TS1005: ',' expected
```

> **A regra que a sessão já aprendeu**: **nunca escrever backtick em comentário**, **e agora com o motivo certo**: **ele não corrompe o PowerShell — ele fecha o template literal.**

**Corrigido removendo os backticks.**

---

## A PROVA

| Medida | Antes | **Depois** |
|---|---|---|
| `channel-build-version` | **1 falhando** (de 4) | **4 verdes** ✅ |
| Gate · Typecheck | — | **14 ok · 0 erros** |

---

## A 4ª ORDEM — A CONTAGEM

| # | Bug | Estado |
|---|---|---|
| **1** | `system-proxy-env` — o `no_proxy` que sobra | ✅ **r184** |
| **2** | `packaged-working-directory` — fixture + limpeza + árvore | ✅ **r186, r189, r190** |
| **3** | `checkout-source` — o interpretador | ✅ **r188** |
| **4** | `channel-build-version` — o binário no fixture | ✅ **r192** |
| 5 | MSIX manifest — o channel quad | ❌ |
| 6 | `state-db-preflight` — o WAL | ❌ |

> **4 de 6.** **E os quatro têm a mesma raiz**: **um caminho que só o Windows percorre, e um fixture que não o prepara**.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Bugs fechados** | **4 de 6** |
| Testes do arquivo | **4 verdes** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — **o backtick que fecha o template**

> **A sessão passou 190 rodadas tratando backtick como "coisa que corrompe o PowerShell".** **Hoje ele mostrou o outro poder**: **fechar um template literal do TypeScript**, **e o erro aparece na linha seguinte, longe da causa**.
>
> **A regra fica mais forte, não mais fraca**: **backtick não entra em comentário — nem em shell, nem em template.**

---

## PRÓXIMA RODADA

**O #5** — o MSIX manifest, **que é o mesmo teste que acabou de passar**: **depois do #4, ele roda até o fim** — **e o que ele encontrar agora é o produto**.

> **192 rodadas.** **Quatro bugs, quatro fixtures** — **e o quinto provavelmente já não é**: **o #5 e o #4 são o MESMO `test`**, **e o `record` que ele chamava agora completa.**
