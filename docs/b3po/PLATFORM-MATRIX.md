# PLATFORM-MATRIX — o que esta máquina consegue produzir

Fatos medidos em 2026-11-02, Windows 11 Pro (10.0.26300).

| Plataforma | Artefato esperado | Ferramentas presentes | Status real | Bloqueio |
|---|---|---|---|---|
| **Windows** | `.exe` / MSIX (NSIS conforme config) | Node 26, npm 12, electron-builder, JDK 21 | **VIÁVEL** | sem certificado de assinatura → SmartScreen |
| **macOS** | `.app`, `.dmg`/`.pkg` | nenhuma (sem Xcode, sem `sips`/`hdiutil`) | **IMPOSSÍVEL AQUI** | hardware Apple + Xcode + certificados |
| **iOS** | archive/IPA | nenhuma (sem Xcode) | **IMPOSSÍVEL AQUI** | macOS + Xcode + provisioning |
| **Linux** | AppImage, `.deb`, `.rpm` | Docker + WSL presentes | **VIÁVEL VIA CONTAINER** (não executado) | electron-builder não empacota Linux nativo no Windows |
| **Android** | APK/AAB | JDK 21, Android SDK em `tools\android\sdk`, `adb` | **SEM PROJETO** | não existe cliente mobile no repositório |

## Consequência para o status final

- Windows é a plataforma que pode chegar a **artefato + instalação comprovada** nesta máquina.
- macOS/iOS são **BLOCKED_BY_EXTERNAL_DEPENDENCY** por hardware/certificado — não é falha de código.
- Linux é viável, mas exige container; pode ser executado em rodada dedicada.
- Android/iOS dependem de decisão de arquitetura + cliente novo (ver `MOBILE-ARCHITECTURE-DECISION.md`).

## Como desbloquear

1. **macOS/iOS**: um Mac (físico ou runner macOS no GitHub Actions) + certificado Apple Developer.
2. **Android**: projeto cliente (Kotlin ou React Native) + Gradle wrapper; SDK já existe.
3. **Windows assinado**: certificado EV/OV Code Signing.
4. **Linux**: rodar `docker run` com a imagem do electron-builder e o script `dist:linux`.

## Atualização 21:30 — Android

| Plataforma | Artefato | Status |
|---|---|---|
| Android | `b3po-android-shell-debug.apk` (301 KB, assinado com debug keystore) | **casca de marca instalada e executada** no AVD `dsh_pixel` |
| Android (cliente real) | — | pendente do contrato de sessão (Fase E) |

O APK não é o cliente do produto; é prova de pipeline + identidade. Nenhuma funcionalidade de bot foi
implementada nem alegada.

## Atualização 22:35 — Linux: tentativa e bloqueio exato

Tentativa de gerar AppImage:

| Caminho | Resultado |
|---|---|
| Docker (`docker run node:26-bookworm`) | **bloqueado** — daemon parado: `npipe:////./pipe/dockerDesktopLinuxEngine` não existe |
| WSL `Ubuntu` | WSL instalado, mas **sem Node nativo**; o `npm` encontrado é o do Windows via interop (`/mnt/c/Program Files/nodejs`) — não serve para empacotar Linux |

**Dependência externa:** iniciar o Docker Desktop (serviço) ou instalar Node 26 nativo dentro do WSL.
Ambos exigem ação no host que não é build reproduzível — por isso o Linux fica **BLOCKED**, não "não tentado".
Alternativa segura: rodar o workflow num runner `ubuntu-latest` (CI), que já tem toolchain Linux.

**Nenhum artefato Linux é declarado aqui.**

## Atualização final (2026-11-03)

- **Auth:** empréstimo de login externo agora é opt-in (`false` por padrão), com 13 testes do gate e 214 em `test_auth*` verdes.
- **Mobile:** decisão RN confirmada; protocolo + cliente de API + sessão segura implementados (26 testes).
- **Marca:** `BRAND-RISK-REPORT.md` criado.
- Status por plataforma: ver matriz no `RELEASE-READINESS.md` e a tabela A–H do `EXECUTIVE-REPORT.md`.
