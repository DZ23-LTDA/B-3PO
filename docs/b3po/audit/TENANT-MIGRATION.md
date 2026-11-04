# Migração de tenant — decisão pendente (rodada 21)

**Status:** IMPLEMENTADA E TESTADA, NÃO EXECUTADA EM DADOS REAIS. O executor existe em `apps/desktop/electron/tenant-migrate.ts` com backup, verificação e rollback; falta alguém decidir rodá-lo sobre um `userData` de verdade.

## Situação hoje

Todos os domínios gravam `tenant_id = 'local'`, vindo de `DEFAULT_TENANT` em `catalog-store.ts`.
Funciona porque há uma empresa só. Com `companies-store.ts`, o tenant canônico passa a ser o id da
empresa — mas **nenhum dado existente foi migrado**.

## Por que não migrar agora

Trocar o `tenant_id` de todos os registros significa reescrever `catalog.json`, `inventory.json`,
`sales.json`, `finance.json`, `scheduling.json`, `purchases.json` e os quatro arquivos do CRM. Isso é
**migração de dados**, e o GOAL proíbe migração destrutiva sem backup e rollback.

O risco concreto: se a reescrita falhar no meio, parte dos lançamentos ficaria sob `local` e parte sob
o id da empresa. O saldo derivado do estoque mudaria sem nenhuma movimentação ter acontecido — que é
exatamente o tipo de inconsistência que este projeto passou 20 rodadas evitando.

## O que a migração precisa ter, quando for feita

1. **Backup** de todos os arquivos para uma pasta datada, antes de qualquer escrita.
2. **Reescrita atômica por arquivo** (`write` + `rename`), com contagem de registros antes e depois.
3. **Verificação**: para cada domínio, o total de registros e os saldos derivados precisam ser
   idênticos antes e depois. Estoque é o mais sensível — `balanceFor` por SKU deve bater.
4. **Rollback**: restaurar os arquivos do backup e reconferir.
5. **Teste** da migração em cópia dos arquivos, não nos originais.

## O que já está pronto para ela

- o registro canônico de empresa (`companies-store.ts`), com CNPJ único e filiais;
- todo domínio já carrega `tenant_id` como campo obrigatório desde a criação;
- todo leitura de domínio já filtra por tenant (`productsFor`, `balances`, `list`, etc.).

Ou seja: o dado **aceita** a troca sem mudança de schema. O que falta é o procedimento seguro.

## Enquanto isso

`DEFAULT_TENANT = 'local'` continua sendo o valor usado. Cadastrar uma empresa **não** muda nada nos
outros domínios — e isso é intencional: cadastro e migração são passos separados, e o segundo não pode
acontecer por acidente ao preencher um formulário.
