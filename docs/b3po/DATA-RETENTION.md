# DATA-RETENTION — WhatsApp CRM e LGPD

**Data:** 2026-11-03 · **Estado:** política definida; execução automática **AUSENTE** (backlog com testes).

## 1. Princípio

Guardar o **mínimo necessário pelo tempo necessário**. Dado que não serve ao atendimento não é
coletado; dado vencido é apagado, não "arquivado para sempre".

## 2. Prazos propostos

| Dado | Retenção | Base |
|---|---|---|
| Mensagens de conversa | **180 dias** após o último contato | histórico de atendimento |
| Notas internas | 180 dias | idem |
| Contato (nome, telefone, tags) | enquanto houver relação ativa; **24 meses** sem interação | legítimo interesse |
| Consentimento (histórico de opt-in/opt-out) | **5 anos** após o último evento | prova de conformidade |
| Auditoria (quem acessou/alterou) | **5 anos** | obrigação legal/defesa |
| Anexos | 90 dias | espaço e sensibilidade |
| Métricas agregadas do funil | indefinido, **sem dado pessoal** | analytics |
| Logs de webhook (id + status) | 30 dias | depuração |
| Tokens/credenciais Meta | enquanto a integração existir; troca imediata em vazamento | operação |

## 3. Direitos do titular (LGPD)

| Direito | Como atender | Estado |
|---|---|---|
| Confirmação e acesso | exportar contato + conversas + consentimento em JSON | **AUSENTE** |
| Correção | editar contato (UI) | PARCIAL (modelo pronto) |
| Exclusão | apagar contato e conversas; manter só o registro mínimo de opt-out | **AUSENTE** |
| Portabilidade | exportação JSON/CSV | **AUSENTE** |
| Revogação de consentimento | opt-out (implementado) | **IMPLEMENTADO** |
| Informação sobre compartilhamento | `PRIVACY-REPORT.md` | PARCIAL |

## 4. Operações obrigatórias do serviço (backlog)

```
export_contact(contact_id) -> json    // contato, consentimento, conversas, negócios
delete_contact(contact_id)  -> report // apaga dado pessoal, preserva prova de opt-out
purge_expired(now)          -> counts // roda diária; aplica os prazos da tabela
audit(operation)            -> entry  // toda exportação/exclusão é auditada
```

Cada operação precisa de: teste unitário, log sanitizado, idempotência e rollback documentado.

## 5. Segurança do armazenamento

- Credenciais da Meta **nunca** no frontend nem em log; cofre do host (mesmo caminho do token de sessão).
- Banco por workspace (isolamento de tenant); nenhuma query sem escopo de workspace.
- Anexos com validação de tipo/tamanho e varredura antes de servir.
- Backup criptografado e restauração testada (backlog).

## 6. Exclusão x prova

Quando o titular pede exclusão, o dado pessoal sai, mas o **registro de opt-out** permanece (data,
origem, evidência mínima) — sem ele não é possível garantir que não voltaremos a contatá-lo.
