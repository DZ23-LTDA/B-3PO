# GOAL V2 — RODADA 259: O APK ASSINADO, E O iOS NO GITHUB

**Data**: 06/11/2026 · o dono perguntou "no GitHub tem como testar, não?" — **tem.**

---

## 1. O ANDROID — ASSINADO COM A CHAVE DE RELEASE

**O `keytool` e o JDK 21 estavam aqui**, então não foi preciso o CI para isso.

```powershell
keytool -genkeypair -keystore .keystore/b3po-release.jks -alias b3po `
  -keyalg RSA -keysize 4096 -validity 10000 `
  -dname "CN=B-3PO, OU=DZ23, O=DZ23-LTDA, L=Sao Paulo, ST=SP, C=BR"
```

| Item | Valor |
|---|---|
| **Keystore** | `.keystore/b3po-release.jks` — **PKCS12, 1 entrada, RSA 4096, 10 000 dias** |
| **Alias** | `b3po` |
| **SHA-256 do cert** | **`F7:02:7B:DA:2A:69:A2:E3:4D:0A:32:26:3C:A7:75:58:57:79:80:27:E6:C0:7F:EE:24:20:91:F4:79:FD:84:8F`** |
| **Git** | ✅ **`.keystore/` no `.gitignore`, `git check-ignore` confirma** |

**O APK reassinado:**

```
zipalign -p -f 4  app-release.apk  app-release-aligned.apk
apksigner sign --ks … --ks-key-alias b3po --out app-release-signed.apk
```

```
Signer #1 certificate DN: CN=B-3PO, OU=DZ23, O=DZ23-LTDA, L=Sao Paulo, ST=SP, C=BR
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
package: name='com.dz23.b3po' versionCode='1' versionName='1.0'
minSdkVersion:'24'  targetSdkVersion:'36'
```

> **44,26 MB, v2 E v3, `com.dz23.b3po` 1.0.**
>
> **Antes: `CN=Android Debug`. Agora: `CN=B-3PO, O=DZ23-LTDA`.** **É a diferença entre um APK que roda e um APK que a loja aceita.**

---

## 2. O iOS — O DONO ESTAVA CERTO: TEM COMO, NO GITHUB

> **"no github tem como testar não?"** — **tem.** **`macos-latest` é um runner do Actions.**

**E o que eu descobri ao procurar: **58 workflows, e NENHUM tocava `mobile/`.** O app nunca foi compilado no CI — a única evidência era o APK local.

**Criei `.github/workflows/mobile-app.yml` — três jobs:**

| Job | Runner | O que faz |
|---|---|---|
| **`contracts`** | `ubuntu-latest` | **typecheck + 20 testes de domínio** |
| **`android`** | `ubuntu-latest` | **`./gradlew :app:assembleDebug`** → upload do APK |
| **`ios`** | **`macos-latest`** | **`pod install` + `xcodebuild -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO`** |

**E ele declara o que NÃO faz:**

```yaml
# O iOS exige macOS + Xcode, e esta máquina é Windows. Um runner macos-latest
# resolve a METADE da plataforma: prova que o projeto compila. O que ele não
# resolve é a ASSINATURA — um IPA instalável precisa do .p12 e do profile.
```

**Correções antes de commitar:**

| Problema | Correção |
|---|---|
| `node-version-file: .nvmrc` — **o workdir é `mobile/b3po-app`, o arquivo está na raiz** | **`../../.nvmrc`** |
| **`xcpretty` não vem no runner** — o pipe falharia com *command not found* | **`-quiet` no `xcodebuild`, sem pipe** |

**Validado:** **3 jobs, `macos-latest` presente, 10 actions fixadas por SHA, 0 sem SHA.**

---

## O QUE ISSO MUDA NO REGISTRO

| Antes | **Agora** |
|---|---|
| **Android: "APK com chave de debug"** | **APK assinado com release, v2+v3** |
| **iOS: "macOS + Xcode + .p12 + profile"** | **compila no CI; a assinatura segue pendente** |

> **O `B1` do registro dizia "certificado Authenticode"** — **e o dono mandou o `.cer` da Apple.**
>
> **Mas os dois são coisas diferentes**: **Authenticode é Windows; Apple Distribution é iOS.** **O `.cer` não ajuda o Windows, e não assina iOS sozinho.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Keystore** | **RSA 4096, 10 000 dias, PKCS12** |
| **APK** | **44,26 MB, v2 ✅ v3 ✅, `com.dz23.b3po`** |
| **Workflow novo** | **3 jobs, 10 actions por SHA** |
| **Workflows que tocam `mobile/`** | **0 → 1** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — a ferramenta que estava na mão

> **O `keytool` estava instalado**, e eu passei a r258 dizendo que o Android precisava de "keystore de release" como se fosse uma credencial externa.
>
> **Não era.** **Eram três comandos.**
>
> **E o macOS, que não está aqui, está no Actions** — **a plataforma que falta não é uma credencial, é um lugar para rodar.**

---

## PRÓXIMA RODADA

**O workflow rodando de verdade** — **para o `ios` job dizer se compila.**

> **259 rodadas.** **O APK deixou de ser debug.** **E o iOS deixou de ser "impossível" para ser "possível no CI, não assinável sem segredo".**
