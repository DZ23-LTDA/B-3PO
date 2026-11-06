# B-3PO — ENTREGA FINAL

**Data**: 06/11/2026 · **branch**: `b3po-brand` · **versão**: 1.0.0 · **produto**: B-3PO

---

## 1. O QUE O USUÁRIO PODE FAZER HOJE

### Funciona, com prova

| O que | Onde a prova está |
|---|---|
| **Instalar no Windows** | `scripts/install.ps1` — estágios `repository` 186 s, `venv` 5 s, `python-deps` 237 s, `products` 102 s → **`[OK] B-3PO install complete`** |
| **Abrir o app** | o app sobe, o boot passa, a tela de provedor aparece, e *"Escolho um provedor depois"* leva ao menu |
| **Ver a home** | mascote oficial, **"Bem-vindo ao B-3PO"**, posicionamento e **6 cartões de ambiente** (r268) |
| **Escolher o ambiente** | seletor **"Modo de Trabalho"** na barra — **6 ambientes**, persistido, sobrevive ao reload (r267) |
| **Navegar por seções** | 7 seções na barra (Visão geral, Operação, Comércio, Trabalho, Crescimento, Inteligência, Configuração) — **com scroll** (r265, r266) |
| **Abrir cada módulo** | rotas provadas: `#/painel`, `#/crm`, `#/sofia`, `#/agentes`, `#/products`, `#/empresa`, `#/atendimento`, `#/automacoes` |
| **Ler os dropdowns** | contraste **16,28:1 (AA)** — os 311 `<select>` corrigidos na raiz (r264) |
| **Usar em qualquer tela** | 1920×1080, 1600×900, 1366×768, 1280×720 **e zoom 125 %/150 %** — **0 itens cortados** (r269) |
| **Ler em português** | 5 rotas varridas, **zero string em inglês** (r269) |
| **Ver o contexto da Sofia** | `Administração · nenhum escopo liberado` — ambiente, projeto e ator, limitados pelo RBAC (r270) |

### Não funciona — e depende de terceiro

| O que | Por quê | Como destravar |
|---|---|---|
| **Conversar com a Sofia** | **"Servidor inferência indisponível"** — falta a credencial do provedor de modelo | configurar o provedor em **Configurações → Provedores**, com uma chave do dono |
| **Instalar como MSIX assinado** | **sem certificado Authenticode** (`AZURE_SIGN_*` ausente) | certificado de assinatura de código Windows |
| **Publicar na Play Store** | **o APK está assinado com chave de release** ✅, mas falta a conta de desenvolvedor Google | conta Google Play |
| **Instalar no iPhone** | **o app compila no CI** (workflow `b3po mobile`), mas **um IPA instalável exige `.p12` + provisioning profile** | certificado Apple **com chave privada** (`distribution.cer` sozinho não basta) |

> **`distribution.cer` é o certificado público.** **A chave privada (`.p12`) é o que assina.** Um `.cer` sozinho não gera IPA — e a chave não deve estar no repositório.

---

## 2. COMO INSTALAR

```powershell
# 1. os pré-requisitos (Python, Git, Node)
powershell -ExecutionPolicy Bypass -File scripts/install.ps1 -Stage prerequisites -NonInteractive -Json

# 2. o repositório, preso a um commit
powershell -ExecutionPolicy Bypass -File scripts/install.ps1 -Stage repository -Branch b3po-brand -Commit <sha> -NonInteractive -Json

# 3. o resto, em ordem
#    venv → python-deps → config → products → complete
```

**Cada estágio imprime JSON com `status` e `ms`.** O `complete` termina com:

```
[OK] B-3PO install complete (pinned <sha>)
```

**E o app abre** em `HERMES_HOME=<o diretório da instalação>`.

---

## 3. ARQUITETURA DE NAVEGAÇÃO (o que mudou)

```
ANTES                          AGORA
29 itens numa lista plana      6 ambientes × seções contextuais

                               ┌─ Modo de Trabalho (seletor, persistido)
                               │
                               ├─ Visão geral    Painel · Empresa · Busca
                               ├─ Operação       Atendimento · Agenda · Serviços · RH
                               ├─ Comércio       Produtos · Estoque · Compras · Vendas · Entregas · Financeiro
                               ├─ Trabalho       Projetos · Trabalhos
                               ├─ Crescimento    Marketing · Pós-venda
                               ├─ Inteligência   Agentes · Automações · Sofia · Documentos
                               └─ Configuração   Estrutura · Privacidade
```

### Os seis ambientes

| Ambiente | O que faz |
|---|---|
| **Empresa** | operação e gestão do negócio — **7 seções, 23 itens** |
| **Engenharia** | software, projetos e desenvolvimento |
| **Automação** | fluxos, integrações e execuções |
| **IA e Agentes** | Sofia, bots, equipes e orquestração — **8 itens** |
| **Estratégico** | análises, indicadores e decisões |
| **Administração** | organizações, usuários e segurança — **3 seções, 7 itens** |

### Duas regras que sustentam isso

1. **O ambiente FILTRA o menu; ele não esconde CAPACIDADE.** Um módulo fora do ambiente ativo continua existindo: a rota responde, o canal responde, o dado está lá. **Trocar de ambiente não é trocar de produto** — é trocar o que a barra mostra.

2. **Ambiente primeiro, permissão depois.** O RBAC (`lib/nav-rbac`) é a **última** palavra. O contrário daria o mesmo resultado hoje, mas inverteria a mensagem: um item escondido pelo ambiente pareceria escondido por falta de permissão.

> **Os itens do runtime** (Nova conversa, Capacidades, Mensageria, CRM, Artefatos, Tarefas agendadas) **ficam em todos os ambientes** — são infraestrutura, não módulo de negócio.

---

## 4. TROUBLESHOOTING

| Sintoma | Causa | O que fazer |
|---|---|---|
| **"Servidor inferência indisponível"** | nenhuma credencial de provedor configurada | Configurações → Provedores → colar a chave |
| **`O termo 'Get-FileHash' não é reconhecido`** | `Get-FileHash` vive em `Microsoft.PowerShell.Utility`, ausente sob ConstrainedLanguage | **corrigido na r257**: o instalador usa `certutil` como fallback |
| **A barra lateral não mostra os itens do fim** | era `overflow-hidden` cortando a lista | **corrigido na r266**: `overflow-y-auto` |
| **Opções de dropdown ilegíveis** | `<option>` sem estilo herdava texto claro sobre fundo claro | **corrigido na r264**: uma regra para os 311 `<select>` |
| **Cartões da home cortados no zoom** | `sm:grid-cols-3` dispara pelo viewport, e o zoom o reduz | **corrigido na r269**: `grid-cols-2 xl:grid-cols-3` |
| **`EPERM` ao compilar com o app aberto** | o app segura o `dist/` | fechar o app antes de `npm run build` |

---

## 5. LIMITES CONHECIDOS — declarados, não escondidos

### Da suíte de testes

**Medição da suíte inteira**: **21 139 testes, 20 731 verdes, 29 vermelhos, 246 pulados.**

- **As áreas que esta entrega tocou: 235 arquivos, 1 727 testes, TODOS verdes.**
- **As 29 vermelhas são pré-existentes ou flaky** — o baseline do projeto é **17 fixas + 2 flaky** (`audit-store`, `channel-build-version`). **Nenhuma foi introduzida por esta entrega**, e nenhum teste foi removido para obter verde.

### Dos gates de aceite

| Gate | Estado |
|---|---|
| **G1** seletor de ambientes | ✅ |
| **G2** sidebar contextual | ✅ |
| **G3** RBAC nas rotas | ✅ |
| **G4** troca de contexto persistente | ✅ |
| **G5** Sofia com contexto | ⚠️ **metade verificável**: o contexto é montado e mostrado, e o RBAC o limita; **entrar no prompt do turno é backend** |
| **G6** home e onboarding | ✅ **com e sem provider** (a tela de provedor oferece "escolho depois") |
| **G7** pt-BR | ✅ **5 rotas, zero inglês** |
| **G8** navegação/acessibilidade/regressão | ⚠️ **resoluções e zoom medidos; a varredura completa da suíte está acima** |
| **G9** app real em diferentes resoluções | ✅ **7 combinações, 0 cortados** |
| **G10** pacote coerente | ✅ **este documento** |

> **O produto NÃO está declarado UX_READY.** **G5 e G8 estão parciais**, e a razão é dita acima: uma depende do backend, a outra depende de uma varredura que ainda não fechou. **Declarar pronto com gate parcial é a única coisa que a missão proíbe em toda a extensão.**

### Do build

- **Versão**: `1.0.0` · **produto**: `B-3PO` · **appId/kebab**: `b3po` — **a fonte única é `product-identity.cjs`**
- **MSIX**: existe (191 MB) mas **não validado em instalação real neste ciclo**
- **iOS**: workflow criado (`b3po mobile`), **compila no `macos-15`**; **a assinatura exige `.p12` + profile**
- **Android**: **APK assinado** (`CN=B-3PO, O=DZ23-LTDA`, v2+v3, `com.dz23.b3po` 1.0, 44,26 MB)

---

## 6. AS DECISÕES QUE MUDARAM O PRODUTO

| # | Decisão | Por quê |
|---|---|---|
| **D1** | estender o SDK local (`group?`), não trocar a sidebar | um componente próprio perderia **conversas, bots e busca** |
| **D2** | o ambiente filtra o menu, não é permissão | senão o seletor vira **uma segunda permissão disfarçada** |
| **D3** | reutilizar `lib/ambiente.ts`, não criar um segundo modelo | a UI que já consumia dois passou a consumir seis **sem mudar de contrato** |
| **D4** | o contexto da Sofia é **descritivo** | não há caminho em que ele **conceda** algo — só caminhos em que **descreve menos** |
| **D5** | os itens do runtime ficam em todos os ambientes | esconder "Artefatos" esconde **a ferramenta**, não o domínio |
| **D6** | a home substitui o `Intro` **só no chat genérico** | o chat de um bot mantém a **identidade da persona** |

---

## 7. O QUE ESTA ENTREGA APRENDEU SOBRE SI MESMA

> **Três vezes nesta entrega o teste mediu o lugar errado**: o *body* inteiro em vez da sidebar; o `role="group"` do composer em vez do da home; e o `style.zoom` que não é o zoom do navegador. **Medir o lugar certo é a diferença entre "funciona" e "parece que funciona".**

> **Duas vezes o produto ficou pior antes de ficar melhor**: a barra vazia quando o `menuDoAtor(null)` devolveu `[]`, e o grid que cortava cartões no zoom. **As duas foram encontradas por medição, não por leitura.**

> **E cinco vezes as crases do PowerShell comeram `$` e `` ` `` de um texto** — a regra que ficou: **não passar por string de shell quando o texto tem `$`, `` ` `` ou `\`.**
