# Dívida do catálogo pt-BR — estado e correção

## Correção de um diagnóstico meu (importante)

Na rodada 135 eu escrevi aqui que as 3 linhas pendentes viviam em `quickEntry.*` e que **catálogo e tipo
discordavam**. **Estava errado.** Meu rastreador de caminho confiava em recuo de indentação, e recuo não é
aninhamento.

Refiz com **contagem de chaves**, que é autoritativa. O caminho real é:

| Texto | Caminho verdadeiro |
|---|---|
| `Sign in with a subscription…` | `settings.providers.intro` |
| `Connect your Nous account` | `settings.billing.state.notice.loggedOut.title` |
| `Options that installed plugins add…` | `settings.pluginPages.blurb` |

Nada de `quickEntry`, nada de divergência catálogo↔tipo. Era erro de medição meu, e a "dívida estrutural" que
descrevi aqui **não existia**. As três foram traduzidas na rodada 136, junto com o bloco `settings.providers`
inteiro (20 chaves: conectar conta, desconectar, remover, busca de chaves, endpoint local).

## Estado atual (medido por varredura CDP nas 13 telas)

- **106/106 rótulos** e **49/49 descrições** do catálogo de campos.
- Inglês residual: **2 linhas**, ambas de schema do backend:
  - Sobre: `No Python interpreter is available to check the source update channel.`
  - Avançado: descrição de `updates.nonInteractiveLocalChanges`

## O que continua sendo limitação de arquitetura (não de tradução)

Descrições e valores de enum servidos pelo **schema do backend** não são sobrescrevíveis pelo
`fieldDescriptions` do frontend. Testei duas vezes com rebuild e captura: `terminal.backend` e `memory.provider`
seguem em inglês mesmo com a chave traduzida no catálogo. Para resolver de verdade:

1. i18n no backend (servir a descrição já no idioma), ou
2. um mapa de tradução no painel aplicado **depois** do schema (o painel hoje prefere o schema).

Enquanto isso não é feito, essas 2 linhas ficam em inglês — declaradas, não escondidas.
