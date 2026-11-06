# B-3PO — DECISÕES

**Regra**: cada decisão registra o que foi decidido, por quê, e o que ficou de fora. Decisão sem
alternativa descartada não é decisão — é registro de vontade.

---

## D-001 · Ser honesto sobre o que não foi medido (06/11/2026)

**Decisão**: nenhum gate recebe `READY` sem comando ou captura. O que não foi exercitado é
`NOT_TESTED`; o que depende de terceiro é `BLOCKED_BY_EXTERNAL_DEPENDENCY`.

**Por quê**: o documento do V3 é explícito — *"ESTES NÚMEROS NÃO SÃO VERIFICAÇÃO ATUAL. CONFIRME-OS
E RECLASSIFIQUE"*. A auditoria herdada do V2 tinha números que não batiam com a realidade de hoje.

**Custo aceito**: entregar `PARTIAL` em vez de `READY` quando falta um pedaço, mesmo que isso pareça
menos impressionante.

---

## D-002 · Não construir a vertical gás/água sem decisão do dono (G4)

**Decisão**: `NOT_IMPLEMENTED`, com três caminhos oferecidos ao proprietário.

**Por quê**: a vertical não é "uma tela" — é **modelo** (vasilhame em comodato, recarga como troca,
leitura periódica em m³). Construir isso por conta própria seria inventar escopo.

**Alternativa descartada**: preencher o gate com telas vazias. **Rejeitada** — é exatamente o
"teatro" que o V3 proíbe.

---

## D-003 · Não mudar `status.overall` para incluir inferência (G2)

**Decisão**: registrar o achado e **não** corrigir.

**Por quê**: `status.py` é superfície compartilhada com o dashboard e a CLI. Mudar o `overall`
mudaria o veredito de saúde **em todas as telas** — decisão de produto sobre o que "saudável"
significa, não de engenharia de rodada.

**Alternativa proposta ao dono**: adicionar um quinto componente `inference` ao `components` (sem
mexer no `overall`). É aditivo e reversível.

---

## D-004 · Corrigir os landmarks mesmo sem pedido explícito (G8)

**Decisão**: **corrigir** `nav` e `main` — e não só registrar.

**Por quê**: era um `FAIL` real, a correção é pequena e reversível, e o critério do gate (`axe +
inspeção manual`) é objetivo. Diferente de D-002/D-003, aqui não havia decisão de produto pendente:
faltava semântica, não faltava requisito.

**Cuidado tomado**: `<main>` no pane do workspace, **não** no shell — para não engolir a navegação.

---

## D-005 · `e2e` via bridge, não via clique, nas jornadas de domínio

**Decisão**: as provas de Compras, Vendas, Sofia e CRM/Estoque usaram o **bridge** que a tela chama.

**Por quê**: o bridge é o contrato real; o clique adiciona a camada de UI, que tem prova própria
(5 viewports, rotas 27/27).

**Limite declarado**: **não** prova que o botão da tela chama o bridge certo. Isso está em
`NOT_TESTED` no `TEST-EVIDENCE.md`.
