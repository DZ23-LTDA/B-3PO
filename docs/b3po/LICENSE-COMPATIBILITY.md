# LICENSE-COMPATIBILITY — B-3PO e referências

**Data:** 2026-11-03 · Auditoria feita por leitura das licenças nos commits fixados abaixo.

## 1. Inventário de licenças

| Projeto | Commit auditado | Licença | Copyright/Aviso | Uso no B-3PO |
|---|---|---|---|---|
| Hermes Agent (base do B-3PO) | `f4cf411f` (upstream) | **MIT** | Nous Research | base do produto; `LICENSE` + `NOTICE` preservados |
| B-3PO (fork DZ23) | `b3po-brand @ 1a06d3d3` | **MIT** (herdada) | Nous Research + DZ23 | produto |
| Hades-Ollama | `4b3e2185` | **MIT** | "Copyright (c) Ollama" | **referência**; portar só após decisão registrada |
| Codync | `36913495` | **Apache-2.0** | autor do projeto | **referência**; código Apache é compatível, marca **não** |

## 2. Análise de compatibilidade

### MIT → MIT (Hades-Ollama)

- Compatível para incorporação direta, **desde que** o aviso de copyright MIT e o texto da licença
  acompanhem os arquivos derivados.
- O B-3PO já distribui um `NOTICE` com atribuição upstream; trechos do Hades exigem entrada própria
  em `THIRD-PARTY-PROVENANCE.md` e preservação do aviso no arquivo derivado.
- **Risco:** o Hades declara `Copyright (c) Ollama` no MIT. Repassar isso como se fosse marca do B-3PO
  seria incorreto — o aviso fica no arquivo, a marca do produto não muda.

### Apache-2.0 → MIT (Codync)

- Apache-2.0 é compatível com distribuição em projeto MIT: o código pode ser incorporado, **mas** com
  obrigações adicionais:
  1. manter `LICENSE`/`NOTICE` do Apache e avisos de alteração;
  2. marcar arquivos modificados;
  3. conceder a patente implícita do Apache-2.0 §3 aos destinatários;
  4. **não** usar as marcas do projeto.
- **Decisão:** o B-3PO **não copia código do Codync**. Reimplementa contratos próprios (host/client,
  grupos, aprovações, notificações) para evitar acoplamento, obrigação de NOTICE por arquivo e risco de
  contaminação de marca. Se algum trecho for portado no futuro, entra com cabeçalho Apache + entrada de
  proveniência e revisão independente.

### Marca (nenhuma licença cobre)

O `TRADEMARK.md` do Codync (lido no commit `36913495`) é explícito:

> "The code is licensed under Apache 2.0 … The license covers the code only: it does not grant rights
> to the Codync name or logo, or access to the Codync Cloud service."

Consequências obrigatórias para o B-3PO:

| Permitido | Proibido |
|---|---|
| dizer "compatível com Codync" com link | chamar produto/domínio/app de Codync ou algo confundível |
| usar o código Apache com atribuição | usar logo/ícone do Codync |
| estudar a arquitetura | depender do Codync Cloud (`api.codync.dev`) |
| — | sugerir endosso oficial |

**Codync Cloud:** relay proprietário (contas, relay, push, remote-screen). O B-3PO **não** o usa como
infraestrutura. Qualquer relay remoto futuro é serviço B-3PO próprio, com contrato, custos, privacidade
e autenticação documentados.

## 3. Regras aplicadas neste repositório

1. `LICENSE` (MIT) e `NOTICE` (Nous Research + modificações DZ23) permanecem intactos.
2. Marca, mascotes e arte do B-3PO **não** entram no MIT (registrado no `NOTICE`).
3. Nenhum asset, logo, ícone ou nome de Hades/Ollama/Codync foi copiado.
4. Código do B-3PO é escrito próprio; referências servem para contrato e comportamento.
5. Todo port futuro exige: commit de origem, licença, destino, teste e entrada em
   `THIRD-PARTY-PROVENANCE.md`.

## 4. Pendências de licença

| Item | Status |
|---|---|
| Scan automatizado de licenças no CI | **AUSENTE** (backlog) |
| SBOM por release | **AUSENTE** (backlog) |
| Revisão independente de port Apache | não se aplica (nenhum port feito) |
| Auditoria de dependências npm | **PARCIAL** — 4 altas abertas |
