# Correção do meu próprio achado: o parâmetro de `serverTenant` (rodada 159)

## O que a r158 registrou

> *"Seis ou mais chamadores passam o valor do renderer para `serverTenant()`, que o ignora. É seguro agora, mas o
> padrão diz ao próximo leitor que o tenant do renderer participa da decisão. **Risco estrutural.**"*

## O que a leitura da função mostrou

```ts
/**
 * O parâmetro existe só para deixar explícito, na chamada, que havia um valor do renderer e ele foi
 * descartado. Um canal que simplesmente ignorasse `payload` sem dizer isso pareceria distração.
 */
export function serverTenant(_fromRenderer?: unknown): string {
  return INSTALLATION_TENANT
}
```

Duas coisas que eu não tinha visto ao fazer o grep:

1. **O nome é `_fromRenderer`** — a convenção para "intencionalmente não usado".
2. **Há um comentário que explica a decisão**: o parâmetro existe para que `store.list(tenant(payload))` diga
   *na chamada* que havia um valor do renderer e ele foi descartado.

**O achado da r158 estava exagerado.** Não é um convite ao erro — é **documentação no ponto de chamada**.
Chamar de "risco estrutural" foi ler a assinatura sem ler a intenção ao lado dela — o mesmo erro que eu já
tinha registrado na r150 (achar duplicação onde havia camadas distintas).

## O que ainda faltava de verdade

Nada travava o invariante. Se alguém trocasse o corpo por:

```ts
return String(_fromRenderer || INSTALLATION_TENANT)   // ERRO
```

**nenhum teste atual quebraria** — porque todos medem o comportamento de hoje, não a regra.

## O que a r159 fez: 6 invariantes, todos verdes

`server-tenant-invariant.test.ts`:

| Teste | O que trava |
|---|---|
| devolve sempre a constante | o caso base |
| ignora `'empresa_b'`, `''` | string arbitrária |
| ignora `{ tenant_id: 'empresa_b' }` | payload inteiro passado por engano |
| ignora `'LOCAL'`, `' local '`, `null`, `undefined` | quase-iguais e vazios |
| **dois valores opostos dão o mesmo resultado** | a prova mais direta de que o argumento não participa |
| `INSTALLATION_TENANT === 'local'` | a constante continua literal |

## O que eu poderia ter feito e NÃO fiz

Transformar `serverTenant()` em sem-parâmetro, ou fazê-la lançar. **Não fiz**, e por um motivo que a leitura
mudou: o parâmetro tem **função documental**, e removê-lo apagaria a explicação de por que o valor do renderer é
descartado em vez de simplesmente ausente.

**A correção certa não era mudar a assinatura. Era travar o invariante.**

## O que continua verdadeiro da r158

| Item | Estado |
|---|---|
| Isolamento entre tenants nos 3 stores novos | **provado** (8 testes) |
| Nenhum canal **usa** o tenant do renderer | **provado** |
| Isolamento em `crm`/`finance`/`whatsapp` originais | **não testado** |
| Busca, cache, filas, jobs | `NOT_TESTED` |
| LGPD: consentimento no CRM | `NOT_IMPLEMENTED` |

## Medido

| Medida | Valor |
|---|---|
| Achados meus corrigidos nesta faixa | **2** (r150 "duplicação", r159 "risco estrutural") |
| Invariantes de tenant escritos | **6** |
| Código de produto alterado | **0** |
| Mudanças de assinatura | **0** — e a decisão de não mudar está justificada acima |
