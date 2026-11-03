# REFERENCE CODYNC ANALYSIS — `leepokai/Codync`

Documento canônico exigido pelo GOAL §04. Registra o que foi examinado na referência de **experiência de
Bots**, o que foi decidido e o que é **proibido** copiar. Decisões em
[`FEATURE_ADOPTION_MATRIX.md`](./FEATURE_ADOPTION_MATRIX.md); origem/licença em
[`../legal/THIRD_PARTY_PROVENANCE.md`](../legal/THIRD_PARTY_PROVENANCE.md).

## 1. Identidade da referência (verificado)

| Campo | Valor |
|---|---|
| Origem indicada | `https://github.com/leepokai/Codync` |
| Clone examinado | `DZ23-LTDA/Codync` (fork), commit `7037e8fd` — *Merge pull request #228 … feat/mark-parity*, 2026-11-02 |
| Commit fixado na proveniência | `36913495` |
| Licença | **Apache-2.0** (lida no `LICENSE` do clone) + `TRADEMARK.md` |
| Estrutura vista | `apps/`, `host/`, `cloud/`, `discord/`, `docs/`, `assets/`, `build/` |

**Atenção de proveniência:** o GOAL cita `leepokai/Codync`; o material examinado é o fork
`DZ23-LTDA/Codync`. Os dois são Apache-2.0 no que foi lido, mas o registro fica explícito para não
confundir origem upstream com fork.

## 2. O que foi examinado

- **host/client**: um host local que serve a sessão; clientes (desktop e mobile) que apresentam e enviam
  intenções, sem duplicar a execução;
- **pareamento de dispositivos** e credencial por dispositivo;
- **conversas persistentes** por Bot, incluindo título, prévia, não lidas e retomada;
- **grupos** e colaboração entre Bots, menções, replies e handoff;
- **estados "needs you" / "done"** — o que o usuário precisa saber sem abrir a conversa;
- **notificações** e o princípio de que notificação **não** é autorização;
- **sincronização e reconexão** (cursor/revisão, replay, deduplicação, ordem);
- **plataforma**: Electron para desktop, Expo/React Native para mobile, SQLite para estado local;
- **UI/UX**: sidebar de Bots, Home, painel de conversa, trace.

## 3. Decisões

| Classe | Capacidades |
|---|---|
| **A — adotar o conceito** | Bots persistentes com identidade própria; conversa canônica por Bot; host/servidor local como dono da sessão; estados de trabalho visíveis |
| **B — adaptar** | pareamento sem relay de terceiro; cursor/replay adaptado ao contrato do gateway Hermes; não lidas e prévia da última mensagem |
| **C — referência de UX** | composição da Home, sidebar com mascote, painel de conversa, trace legível |
| **D — postergar** | grupos multi-Bot com handoff completo, widgets, marketplace de extensões |
| **E — rejeitar** | copiar marca, logo, nome, ícone ou identidade visual; depender de `Codync Cloud`; relay externo por padrão; segundo dono de sessão |

## 4. O que foi reimplementado (não copiado)

- **Pareamento**: o B-3PO tem contrato próprio (`b3po://pair?url=…&token=…`), cofre de dispositivos em
  `hermes_cli/b3po_devices.py`, chave por dispositivo e ticket de uso único
  (`/api/b3po/device-ticket`) com allowlist de métodos WS (`tui_gateway/device_scope.py`).
- **Cliente mobile**: `mobile/b3po-app` é React Native 0.81 com navegação própria (uma pilha de ~40 linhas,
  porque `react-native-screens` e `react-native-keychain` não passam no codegen da Nova Arquitetura neste
  ambiente), lista de bots, lista de conversas por bot, envio e reconexão.
- **Estados de trabalho**: os indicadores só aparecem quando há evento real do runtime — nunca inventados.

## 5. Proibições registradas (marca)

- Nenhum nome, logo, ícone, cor de marca, captura ou texto do Codync foi usado no produto.
- `TRADEMARK.md` da referência foi tratado como vinculante: a licença Apache-2.0 cobre código, **não**
  marca nem serviço hospedado.
- Nenhum asset da referência está no repositório; os mascotes e o wordmark são arte própria DZ23.

## 6. Limites desta análise

- Não executamos o Codync nesta máquina; a leitura foi de código/estrutura e documentação.
- Não há integração em produção com o produto de referência, nem dependência dele em runtime.
