# GOAL V2 — RODADA 115: O `0.0.0` FOI EMBORA

**Data**: 05/11/2026 · **§21** · *"deixá-lo no `release/` é exatamente o que fez o §21 duvidar da versão"*

---

## O QUE FOI FEITO

```
removido: B3PO-0.0.0-win-x64.msix (191.4 MB)
```

**Verificado antes de remover** — a instrução é explícita: *"antes de qualquer exclusão, confirmar que o caminho absoluto resolvido é o pretendido"*.

| Verificação | Resultado |
|---|---|
| **Caminho absoluto** | `…\apps\desktop\release\B3PO-0.0.0-win-x64.msix` |
| Data | **04/11/2026 06:19** — anterior a esta sessão |
| **Versionado no git?** | ❌ **ignorado** (`git check-ignore` confirmou) |
| É código? | ❌ **artefato de build** |

---

## O `release/` AGORA

| Item | Tamanho | Quando |
|---|---|---|
| `win-unpacked/` | dir | 05/11 15:53 |
| `win-unpacked.bak/` | dir | 05/11 15:51 — **rollback do próprio build** |
| **`B3PO-1.0.0-win-x64.msix`** | **191.5 MB** | **05/11 15:54** |
| `builder-debug.yml` | 0.3 MB | 05/11 15:54 |

> **Um único MSIX, e ele é o de hoje.**

---

## POR QUE ISSO IMPORTA

> **O §21 mediu dois artefatos com versões diferentes e não pôde concluir nada** — porque **o nome do arquivo não comprova versão**, e havia **dois** para escolher.
>
> **Agora há um.** E a versão dele foi **verificada dentro do `AppxManifest.xml`** (`1.0.0.0`), não no nome.

**Não é limpeza estética**: é **remover a ambiguidade que impediu uma auditoria**.

---

## O QUE **NÃO** FOI REMOVIDO — e por quê

| Item | Por quê |
|---|---|
| `win-unpacked.bak/` | **é o rollback do build atual** — o `[before-pack]` o criou para poder desfazer |
| `builder-debug.yml` | é **saída do `electron-builder`** para diagnóstico |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Espaço liberado | **191.4 MB** |
| MSIX no `release/` | **1** (era 2) |
| Código alterado | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## O §21 — ESTADO FINAL

| Item | Estado |
|---|---|
| **Artefato atual** | ✅ **`1.0.0`, de hoje** |
| **Metadados internos** | ✅ **`1.0.0.0` no manifesto** |
| **Assinatura** | ❌ **bloqueada — `AZURE_SIGN_*` ausente** |
| **Instalação real** | ❌ **não testada** (exige instalar no Windows) |
| **Ambiguidade de versão** | ✅ **resolvida** |

> **O §21 diz**: *"Assinatura Authenticode… dependem de credenciais; **marcar bloqueio se indisponíveis**."*
>
> **Dois dos quatro itens estão fechados. Os outros dois são uma credencial e uma instalação** — e **nenhum dos dois se resolve com código**.

---

## PRÓXIMA RODADA

**Verificar o ciclo de atualização** — o §21 também pede: *"A captura mostra aviso de **backend executando código antigo após atualização**, com ação de reiniciar. Auditar o ciclo de atualização e recuperação (Seção 9)."*

> **115 rodadas.** A rodada **não escreveu código** — **removeu 191 MB que impediam uma auditoria**. E o §21, que começou com *"não inferir que nome do arquivo comprova versão"*, agora tem **um arquivo só e a prova dentro dele**.
