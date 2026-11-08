# STORE-METADATA — rascunhos de publicação

**Estado: RASCUNHO. Nada foi publicado, nenhuma conta foi criada, nenhum pagamento foi feito.**
Publicar depende de aprovação do proprietário, revisão jurídica da marca (F1) e credenciais que não existem
neste ambiente.

---

## 1. Microsoft Store (MSIX)

| Campo | Valor proposto |
|---|---|
| Nome do produto | B-3PO |
| Identidade do pacote | `DZ23.B3PO` (MSIX AppId, ver `apps/desktop/product-identity.cjs`) |
| Publisher | `CN=DZ23-LTDA` — **exige certificado de code signing** (hoje inexistente) |
| Categoria | Productivity → Developer tools |
| Preço | Indefinido (decisão do proprietário) |
| Classificação etária | Pendente de avaliação (agente de IA conversacional) |
| Idioma | Inglês (interface); `pt-BR` ainda não existe |
| Artefato | `B3PO-0.0.0-win-x64.msix` — **NotSigned**, portanto não aceito pela Store como está |

**Requisito bloqueante:** assinatura com certificado válido + conta de parceiro Microsoft.

## 2. Google Play (Android)

| Campo | Valor proposto |
|---|---|
| Nome do app | B-3PO |
| Application ID | `com.dz23.b3po` (casca atual; o cliente funcional ainda não existe) |
| Categoria | Productivity |
| minSdk / targetSdk | 26 / 35 (documentado em `MOBILE-ARCHITECTURE-DECISION.md`) |
| Formato | **AAB** (o APK atual é de debug e uma casca visual, não o produto) |
| Permissões declaradas | nenhuma além de INTERNET |
| Data safety | Precisa ser preenchido quando houver cliente real (hoje: app não coleta nada, porque não faz nada) |
| Política de privacidade | URL pública **inexistente** — bloqueia a publicação |

**Requisito bloqueante:** cliente Android funcional + política de privacidade publicada + AAB assinado com
keystore de release.

## 3. Apple App Store / TestFlight (iOS)

| Campo | Valor proposto |
|---|---|
| Nome | B-3PO |
| Bundle ID | `com.dz23.b3po` |
| Deployment target | iOS 16 (proposta) |
| Formato | Archive → IPA |
| Entitlements | Keychain (tokens), sem APNs até haver backend de notificação |

**Requisito bloqueante:** macOS + Xcode + conta Apple Developer. **Nada foi gerado** — não há `.app`, nem
`.dmg`, nem archive neste ambiente.

## 4. O que **não** pode ser afirmado hoje

- Que existe build "pronto para loja" em qualquer plataforma.
- Que há conta, certificado ou contrato com qualquer loja.
- Que o app coleta ou deixa de coletar dados no mobile (a casca não executa nada; o cliente não existe).

## 5. Checklist mínimo antes de qualquer submissão

1. Decisão jurídica sobre a marca (F1) — "3PO" tem risco de associação com Lucasfilm/Disney.
2. Certificado Windows (EV ou OV) e keystore Android de release; conta Apple se houver iOS.
3. Política de privacidade e termos de uso publicados em URL estável.
4. Cliente real por plataforma, com instalação limpa comprovada (`RELEASE-READINESS.md`).
5. Screenshots e textos revisados com a identidade oficial (`brand/BRAND.md`).
6. Aprovação explícita do proprietário por escrito antes de publicar.
