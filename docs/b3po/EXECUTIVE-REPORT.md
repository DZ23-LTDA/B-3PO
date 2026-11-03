# RELATÓRIO EXECUTIVO — B-3PO Bot Platform

**Data:** 2026-11-02 · **Branch de produto:** `b3po-brand` · **Base:** `main` = espelho limpo do upstream
**Execução:** autônoma, autorizada pelo proprietário (Leandro/DZ23)

---

## 1. Resumo

O repositório Hermes Agent (MIT, Nous Research) foi transformado em **B-3PO**: identidade própria com 20
mascotes, aplicativo desktop rebrandado e empacotado, contratos de domínio (schema do Bot v1 e adaptador de
orquestração) implementados e testados, casca Android com a marca, CI na branch de produto e 36 documentos
de engenharia.

O núcleo técnico está **provado por teste**. O produto **não** está pronto para revisão do proprietário como
entrega multiplataforma: falta instalação limpa assinada no Windows, cliente mobile, Linux/macOS/iOS e o
roteiro visual ponta a ponta do desktop.

## 2. Branches, commits e PR

| Item | Valor |
|---|---|
| Branch de trabalho | `b3po-brand` |
| Commits DZ23 | **32** (este relatório incluso) |
| `main` | `f4cf411f` — **0 commits DZ23** (política F2-A mantida) |
| Pull Request | `DZ23-LTDA/B-3PO#1` (draft, "NÃO MESCLAR") |
| Worktree | limpo |

## 3. Plataformas

| Plataforma | Artefato | Status |
|---|---|---|
| **Windows** | `B-3PO.exe` (235,6 MB) + `B3PO-0.0.0-win-x64.msix` (185,5 MB) | **PARCIAL** — build ok, instalação limpa impossível (MSIX `NotSigned`) |
| **Android** | `b3po-android-shell-debug.apk` (301 KB) | **PARCIAL (casca)** — instala e abre; não é o cliente |
| **Linux** | nenhum | **BLOQUEADO** — Docker parado; WSL sem Node nativo |
| **macOS** | nenhum | **BLOQUEADO** — exige Xcode + certificado Apple |
| **iOS** | nenhum | **BLOQUEADO** — exige Xcode + conta Apple |

## 4. Artefatos e integridade

| Artefato | SHA-256 | Assinatura |
|---|---|---|
| `B-3PO.exe` | `41170c009afad4c4271306ecaacaeb047a510221856695971361371f2561f12d` | **não assinado** |
| `B3PO-0.0.0-win-x64.msix` | `71f2b3ed45aa32353fc320a02d59ed825d7d27a0bd306e8c0252c049bb5486f0` | **NotSigned** (verificado por Authenticode) |
| `b3po-android-shell-debug.apk` | `a96b4a33…` | keystore **debug** |

Nenhum artefato é chamado de assinado, notarizado ou pronto para loja.

## 5. Testes executados

| Suíte | Resultado |
|---|---|
| `scripts/check` (gates do repo) | **14 checks ok** |
| Testes de domínio (schema, orquestração, mascotes, grade, look) | **47 verdes** |
| Suíte de UI do desktop | **1.519 arquivos ok / 5 com falha; 6 testes falhando** (ambientais, pré-existentes e documentadas) |
| Testes de i18n | **84 verdes** |
| Build + typecheck + lint | exit 0 |
| Turno real do agente (CLI, provider local) | **13,4 s**, resposta `B-3PO online` |
| CI GitHub (branch de produto) | **verde** em todos os pushes desde `a33eda00` (gate de marca + 47 testes de domínio + typecheck) |
| App Electron em execução | **validado por screenshot** (onboarding B-3PO) |

## 6. Segurança

- `npm audit`: **0 críticas, 4 altas, 33–34 moderadas**. As altas são indiretas (`follow-redirects`, `joi`,
  `undici`, `zod`); `--force` exigiria major e foi recusado.
- `auth.adopt_external_logins: true` por padrão — **decisão do proprietário**.
- Telemetria desligada por padrão (duplo opt-in), sem identificador de hardware.
- Nenhum segredo em commit; artefatos sem assinatura declarados como tal.

## 7. Licenças e proveniência

MIT preservado com `NOTICE` creditando Nous Research; marca, robô e 20 mascotes **fora** do MIT (DZ23).
Risco de marca registrado (F1): "3PO" tem associação com Lucasfilm/Disney — lançamento público exige
avaliação jurídica.

## 8. Riscos

1. Marca (F1) — bloqueio jurídico antes de qualquer lançamento.
2. 4 vulnerabilidades altas sem correção.
3. Instalação assinada inexistente — SmartScreen bloqueia usuários reais.
4. Interface ainda majoritariamente com cópia "Hermes" fora do onboarding.
5. Sem cliente mobile: o Android entregue é apenas casca.
6. `pt-BR` ausente.

## 9. Dependências externas

| Dependência | Bloqueia |
|---|---|
| Certificado de code signing Windows | instalação limpa MSIX, Store |
| macOS + Xcode + conta Apple | `.app`, `.dmg`, `.pkg`, archive/IPA |
| Docker daemon ou Node no WSL | AppImage/`.deb` Linux |
| Conta Play Store + keystore de release | AAB/publicação Android |
| Política de privacidade publicada | publicação em qualquer loja |

## 10. Rollback

- Nenhuma alteração em `main`; reverter = abandonar `b3po-brand`.
- Migração de dados do desktop: `userData` mudou com o rebranding; os dados antigos **permanecem** no
  diretório anterior (sem exclusão automática).
- Schema do Bot v1: migração idempotente, com default restritivo para registros antigos.

## 11. Instalação

Ver `INSTALL.md`. Resumo: Windows usa `win-unpacked\B-3PO.exe` (não assinado); MSIX não instala sem
certificado; demais plataformas bloqueadas.

## 12. Limitações conhecidas

- `cliName` continua `hermes`; `~/.hermes` e `HERMES_*` preservados (decisão da Ata).
- Roteiro visual do F5 (criar bot → mascote → turno → reiniciar) **não executado**: o app exige um gateway,
  e o runtime não foi instalado no caminho que ele espera.
- E2E do repo não roda neste Windows (harness de devshell nix/Linux).
- Acessibilidade e performance: parcialmente medidas (contraste e tempos de build; teclado, leitor de tela e
  startup **não medidos**).

## 13. Decisões que pertencem ao proprietário

1. Marca: seguir com "B-3PO" ou renomear antes do lançamento (risco jurídico).
2. Comprar certificado Windows e definir canal de distribuição.
3. Escolher a tecnologia mobile (recomendação: React Native) e autorizar o cliente.
4. Decidir sobre `adopt_external_logins` no produto.
5. Autorizar (ou não) a criação de política de privacidade e contas de loja.
6. Priorizar `pt-BR`.

---

**Veredito:** o núcleo está implementado e testado; o produto **não** está pronto para revisão como entrega
multiplataforma, e nada aqui deve ser lido como "100% pronto", "produção" ou "pronto para lançamento".

NOT_READY: faltam instalação limpa assinada (Windows), cliente mobile (Android/iOS), artefatos Linux/macOS/iOS e a execução ponta a ponta do roteiro F5; existem ainda 4 vulnerabilidades altas de dependência e a interface não está integralmente rebrandada.

---

## Encerramento da execução autônoma (2026-11-03 00:20)

**O que ficou provado:** identidade de marca com gates, contratos de domínio (schema v1 + orquestração) com 47
testes, persistência de `mascot_id` nos fluxos de criação e edição, catálogo de 20 mascotes, app desktop
rebrandado e executando (evidência por screenshot), MSIX gerado e verificado como `NotSigned`, casca Android
instalada, CI verde e 36 documentos de engenharia.

**O que impede o `READY_FOR_OWNER_REVIEW`:** certificado de assinatura Windows (bloqueia instalação limpa),
macOS/Xcode (bloqueia `.app`/`.dmg`/iOS), toolchain Linux (Docker parado, WSL sem Node), ausência de cliente
mobile funcional, 4 vulnerabilidades altas de dependência e o roteiro visual do F5 não executado no app.

Esses bloqueios persistiram por mais de 10 rodadas sem alteração de ambiente — são dependências externas, não
trabalho pendente de código.
