# `i18n-keys` — a única das 60 falhas que era minha (rodada 163)

## O que a r162 deixou pendente

Das seis classes de falha, uma podia ter sido causada por esta sessão:

```
scripts/i18n-keys.test.mjs
  the committed locales/_keys.desktop.json matches the English catalog (run `npm run i18n:keys`)
```

O próprio teste **diz o comando que conserta**. Rodei.

## O resultado

```
node scripts/i18n-keys.mjs
wrote .../locales/_keys.desktop.json

locales/_keys.desktop.json | 457 +++++++++++++++++++++++++++++++++++++
1 file changed, 457 insertions(+)
```

**457 chaves faltavam no catálogo.** Entre elas, as que eu mesmo criei:

```
settings.agenda.book            settings.agenda.cancel
settings.agenda.conflict        settings.agenda.date
settings.agenda.duration        settings.agenda.empty
crmOverview.contacts            crmOverview.lateTasks
crmOverview.openOpportunities   crmOverview.openValue
```

Todas de trabalho desta sessão: a tela de agenda (r127–133) e o painel de CRM. Eu adicionei as chaves nos
arquivos de locale e **não regenerei o catálogo derivado**.

**Isso é meu.** Não é fixture, não é ambiente, não é upstream. É um passo que eu pulei.

## Por que o teste não falhou antes de mim

Ele falha **agora** porque as chaves existem e o catálogo não as tem. Antes de eu adicionar
`settings.agenda.*`, catálogo e locales estavam em sincronia e o teste passava.

## Verificado

```
scripts/i18n-keys.test.mjs                  2 testes, 2 passaram
src/i18n/overlay-completeness.test.ts       2 testes, 2 passaram
```

## O que isso ensina sobre o resto das falhas

A r162 classificou 60 falhas em seis classes e concluiu que cinco eram de ambiente/upstream. Esta rodada
**confirmou uma sexta** — a única que podia ser minha — e **era minha**.

**A classificação estava certa sobre as outras cinco, e essa só ficou provada porque eu fui verificar.**

Se eu tivesse parado na r162 dizendo *"as 60 são de ambiente"*, teria engolido **457 chaves de tradução**
faltando em um produto cujo critério de aceite é *"nenhum texto de interface em inglês sem justificativa"*.

## O efeito no critério pt-BR

| Antes | Depois |
|---|---|
| catálogo com 457 chaves de diferença do real | **sincronizado** |
| `i18n-keys` falhando | **2/2 passando** |
| overlay de completude | **2/2 passando** |

O pt-BR do produto não mudou — o que mudou é que **o registro do que existe agora corresponde ao que existe**.

## Medido

| Medida | Valor |
|---|---|
| Falhas reclassificadas como minhas | **1** (de 60) |
| Chaves que faltavam no catálogo | **457** |
| Testes que passaram a verde | **4** (2 + 2) |
| Comandos executados | **1** (`npm run i18n:keys`) |
