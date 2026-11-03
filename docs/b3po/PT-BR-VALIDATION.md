# PT-BR-VALIDATION — estado real da tradução

**Data:** 2026-11-03 · **Branch:** `b3po-brand` · **Commit do catálogo:** `15368294`

## 1. Cobertura medida (não estimada)

`apps/desktop/src/i18n/pt-coverage.test.ts` calcula a fração de chaves do catálogo inglês que o pt
traduz, com piso ratchet (só sobe):

| Métrica | Valor |
|---|---|
| chaves no catálogo inglês | base do teste (`flattenMessageKeys(en)`) |
| chaves traduzidas em pt | 3,11% |
| piso travado no teste | `0.031` |
| seções completas | `common`, `language`, `errors`, `ui` |
| seções ampliadas | `install`, `modelPicker` |

O piso existe para impedir regressão: qualquer remoção de tradução falha o teste.

## 2. Testes (99 no total de i18n, todos verdes)

`pt.test.ts` (9) e `pt-coverage.test.ts` (7) garantem:

1. **registro** — `pt` no catálogo, no seletor e nos aliases (`pt`, `pt-BR`, `pt_br`);
2. **cobertura** — piso medido, sem chave inventada (typo), sem string vazia;
3. **placeholders** — os nomes interpolados (`${term}`, `${platform}`, …) são idênticos aos do inglês,
   então uma tradução não pode renderizar `undefined`;
4. **aridade** — onde o inglês tem função, o pt tem função com o mesmo número de parâmetros;
5. **fallback** — chave não traduzida cai no inglês (`pt.fileMenu.copyPath === en.fileMenu.copyPath`);
6. **referências técnicas** — "Hermes Agent" e "Nous" continuam em inglês onde são nome próprio.

## 3. Validação no app real — o que foi obtido e o que NÃO foi

**Obtido (evidência real):**

- Gateway do runtime instalado: `state: ready`, `code_sha 6b25838e`;
- `config.yaml` com `display.language: pt` (verificado por `hermes config get display.language` → `pt`);
- App desktop conectado a esse gateway (`conn:local::default`, `profile=default`);
- Ajustes reais mostrando `provider: ollama`, `model: qwen3.5:4b` vindos dessa config
  (`evidence/f5-pt-settings-dialog.png`).

**NÃO obtido:** a UI renderizando português. O renderer do app **continua em inglês**
(`SESSIONS`, `New session`, `No sessions yet`, `Choose the language for the desktop interface.`),
capturado via CDP do próprio Electron (`evidence/f5-pt-main-window.png` e `f5-pt-language-settings.png`).

## 4. Diagnóstico do bloqueio

| Verificação | Resultado |
|---|---|
| `display.language: pt` no config.yaml | **sim** |
| `hermes config get display.language` | `pt` |
| gateway ready no mesmo perfil | **sim** |
| bundle do app contém o catálogo pt | **sim** (`Configurar o B-3PO` em `dist/assets/actions-*.js`) |
| bundle contém os aliases pt-BR | **sim** (2 arquivos) |
| renderer em pt | **não** |
| chave de locale em `localStorage` | **nenhuma** (o locale vem só da config) |

Conclusão registrada: o **caminho de leitura de config do renderer** não está entregando
`display.language` ao provider de i18n neste ambiente. A ponte `hermes:api` responde
`Expected JSON from http://127.0.0.1:56506 but got HTML (status 200)` quando chamada fora do fluxo
interno do app — o que aponta para o bridge REST, não para o catálogo.

**Status:** catálogo **IMPLEMENTADO E TESTADO**; aplicação visual **PARCIAL / BLOQUEADA** por esse
defeito de integração. Não declaro pt-BR concluído.

## 5. Próximo passo técnico (para destravar)

1. Reproduzir com o app em modo dev (`npm run dev`) e capturar o payload de `config.get` no WS.
2. Se o payload trouxer `display.language`, o defeito está no resolver do renderer
   (`src/i18n/context.tsx` → `getConfigDisplayLanguage`).
3. Se não trouxer, o defeito está no `config.get` do gateway (perfil default) e o fix é no backend.
4. Teste de regressão: render do `I18nProvider` com config stub `display.language: pt` e asserção de
   string portuguesa (já existe no `context.test.tsx` para 9 locales; estender a pt).

## 10. Rodada 36 — `/comandos` traduzidos e a causa do título "New session"

### Resolvido: descrições do paleta de comandos

`pt` não traduzia `composer.commandDescs` — as 71 descrições apareciam em inglês e o teste
`slash-localization` falhava (confirmado no HEAD, sem mudanças minhas). Traduzidas as 71 entradas;
o teste passa (2/2) e o `i18n` soma **103 testes** verdes.

### Ainda aberto: o rótulo da aba principal continua em inglês

A aba `New session` na faixa de tabs **não** vem de `newSessionTitle()` em tempo de render: o título é
gravado no **registro da aba no boot**, e o locale do usuário carrega de forma assíncrona depois. Medido
no app com perfil de dados limpo:

```
abas: ["Conversas", "Bots", "New session", "Terminal"]
```

"Conversas" e "Bots" são traduzidos porque vêm de `useI18n().t` no render; "New session" ficou com o
idioma de boot (inglês) no registro.

**Correção certa (próxima rodada):** resolver a legenda no render (`tileTitle()` → `newSessionTitle()`)
em vez de guardar a string traduzida no registro — o helper já existe e já é chamado em `session-tile`,
`chat/index`, `contrib/controller`; falta o caminho da **aba principal** (registro da tab strip) usar a
função no momento de pintar, não no de registrar.
