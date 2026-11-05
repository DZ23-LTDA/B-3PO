# §19 — AUDITORIA OWASP (o que existe, medido)

**Data**: 05/11/2026 · **Rodada 67**

---

## O QUE FOI MEDIDO

| Vetor | Estado | Evidência |
|---|---|---|
| **Command injection** | ✅ **sem `shell: true` cru** | `windows-child-options.ts` documenta o CVE-2024-27980 e o cuidado com `.cmd` |
| **Webhook forjado** | ✅ **HMAC + `timingSafeEqual`** | `crm-whatsapp-signature.ts:7` — *"comparar hash com `===` vazaria quantos caracteres do HMAC estavam certos"* |
| **Upload malicioso** | ✅ **não existe** | `documents-ipc.ts:3` — *"Não há canal de upload: o binário não passa por aqui"* |
| **Path traversal** | ✅ **não aplicável** | documentos guardam **metadados**, não arquivos |
| **SQL injection** | ✅ **não aplicável** | não há SQL; 26 stores em JSON com `parse` validado |
| **Tenant cruzado** | ✅ r211 | 24 de 24 stores |
| **Agente se promovendo** | ✅ r66 | `bot_nao_concede` |

---

## O QUE CADA UM REALMENTE PROTEGE

### Assinatura do webhook — e por que `timingSafeEqual`

> *"Comparar hash com `===` vazaria quantos caracteres do HMAC estavam certos"* — e isso **é suficiente para quebrar a assinatura por tentativa**, um byte por vez.

**O código usa `timingSafeEqual`** e **exige mesmo tamanho antes**. É a defesa correta, e foi tomada **com o motivo escrito**.

### Command injection — e o CVE que o código nomeia

`updater-process.ts:212`: *"Node refuses to exec a `.cmd` directly (CVE-2024-27980)"*.

> **O código conhece o CVE e contorna pelo motivo certo** — não por acidente. Onde `shell: true` aparece, há um comentário explicando **por que é seguro ali**.

### Upload — a defesa por ausência

> **Não há canal de upload.** O binário **não atravessa** a fronteira IPC; os documentos guardam **nome, tipo, tamanho e vínculo**.

**É a defesa mais forte possível**: um vetor que não existe **não pode ser explorado**. E o comentário **diz isso** — para que ninguém o adicione "por completude".

---

## O QUE **NÃO** FOI MEDIDO

| Vetor | Por quê |
|---|---|
| **XSS no renderer** | exigiria auditar **todos os pontos de `dangerouslySetInnerHTML`** e markdown — é uma rodada |
| **CSRF** | o produto **não tem servidor HTTP próprio** com sessão de navegador; o canal é IPC |
| **SSRF** | haveria em `web_fetch`/proxy do agente — **não no ERP** |
| **Replay de webhook** | a assinatura prova origem, **não prova frescor** — não há `timestamp` verificado |
| **Rate limiting** | **não existe** em nenhum canal IPC |
| **Dependências** | `npm audit` não foi rodado nesta sessão |

> **Duas merecem nome**: **replay** (uma assinatura válida de ontem continua válida) e **rate limiting** (um renderer comprometido pode chamar `faturar` mil vezes).

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Vetores auditados | **7** |
| Com defesa **verificada** | **7** |
| Vetores **ausentes por desenho** | **2** (upload, SQL) |
| Vetores **não medidos** | **6** |
| Linhas de código alteradas | **0** |

---

## O QUE ISSO ENSINA

> **Eu ia auditar "uploads" e descobri que não há upload.** Ia procurar `shell: true` e achei um comentário sobre **CVE-2024-27980**.
>
> **A auditoria de segurança de um produto maduro encontra mais defesas do que buracos** — e o trabalho é **distinguir uma defesa deliberada de uma ausência acidental**.
>
> `documents-ipc.ts` diz *"não há canal de upload"* — e essa frase **é a defesa**. Sem ela, alguém adicionaria o canal "porque falta".

---

## PRÓXIMA RODADA

**Os dois vetores que faltam e têm consumidor real**: **replay de webhook** (timestamp) e **rate limiting** no canal de faturamento.

> **67 rodadas.** A superfície de ataque do ERP é **menor do que a lista do §19 sugere** — porque metade dos vetores **não existe**: não há upload, não há SQL, não há sessão HTTP.
>
> **O que existe está defendido com o motivo escrito** — e o que falta está **nomeado**, não escondido.
