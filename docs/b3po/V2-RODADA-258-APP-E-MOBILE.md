# GOAL V2 — RODADA 258: O APP ABRE — E OS DOIS MOBILE, AUDITADOS

**Data**: 06/11/2026 · o dono pediu o menu, o certificado e o estado dos apps

---

## 1. O DESKTOP — AGORA ABRE

**Três bugs em sequência, e o terceiro era meu:**

| # | O que | Estado |
|---|---|---|
| **1** | **`Get-FileHash` no `install.ps1`** | ✅ **corrigido (r257)** — `certutil` como fallback |
| **2** | **`$digest` expandido na minha string PowerShell** | ✅ **corrigido** — aspas simples |
| **3** | **clone do GitHub travando** | ✅ **contornado** — `HERMES_REPO_URL` para o repo local |

**A instalação completa, estágio por estágio:**

```
repository    [OK] Hermes Agent cloned                        186s
venv          [OK] bootstrap Python ready                        5s
python-deps   [OK] dependencies installed                      237s
config        [OK] config prepared                                0s
products      [OK] hermes command installed                    102s
complete      [OK] B-3PO install complete (b151e72231)             1s
```

> **`[OK] B-3PO install complete`. O backend sobe.**

---

## O MENU — 29 itens, dois grupos, e as rotas funcionam

```
CONVERSAS | BOTS
  Nova conversa · Capacidades · Mensageria · CRM · Artefatos · Tarefas agendadas
  Painel · Empresa · Busca · Atendimento · Agenda · Serviços · RH · Produtos
  Estoque · Compras · Vendas · Entregas · Financeiro · Projetos · Trabalhos
  Marketing · Pós-venda · Agentes · Automações · Sofia · Documentos
  Estrutura · Privacidade
```

**Rotas provadas:**

| Clique | Rota |
|---|---|
| Painel | `#/painel` ✅ |
| Empresa | `#/empresa` ✅ |
| Atendimento | `#/atendimento` ✅ |
| Sofia | `#/sofia` ✅ |
| CRM | `#/crm` ✅ |
| Produtos | `#/products` ✅ |

**O Painel renderiza de verdade:**

> *"Uma leitura de todos os domínios. Cada número vem do dono dele; nada é somado aqui."*
>
> **Dinheiro:** R$ 0,00 a receber · R$ 0,00 a pagar · R$ 0,00 saldo previsto
> **Operação:** 0 vendas faturadas · 0 produtos sem estoque · 0 atendimentos atrasados · — satisfação · 0 campanhas vencidas

**O que falta para conversar:** o rodapé diz **"Servidor inferência indisponível"** — **é o `B2–B4` (credencial de modelo), e não é código.**

---

## 2. ANDROID — TEM APK, E ELE ESTÁ ASSINADO COM A CHAVE DE DEBUG

| Item | Valor |
|---|---|
| **Código** | **43 arquivos `.ts/.tsx`, 20 de teste** |
| **APK debug** | **94,47 MB** (11-04 18:29) |
| **APK "release"** | **44,21 MB** (11-04 18:31) |
| **Assinatura** | **`CN=Android Debug`** ⚠️ |

```
Signer #1 certificate DN: C=US, O=Android, CN=Android Debug
Signer #1 certificate SHA-256: 38a55326142374bd3e896ca95fa9ae4a437890363e42f369fb4f5b9df9eae77a
```

> **O arquivo chamado `app-release.apk` está assinado com a chave de DEBUG do Android.**
>
> **Isso não serve para a Play Store**, e **em aparelho com verificação de assinatura ele é recusado.**
>
> **E o `android-brand-shell` não é o app**: **é um splash de 65 linhas** (`LinearLayout` com o logo `b3po_wordmark`, "B-3PO Bot Platform" e as cores da marca). **O APK de 0,3 MB é a tela de apresentação, não o produto.**

---

## 3. iOS — NÃO É POSSÍVEL NESTA MÁQUINA

| Item | Estado |
|---|---|
| `ios/Podfile` | ✅ **existe** |
| `ios/Pods` | ❌ **não instalado** |
| `.xcworkspace` | ❌ **não existe** (vem do `pod install`) |
| **IPA** | ❌ **zero** |
| **`xcodebuild`** | ❌ **não existe** — **é macOS** |

> **iOS não é "falta credencial": é falta de plataforma.** **Compilar iOS exige macOS + Xcode**, **e esta máquina é Windows.**

### E o certificado que você mandou

```
subject: CN=Apple Distribution: leandro prado (K8G36CUP3S)
issuer:  Apple Worldwide Developer Relations Certification Authority
valid:   2026-11-06 a 2027-11-06
thumb:   90AF000FD65CA870AAF0505ACD9657438FAD962B
```

> **O `.cer` é o certificado PÚBLICO.** **Para assinar um IPA faltam duas coisas que ele não contém:**
>
> 1. **`.p12`** — o certificado **com a chave privada** (o `.cer` não tem a chave)
> 2. **`.mobileprovision`** — o perfil de provisionamento do app
>
> **E mesmo com os dois: sem macOS, não há `xcodebuild`.**

---

## O ESTADO REAL DOS TRÊS

| Plataforma | O que existe | O que falta |
|---|---|---|
| **Desktop (Windows)** | ✅ **abre, menu, rotas, Painel** | **credencial de modelo** |
| **Android** | ⚠️ **APK 44 MB, assinado com DEBUG** | **keystore de release** |
| **iOS** | ❌ **só o Podfile** | **macOS + Xcode + `.p12` + profile** |

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Itens no menu** | **29** |
| **Rotas provadas** | **6 de 6** |
| **Estágios do install** | **6 de 6 OK** |
| **APK Android** | **44,21 MB · assinado com `Android Debug`** |
| **IPA iOS** | **0** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o que "pronto" não é

> **O desktop está pronto quando abre.** **O Android não está pronto quando gera um APK — está pronto quando o APK é assinado com uma chave que a loja aceita.**
>
> **E o iOS não está "pendente de credencial": está pendente de uma máquina.** **Três estados diferentes, e o registro tratava os três como "B1/B2–B4/B5".**

---

## PRÓXIMA RODADA

**O keystore de release do Android** — **e a declaração de que iOS exige macOS.**

> **258 rodadas.** **O app abre, o menu aparece, o Painel conta.** **E os dois mobile: um tem APK com chave de debug, o outro precisa de uma máquina que não é esta.**
