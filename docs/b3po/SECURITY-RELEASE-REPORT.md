# SECURITY-RELEASE-REPORT — B-3PO

**Data:** 2026-11-02 · **Commit:** `b3po-brand @ 3c92a2ba` · **Escopo:** auditoria de release, não pentest.

## 1. Dependências (executado)

`npm audit` na raiz do monorepo:

| Severidade | Quantidade |
|---|---|
| críticas | **0** |
| altas | **4** |
| moderadas | **33** |
| baixas / info | 0 |
| **total** | **37** |

### Vulnerabilidades altas

| Pacote | Problema | Impacto provável |
|---|---|---|
| `follow-redirects` | credenciais customizadas podem seguir redirecionamento | requisição HTTP pode vazar header sensível |
| `joi` | regex de e-mail com complexidade quadrática | DoS por entrada adversarial |
| `undici` | (múltiplas) | cliente HTTP do Node |
| `zod` | exaustão de memória em coleções com limites | DoS por payload |

### Leitura honesta

- **0 críticas** — não há bloqueio imediato de release por severidade máxima.
- As 4 altas são majoritariamente **bibliotecas de validação/HTTP** usadas indiretamente. Nenhuma foi explorada
  ou testada aqui; a lista vem do `npm audit`, não de exploração.
- 33 moderadas concentram-se em **tooling de build** (`@electron/*`, `eslint`, `node-pre-gyp`).

**Ação recomendada antes de piloto:** `npm audit fix` seletivo + revisão de `undici`/`follow-redirects`
(o caminho HTTP do gateway passa por eles).

## 2. Controles que existem (confirmados no código)

| Controle | Evidência |
|---|---|
| Aprovação de ação sensível | `tools/approval.py` — notify → resolve → ack/withdraw |
| Gate de escrita por caminho | `agent/file_safety.py` (`is_write_approval_required`) |
| Segredo fora do agente | conector MCP recebe referência; env fica no host |
| Redação de texto sensível | `redact_sensitive_text` no cliente ACP |

## 3. Lacunas abertas (não resolvidas nesta rodada)

| # | Lacuna | Severidade | Situação |
|---|---|---|---|
| S1 | Sem gancho genérico de política pré-execução | alta | mitigado por restrição de toolset + aprovação; contrato em `orchestration.ts` |
| S2 | Aprovação roteada só por gateway | média | desktop ainda sem canal próprio |
| S3 | **37 vulns de dependência (4 altas)** | alta | nenhuma correção aplicada |
| S4 | `~/.hermes` sem criptografia declarada | média | documentar e isolar em teste |
| S5 | Provider local sem auth | baixa | binding em 127.0.0.1 |
| S6 | Sem SBOM nem assinatura de dependências | média | previsto na Fase I |
| S7 | `auth.adopt_external_logins: true` por padrão | **média/alta** | o app lê credenciais de Codex/Claude Code de outros programas |

## 4. Artifact integrity

- MSIX e `.exe` **não assinados** (`NotSigned` verificado); nenhum artefato é declarado assinado.
- SHA-256 registrado no `ARTIFACT-MANIFEST.md`.
- Sem SBOM.

## 5. Veredito

**Não** há bloqueio crítico, mas **há risco alto não mitigado** (S3 e S7). Para piloto interno, exigir:
1. triagem das 4 altas com decisão registrada (corrigir ou aceitar com justificativa);
2. decisão do proprietário sobre `adopt_external_logins` (padrão do upstream, pode não ser aceitável no produto);
3. SBOM gerado e anexado ao release.
