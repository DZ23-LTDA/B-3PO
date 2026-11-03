# ACCESSIBILITY-REPORT — B-3PO

**Data:** 2026-11-02 · **Escopo:** o que foi medido e o que **não** foi.

## 1. Medido (com evidência)

| Item | Resultado | Evidência |
|---|---|---|
| Contraste texto/fundo da marca | **20,49:1** (AA exige 4,5) | `scripts/brand_check.py` |
| Contraste texto secundário | **15,04:1** | idem |
| Contraste texto discreto | **10,16:1** (mínimo 3,0) | idem |
| Contraste accent/fundo | **10,74:1** (mínimo 3,0) | idem |
| Cor como único sinal? | regra de marca: accent = interativo/vivo, nunca decoração | `brand/palette.json → rules` |

O gate roda no CI local: qualquer token abaixo do mínimo reprova o build.

## 2. Não medido (não pode ser alegado)

| Item | Situação |
|---|---|
| Navegação por teclado no desktop | **NÃO MEDIDO** |
| Leitor de tela (NVDA/VoiceOver/TalkBack) | **NÃO MEDIDO** |
| Escala de fonte / zoom do sistema | **NÃO MEDIDO** |
| Foco visível em todos os controles | **NÃO MEDIDO** |
| Semântica de ARIA no renderer | **NÃO MEDIDO** |
| Acessibilidade do APK Android | **NÃO MEDIDO** |
| Idioma pt-BR | **AUSENTE** — desktop tem 9 locales, nenhum `pt` |

## 3. Riscos relacionados

1. **Idioma:** um usuário brasileiro usa o produto em inglês — barreira de acessibilidade linguística, não
   apenas de tradução. `pt` está na Fase de i18n, não nesta.
2. **Tema escuro fixo:** o produto assume fundo `#000105`; usuários com sensibilidade a contraste alto não
   têm alternativa clara. O desktop tem seletor de tema, mas o tema B-3PO ainda não foi empacotado.
3. **Mascotes como avatar:** o avatar é decorativo; se carregar informação de estado, precisa de alternativa
   textual (`alt`/rótulo) — o contrato prevê `mascot_id`, a UI ainda não implementa.

## 4. Plano mínimo antes do piloto

1. Rodar auditoria de acessibilidade no desktop (teclado + leitor de tela) e registrar screenshots.
2. Garantir `alt`/rótulo nos avatares e estados.
3. Adicionar `pt` (junto com a Fase de i18n).
4. Verificar contraste de todos os tokens **em uso real** (não só a paleta declarada).
