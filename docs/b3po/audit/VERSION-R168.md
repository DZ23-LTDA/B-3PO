# `FileVersion 0.0.0` — correção do meu achado da r167 (rodada 168)

## O que eu disse na r167

> *"`FileVersion: 0.0.0` — o executável diz ao Windows que é a versão zero. **Defeito real.**"*

## O que o código mostra

`apps/desktop/electron/app-version.test.ts`, linha 95:

```ts
// #124581: the desktop package.json carries a 0.0.0 placeholder, so the
// About panel must never repeat it as the running version.
it('skips the 0.0.0 package placeholder for builds without a baked display version', (): void => {
  ...
  expect(appVersionInfo(stamp, '', '0.0.0').appVersion).toBe('1.2.3')
})
```

**O `0.0.0` é um placeholder deliberado do upstream, documentado por issue**, e o código **o descarta**: o painel About nunca repete `0.0.0`.

**Meu achado da r167 estava errado na forma.** Não é um número esquecido — é um valor que existe para ser ignorado, com teste garantindo que seja.

É o **terceiro** achado meu corrigido nesta sessão (r150 "duplicação", r159 "risco estrutural", agora r168).

## Mas o achado verdadeiro estava embaixo

Fui ver o que o build **realmente grava**. O `resources/install-stamp.json` do executável:

```json
{
  "commit": "b3e5f0585aacb38818e75e80711ab77f8d40cf75",
  "branch": "b3po-brand",
  "builtAt": "2026-11-04T09:18:19.417Z",
  "dirty": true,
  "displayVersion": null,
  "baseVersion": null,
  "payload": "bootstrap",
  "updateMechanism": "self"
}
```

Com `displayVersion: null` e `baseVersion: null`, o `appVersionInfo` cai no **runtime version** — a versão do **Hermes**, não do B-3PO.

**O problema real, e ele é diferente do que eu disse:**

| Pergunta do usuário | Resposta hoje |
|---|---|
| "qual versão do B-3PO eu tenho?" | `0.21.5+6644.gb412ee9` — **versão do runtime Hermes** |
| "qual build é este?" | `b3e5f0585a` — **um SHA**, não uma versão |
| "é mais novo que o anterior?" | **não respondível** — SHA não ordena |

**O `FileVersion 0.0.0` era o sintoma visível de um problema maior: o produto não tem versão própria.**

## O que já funciona

| Item | Estado |
|---|---|
| Painel About não mostra `0.0.0` | **garantido por teste** |
| Build grava commit, branch, data | **funciona** (`install-stamp.json`) |
| `dirty: true` | **funciona** — build de árvore suja é marcado |
| Versão de produto | **ausente** — `displayVersion: null` |

## A correção, e por que não a apliquei

Preencher `displayVersion` no pipeline de build (ex: `0.1.0` para o primeiro entregável) faria o About mostrar a versão do produto e o Windows gravar um `FileVersion` ordenável.

**Não apliquei** porque:

1. `displayVersion` é preenchido pelo pipeline de **release** do upstream (`stable-release.yml`), não pelo `npm run dist` local;
2. mudar `package.json` para uma versão real **quebraria 5 asserções** de `app-version.test.ts` que dependem do placeholder;
3. a numeração de versão do produto é **decisão do proprietário** (0.1.0? 1.0.0? com canal alpha/beta?), e o GOAL pede para não decidir isso sozinho.

**Registrado como `NOT_IMPLEMENTED` com a razão, não como "feito".**

## Medido

| Medida | Valor |
|---|---|
| Achados meus corrigidos nesta sessão | **3** |
| Asserções que dependem do placeholder | **5** |
| Campos do `install-stamp` preenchidos | **8 de 11** |
| `displayVersion` | **null** |
| Versão do produto no executável | **ausente** |
| Código alterado nesta rodada | **0** |
