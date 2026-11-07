# Consentimento no CRM pela tela (rodada 206) — PARCIAL, e o motivo

## O que foi feito

| Camada | Estado |
|---|---|
| Regra (`crm-contacts-store.ts`, r185) | ✓ `Consentimento` + `podeReceberComunicacao` |
| Tipo no renderer | ✓ **adicionado nesta rodada** — `CrmContactRow.consent` **não existia** |
| Texto na lista de contatos | ✓ "Consentimento nao registrado" / "Autorizou" / "Recusou" |
| Ações | ✓ "Registrar autorizacao" e "Registrar recusa" |
| i18n | ✓ 5 chaves em `pt`, `en` e no tipo |

**O tipo não existia.** A r185 gravava `consent` no arquivo; o wrapper de `src/api/crm-contacts.ts` **não o declarava**, então a tela não podia mostrá-lo. Quarto caso do mesmo padrão nesta sessão (192, 201, 205, 206): **store tem, renderer não vê**.

## O que NÃO foi validado

**Não consegui abrir a seção de contatos do CRM na janela.**

`CrmContactsSection` é renderizado dentro de `gateway-settings.tsx`. Tentei as subpáginas de Configurações:

```
#/settings?page=crm           -> "Maria" nao aparece
#/settings?page=crm-contacts  -> nao aparece
#/settings?page=contacts      -> nao aparece
#/settings?page=gateway       -> nao aparece
#/settings?page=connections   -> nao aparece
```

**Nenhuma renderiza a lista.** Não sei se é a URL errada, se a seção está atrás de um grupo que exige conexão, ou se há um defeito de navegação. **Não vou afirmar qual dos três** — e não vou declarar a rodada validada.

## O que está provado

| Afirmação | Evidência |
|---|---|
| `CrmContactRow.consent` existe e tipa | typecheck 0 erros |
| `podeReceberComunicacao` devolve `granted === true` | 345 testes em `src/api` + `src/app/settings` |
| O contato grava `consent: null` quando não foi perguntado | medido no canal: `{"consent":null, ...}` |
| Os textos e botões compilam e são renderizáveis | `crm-contacts-section.test.tsx` passa |

## O que NÃO está provado

- Que o botão aparece na tela
- Que clicar nele grava
- Que o texto muda depois de clicar

## O achado da rodada

Depois de sete rodadas nesta sessão em que **abrir a janela** revelou defeito, esta rodada encontrou o contrário: **um lugar que eu não consigo abrir**. Isso é uma informação sobre o produto, não sobre o teste — **uma tela que existe no código e não tem caminho de navegação conhecido é, na prática, uma tela que não existe para o usuário.**

Fica registrado como pendência de **descoberta de navegação**, não como feature entregue.
