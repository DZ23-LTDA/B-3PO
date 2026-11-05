# GOAL V2 — RODADA 114: O MSIX — E O ACHADO DO §21 RESOLVIDO

**Data**: 05/11/2026 · **§21** · o artefato que o cliente instala

---

## O QUE O §21 DIZIA

> *"O relatorio informa **MSIX antigo 0.0.0** em uma checagem anterior e executavel win-unpacked **1.0.0**. A verificacao posterior cita **B3PO-1.0.0-win-x64.msix**. Conferir artefato atual, **metadados internos**, assinatura e instalacao real. **Nao inferir que nome do arquivo comprova versao.**"*

**Era exatamente o estado medido na r113.**

---

## O QUE FOI FEITO

```
• building    target=MSIX arch=x64 file=release\B3PO-1.0.0-win-x64.msix
• custom msix manifest found  manifestPath=assets\msix-manifest.xml
• AppX/MSIX package is not signed  reason=Windows Store only build
• signing with signtool.exe  path=release\B3PO-1.0.0-win-x64.msix
[status: completed, exit code: 0]
```

| MSIX | Tamanho | Quando |
|---|---|---|
| `B3PO-0.0.0-win-x64.msix` | 191.4 MB | **04/11 06:19** — o antigo |
| **`B3PO-1.0.0-win-x64.msix`** | **191.5 MB** | **05/11 15:54** — **novo** |

---

## A VERIFICAÇÃO QUE O §21 EXIGE — metadados internos, não o nome

> **"Não inferir que nome do arquivo comprova versão."**

**Abri o `AppxManifest.xml` dentro do MSIX:**

```xml
Version="1.0.0.0"
```

> **O manifesto diz `1.0.0.0`** — o nome **e** o conteúdo concordam.
>
> **E o `exe` dentro do pacote** tem `FileVersion: 1.0.0` / `ProductVersion: 1.0.0.0` / **`ProductName: B-3PO`** / **`CompanyName: DZ23-LTDA`**.

**A versão não é um nome de arquivo: é uma linha de XML dentro de um zip de 191 MB.**

---

## O QUE O MSIX **NÃO** É

| Item | Estado |
|---|---|
| **Assinado com Authenticode** | ❌ **`AZURE_SIGN_*` não existe** |
| *"AppX/MSIX package is not signed — reason=Windows Store only build"* | ✅ **dito pelo próprio build** |
| **Instalação real testada** | ❌ **não** — exigiria instalar o pacote no Windows |

> **O §21 autoriza o bloqueio**: *"Assinatura Authenticode… **dependem de certificados/hardware/credenciais; marcar bloqueio se indisponiveis**."*

**E o `reason=Windows Store only build` é a explicação do próprio `electron-builder`**: o MSIX **sem assinatura** só serve para a Store, que assina na publicação.

---

## O QUE ISSO FECHA

| Achado do §21 | Estado |
|---|---|
| *"MSIX antigo 0.0.0"* | ✅ **existe um `1.0.0` novo** |
| *"executavel win-unpacked 1.0.0"* | ✅ **confirmado por metadados** |
| *"B3PO-1.0.0-win-x64.msix"* | ✅ **gerado** |
| *"não inferir pelo nome"* | ✅ **verificado no manifesto** |
| *"assinatura… marcar bloqueio"* | ✅ **bloqueado, com a razão dita** |
| *"instalação real"* | ❌ **não testada** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Exit code | **0** |
| MSIX gerado | **191.5 MB**, `1.0.0` |
| **Versão no manifesto** | **1.0.0.0** |
| Binários assinados | **0** (sem credencial) |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## PRÓXIMA RODADA

**O `0.0.0` ainda está lá.** Ele é **de ontem** e **não é o produto** — e deixá-lo no `release/` é **exatamente** o que fez o §21 duvidar da versão.

> **114 rodadas.** O artefato que o §21 contestava **existe, é `1.0.0`, e o manifesto confirma** — e a única coisa que ele **não** tem é **a assinatura de um certificado que não existe nesta máquina**.
