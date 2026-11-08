# Consentimento no CRM: VALIDADO na tela (rodada 208)

## O que a r206 errou

A r206 declarou: *"não consegui abrir a seção de contatos na janela"*, e listou três hipóteses — URL errada, atrás
de conexão, ou defeito de navegação — sem escolher.

**As três estavam erradas.** A seção **está montada em `/crm`** desde antes:

```tsx
// apps/desktop/src/app/crm/index.tsx
<CrmContactsSection showOpenLink={false} />
```

**Eu procurei em Configurações porque `gateway-settings.tsx` a importa**, e não olhei a outra montagem. Depois de
sete rodadas em que a janela revelou defeito, a r206 encontrou um "defeito" que era **da minha busca**.

## A descoberta sobre `devices`

Investigando a pista falsa, achei algo real e **intencional**:

```ts
// other-subpages.ts
{ id: 'devices', labelKey: 'gatewayDevices', available: nativeHostOnly }

// subpages.test.ts
expect(resolveSettingsSubpage('gateway', new URLSearchParams({ page: 'devices' }))).toBeUndefined()
```

**Um teste fixa que `devices` não resolve.** A subpágina é `nativeHostOnly` e está desativada **por design**. O
`CrmContactsSection` montado dentro de `subpage === 'devices'` em `gateway-settings.tsx` **nunca renderiza neste
ambiente** — mas isso não importa, porque a montagem que vale é a do `/crm`.

## O ciclo medido na janela

```
antes do clique:  "Consentimento nao registrado"     (consent: null)
clique em "Registrar autorizacao"
depois:           "Autorizou comunicacao"
arquivo:          {"at":1793843276416,"base":"consentimento","granted":true}
```

**O ciclo completo funciona**: mostra o estado → clica → grava → mostra o novo estado.

## O que a tela mostra agora

| Elemento | Estado |
|---|---|
| Contato "Maria" com telefone | ✓ |
| Linha de consentimento | ✓ "Autorizou comunicacao" |
| Ações | ✓ "Registrar autorizacao" · "Registrar recusa" · "Remover" |
| Persistência | ✓ `consent` gravado no arquivo do CRM |

## A lição

**Duas medições erradas seguidas, e a segunda corrigiu a primeira.**

A r206 disse "não consegui abrir" e registrou como pendência de navegação. A r208 foi **procurar por que** — e
achou que o caminho existia, só não era onde eu olhei.

> **"Não consegui" não é o mesmo que "não existe".** A diferença só aparece quando alguém procura a segunda vez.

## Medido

| Medida | Valor |
|---|---|
| Validação na janela | **SIM** (era NÃO na r206) |
| Ciclo mostra → clica → grava → mostra | **completo** |
| `consent` gravado com `base: 'consentimento'` | **sim** |
| 345 testes em `src/api` + `src/app/settings` | passam |
| Telas que mudaram | 0 (só a validação) |
