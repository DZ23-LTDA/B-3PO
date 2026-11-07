# B-3PO — PERFORMANCE (medida, não estimada)

**Atualizado**: 06/11/2026 · **Rodada**: 61 · **Data**: 06/11/2026

---

## O QUE O DONO RELATOU

> *"precisa deixar o aplicativo rápido e ágil, ele está muito lento para abrir as coisas"*
> *"eu mecho indo pras configurações e demora abrir"*

**Alvo identificado por ele**: **Configurações**.

---

## O QUE A MEDIÇÃO DISSE

**Máquina**: 47,7 GB RAM · 24 núcleos · 22,7 GB livres — **não é falta de recurso.**
**App**: 449 MB em 4 processos — **normal para Electron.**

**Navegação por rota** (Playwright sobre o Electron, seletor correto):

```
/trabalhos   441 ms     /financeiro  233 ms     /sales     95 ms
/documentos  392 ms     /painel      173 ms     /agentes   95 ms
/posvenda    342 ms     /crm         155 ms     /products  93 ms
/estoque     341 ms     /empresa     140 ms     /projetos  92 ms
/marketing   341 ms     /compras     139 ms     /sofia     92 ms
/estrutura   336 ms     /atendimento 132 ms
```

**Média 207 ms** — a navegação **não era** o gargalo.

**O gargalo era a TELA DE CONFIGURAÇÕES:**

```
long tasks:        55
soma:              ~5 700 ms
acima de 100 ms:   20
maior:             161 ms
```

**E o renderer travava tanto que um `page.screenshot` dava timeout de 30 s** depois de "fonts loaded".

---

## A CAUSA RAIZ

**`app/settings/index.tsx` importava os DOZE painéis estaticamente:**

```
model-settings      62,7 KB
gateway-settings    53,4 KB
appearance-settings 41,0 KB
... e mais nove
```

**45 imports, ZERO `React.lazy`.** Abrir Configurações baixava e avaliava **todos**, mesmo quando a pessoa só queria ver Aparência.

## A CORREÇÃO

**Sete painéis viraram `lazy` + um `<Suspense>` em volta do conteúdo ativo:**

```tsx
const ConfigSettings = lazy(() => import('./config-settings').then(m => ({ default: m.ConfigSettings })))
// ... AboutSettings, AppearanceSettings, GatewaySettings, KeybindSettings,
//     NotificationsSettings, SessionsSettings

<Suspense fallback={null}>{activeSettingsContent}</Suspense>
```

**`fallback={null}`** porque o app já mostrava vazio durante o carregamento — **não inventa um spinner novo**.

---

## A PROVA

| Métrica | Antes | **Depois** | |
|---|---|---|---|
| **long tasks** | **55** | **4** | **−93 %** |
| **soma** | ~5 700 ms | **281 ms** | **−95 %** |
| **acima de 100 ms** | **20** | **1** | **−95 %** |
| **maior** | 161 ms | 115 ms | |
| **2ª abertura** | — | **1 long task / 155 ms** | chunk em cache |

**Build**: os painéis agora saem em chunks próprios (`7,94 kB`, `46,64 kB`, `49,50 kB`, `98,64 kB`) em vez de entrar no `main`.

**Tipos**: 0 erros · **gate**: 14 ok · **build**: exit 0.

---

## O QUE AINDA NÃO FOI OTIMIZADO

| Item | Situação |
|---|---|
| **`shiki` 19,5 MB** | **lazy** — só carrega em tela com código; não entra no boot |
| **`main` 3,3 MB / `context` 2,7 MB** | boot carrega ~6 MB; o boot até a home mediu **336 ms** no dev |
| **`--no-file-parallelism` da suíte** | não é performance do app |
| **outras telas** | `/trabalhos` 441 ms e `/documentos` 392 ms são os próximos candidatos |
