# BRAND RISK REPORT — marca "B-3PO"

**Data:** 2026-11-03 · **Estado:** identidade **provisória e interna** (F1). Nenhum lançamento público,
anúncio, submissão a loja ou mudança de visibilidade foi feita — e nenhuma deve ser feita sem decisão
jurídica e do proprietário.

## 1. O risco, em uma frase

"B-3PO" é deliberadamente vizinho de **C-3PO**, personagem da franquia **Star Wars**, cujos direitos
pertencem à **Lucasfilm Ltd.** (The Walt Disney Company). A semelhança não é incidental: grafia
(`3PO`), estrutura (`letra-número-letra`) e a leitura em voz alta são praticamente idênticas.

## 2. Por que isso importa (não é jurídico, é engenharia de risco)

| Vetor | Impacto |
|---|---|
| Marca registrada | "C-3PO" é marca registrada em classes de software/entretenimento; uso comercial pode gerar oposição |
| Trade dress / personagem | um robô de protocolo dourado evocando o personagem agrava a associação |
| Distribuição em lojas | Microsoft/Apple/Google podem recusar ou remover por violação de PI de terceiros |
| Domínio e redes | handle e domínio podem ser contestados mesmo fora do registro de marca |
| Due diligence | investidor ou parceiro comercial vai perguntar sobre isso antes de qualquer contrato |

**Observação importante:** nada aqui afirma que haja infração. Afirma que **o risco existe, é identificável
e precisa de decisão antes de dinheiro trocar de mãos.**

## 3. O que já está protegido no código

- Identidade centralizada em `brand/` (nome, paleta, 20 mascotes, ícones) — trocar de nome é uma mudança
  de dados, não uma reescrita.
- `NOTICE` deixa explícito que a marca e a arte são da DZ23 e **não** entram no MIT.
- Repositório, aplicativo, pacote e marca pública são campos **separáveis** (F1): o nome de trabalho pode
  mudar sem tocar no runtime, nos dados do usuário ou no engine.
- Nenhum asset da Lucasfilm foi usado; os mascotes e o robô são arte própria.

## 4. Cenários e custo de troca

| Cenário | Custo técnico estimado |
|---|---|
| Manter "B-3PO" só como nome interno e lançar com outro nome | baixo: `brand/brand.json` + `product-identity.cjs` + locales |
| Renomear agora, antes de publicar qualquer artefato | baixo (nenhum usuário externo ainda) |
| Renomear depois de publicar | alto: package ids, atualizações, lojas, usuários |

O momento mais barato para decidir é **antes da primeira publicação** — que ainda não aconteceu.

## 5. Recomendação (técnica, não jurídica)

1. Consultar um advogado de PI antes de qualquer lançamento comercial — decisão do proprietário.
2. Enquanto isso, manter "B-3PO" apenas como identidade **interna/provisória**, sem release público.
3. Preparar um plano de renomeação barato: os campos separáveis já existem; falta um teste que garanta
   que trocar `brand.json` propaga para app, pacote e mobile (hoje a identidade do desktop vem de
   `product-identity.cjs`, que é código, não dado — **ponto de melhoria registrado**).
4. Não registrar domínio nem abrir contas de loja com o nome antes da decisão.

## 6. O que este relatório não faz

Não substitui parecer jurídico, não avalia o registro de marca em nenhuma jurisdição específica, e não
conclui sobre probabilidade de êxito. É um registro de risco técnico para orientar a decisão.
