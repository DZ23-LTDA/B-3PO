# CHANGELOG — B-3PO Bot Platform

Formato: cada entrada diz o que existe **com evidência** e o que é apenas planejado.
Não há versão publicada; o produto está em MVP interno pré-lançamento.

## [Não publicado] — branch `b3po-brand`

### Identidade e marca
- `brand/` como fonte única: `brand.json`, `palette.json`, 13 primitivas medidas na arte, 9 tokens semânticos,
  20 mascotes 512×512, wordmarks e ícones.
- Gate `scripts/brand_check.py` (14 checagens): assets, contraste AA, cor provisória proibida, nível 3 proibido.
- `NOTICE` preservando a atribuição MIT ao Hermes Agent.
- Desktop rebrandado: `productName` B-3PO, `appId com.dz23.b3po`, ícone da marca, `CompanyName DZ23-LTDA`.
  **`cliName` continua `hermes`** (renomeação de nível 2 não autorizada).

### Contratos de domínio
- **Schema do Bot v1** (`bot-schema.ts`): `identity` / `runtime_config` / `links_and_state`;
  `engine` só aceita `hermes`; `permission_policy` obrigatória com default restritivo; migração idempotente.
  12 testes.
- **Adaptador de orquestração v1** (`orchestration.ts`): mapeia `turn.*`/`tool.*` reais para o contrato;
  evento não suportado vira `null` (proibido fabricar); `capabilities` declara o que existe; `decideTool`
  aplica `deny > allow > default`; `ExecutionLog` idempotente. 13 testes.

### Plataformas
- **Windows**: build, empacotamento (`B-3PO.exe`) e instalador **MSIX** gerados; ambos **não assinados**.
- **Android**: casca de marca nativa compilada (aapt2 + d8, sem Gradle), APK assinado com keystore de debug,
  instalada e executada no emulador. **Não é** o cliente do produto.
- **Linux**: build via container (ver `docs/b3po/ARTIFACT-MANIFEST.md` para o resultado real).
- **macOS/iOS**: bloqueados — sem macOS/Xcode.

### Qualidade
- CI `.github/workflows/b3po-brand.yml`: gate de marca + 26 testes de domínio + typecheck, actions pinadas por SHA.
- Suíte de UI: 12.760 passando / 6 falhando (falhas ambientais documentadas).
- `scripts/check`: 14 checks verdes.

### Segurança e privacidade
- `npm audit`: 0 críticas, 4 altas, 33 moderadas — **sem correção aplicada**.
- Telemetria desligada por padrão (duplo opt-in); `adopt_external_logins` ligado por padrão (decisão pendente).

### Planejado (não implementado)
- Fiação do schema/orquestração na UI; criação de bot com `mascot_id` e política efetiva.
- Instalação limpa assinada e updater.
- Cliente Android funcional; iOS; Linux empacotado de forma reprodutível.
- `pt-BR`; auditoria de acessibilidade; SBOM no release.
