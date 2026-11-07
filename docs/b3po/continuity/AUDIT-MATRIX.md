# B-3PO — AUDIT MATRIX

**Regra**: cada linha é uma medição, não uma opinião. `READY` exige evidência reproduzível;
`PARCIAL` diz exatamente o que falta; `NOT_READY` não tem desculpa.
**Atualizado**: 06/11/2026 · **Rodada**: 61 · **Data**: 06/11/2026

---

## B3 · Os seis modos — AUDITADO POR MEDIÇÃO

**Ferramenta**: Playwright sobre o Electron real (`dev:fake-boot`, CDP 9333).
**Método**: selecionar cada modo no `<select aria-label="Modo de trabalho">`, medir o menu, clicar
em cada item e conferir a rota.

### Persistência

| | |
|---|---|
| Procedimento | selecionar `engenharia` → recarregar a janela → ler o valor |
| Resultado | `antes do reload: engenharia` · `depois: engenharia` |
| **Estado** | **READY** |

### Foco

| | |
|---|---|
| Procedimento | `.focus()` no seletor e ler o estilo computado + `:focus-visible` |
| Resultado | `outline: solid 2px rgb(0, 83, 253)` · `:focus-visible` = `true` |
| **Estado** | **READY** — o anel existe e tem contraste (o produto remove `ring`, por isso a regra é `outline`) |

### Rolagem

| Modo | itens | sidebar | |
|---|---|---|---|
| **Empresa** | **27** | **ROLÁVEL 937/1215** | precisa rolar |
| Engenharia | 10 | cabe | |
| Automação | 14 | cabe | |
| IA e Agentes | 12 | cabe | |
| Estratégico | 12 | cabe | |
| Administração | 12 | cabe | |

| | |
|---|---|
| **Estado** | **READY** — `scrollHeight` 1215 > `clientHeight` 937 no pior caso, e a barra rola |

### Rotas

**27 itens clicados um a um no modo Empresa. 27 navegaram.** Duas ocorrências que NÃO são falha:

| Item | Destino | Por quê não é falha |
|---|---|---|
| Nova conversa | `#/` (não mudou) | já estava na home; abre um rascunho |
| Novo projeto | `#/privacidade` (não mudou) | abre um **modal**, não uma rota |

| | |
|---|---|
| **Estado** | **READY** |

### RBAC — o achado que importa

| Modo | itens no menu | itens **exclusivos** |
|---|---|---|
| **Empresa** | **27** | **11** (Atendimento, Agenda, Serviços, Produtos, Estoque, Compras, Vendas, Entregas, Financeiro, Projetos, Trabalhos) |
| Engenharia | 10 | **0** |
| Automação | 14 | **0** |
| IA e Agentes | 12 | **0** |
| Estratégico | 12 | **0** |
| Administração | 12 | **0** |

**O que isso significa, sem maquiar**: o filtro **funciona** (Empresa mostra 27, Engenharia 10 — o
`nav-rbac` corta), mas **cinco dos seis modos não têm nenhum item que só eles tenham**. Eles são
subconjuntos do mesmo cardápio:

- Engenharia = Painel, CRM, Estrutura, Privacidade
- Automação = Projetos, Trabalhos, Agentes, Automações, Sofia, Documentos
- IA e Agentes = Agentes, Automações, Sofia, Documentos
- Estratégico = **idêntico a IA e Agentes** (12 itens, mesma lista)
- Administração = Projetos, Trabalhos, Estrutura, Privacidade

**Estratégico e IA e Agentes têm a MESMA lista.** Não há diferença observável entre os dois.

| | |
|---|---|
| **Estado** | **PARCIAL** — o RBAC filtra, mas a diferenciação de conteúdo entre modos não existe fora de Empresa |

**Ação necessária (não feita)**: decidir com o dono o que cada modo deve oferecer de próprio. Isso
é decisão de produto, não correção de bug — inventar telas para "preencher" os modos seria teatro.

---

## O que NÃO foi auditado nesta rodada

| Item | Por quê |
|---|---|
| RBAC **por ator** (não por modo) | exige um ator com escopos restritos; o HOME de teste não tem |
| Persistência **por conexão** | exige duas conexões (local + remota) |
| Foco ao **navegar por teclado** entre itens | exige percurso de Tab completo, medido à parte |
| Migração de menu entre versões | sem versão anterior no HOME de teste |
