# RELATÓRIO FINAL — rodada 256 de 256

## O veredito

# `NOT_READY`

**17 de 31 critérios `VALIDATED` · 12 `PARTIAL` · 2 `BLOCKED` · 0 declarados prontos sem prova.**

O §32 diz: *"Não declarar pronto com critérios aplicáveis pendentes."* **Há 14 pendentes.** **Não está pronto.**

## O que foi entregue do produto

Um **ERP/CRM funcional** sobre o runtime Hermes, com **25 stores de domínio** em `apps/desktop/electron/`, cada um com um único dono:

estoque (ledger) · financeiro · vendas · compras · catálogo · CRM (contatos, funil, tarefas, conversas) · agenda · serviços · atendimento · pós-venda · RH · marketing · documentos · empresas · atores · fiscal · automações · cotações

**O que os une:**
- **Arquivo JSON por domínio** em `userData/b3po/`, escrita atômica (`temp` + `rename`)
- **Fila de escrita serializada em 21 de 25** (os 4 restantes não gravam)
- **`tenant_id` em todo registro** — 24 de 24 stores filtram
- **Totais sempre derivados**, nunca armazenados
- **`ref` determinístico** entre domínios (`venda:<id>`, `compra:<id>`)

## O que foi provado na janela

| Prova | Evidência |
|---|---|
| O app empacotado abre, com mascote, logo e **25 itens de menu em português** | `evidencias/instalado-r242.png` |
| A recusa aparece na tela — *"Informe um valor."* | r240 |
| O consentimento do CRM grava e reflete | r208 |
| `lang="pt"`, `title="B-3PO"`, **zero "Hermes" visível** | r228, r242 |
| `<main>` em **8 telas** | r232–233 |
| **UI pronta em 931 ms**, IPC p50 **0,3 ms** | r227 |

## Os dois bugs que importavam

### 1. Venda fantasma (r234)

Duas vendas simultâneas do mesmo SKU respondiam **sucesso as duas**, e o ledger ficava com **uma**. **O cliente paga, o sistema confirma, o estoque não baixa.**

Corrigido com `WriteQueue` em 21 stores. **8 testes provados vermelhos** removendo a fila.

### 2. Launch que trava 40 s no Windows (r248)

Recuperação de lock de reparo: **40 tentativas**, cada uma consultando a criação de processo. **~41 s antes de recusar.**

**Não corrigido** — mexer em recuperação de lock sem medir pode travar o launch para sempre.

## O que **não** está pronto — e por quê

### Bloqueado por recurso externo (2)

| Critério | O que falta |
|---|---|
| **multiagent funcional** | credencial de provider |
| **iOS** | macOS + Xcode + certificado |
| *(também)* WhatsApp real | credencial Meta |
| *(também)* assinatura Authenticode | certificado |
| *(também)* macOS/Linux build | hardware |

### Parcial, com a lacuna nomeada (12)

| Critério | O que falta |
|---|---|
| **permissões** | **25 de 40 canais sem guard** — o maior débito |
| **instaladores** | falta assinatura e teste de instalação do MSIX |
| **pt-BR** | falta o detector automático que o §9 pede |
| **acessibilidade** | **57 elementos sem foco visível** — decisão do upstream |
| **mascotes** | só a Home do pacote foi verificada |
| **duplicidades** | **inventário exaustivo não feito** |
| **segurança** | 0 high/critical em produção, mas sem pentest |
| **Bots** | schema e orquestração com teste; execução sem provider |
| **WhatsApp** | código sim, envio real não |
| **Android** | APK debug; release sem keystore |
| **automações** | store com fila; execução não exercitada |
| **testes** | 4772 verdes, **40 falhas — 36 ambiente, 3 indeterminadas, 1 produto** |

## A verificação final

```
gate        14 checks, ok
typecheck   0 erros em 2 projetos
branch      b3po-brand
HEAD        4aad455504
sujo        nao
origin      sincronizado
main        f4cf411f28 (= origin/main, INTACTO)
commits     61984
docs        181 arquivos .md em docs/b3po/
```

**`main` nunca foi tocado.** Todo o trabalho está em `b3po-brand`, e o PR #1 está **draft, aberto, mergeable** — como o §30 exige.

## O que esta sessão acrescentou de mais valioso

**Não foi código.** Foi **a descoberta de que quatro afirmações confortáveis eram falsas**:

| Afirmação | Era |
|---|---|
| *"Todas as 40 falhas são de ambiente"* | **36 ambiente, 3 indeterminadas, 1 produto** |
| *"O instalador é `NOT_BUILT`"* | **existe, 235 MB, e abre** |
| *"A versão é `NOT_IMPLEMENTED`"* | **placeholder `0.0.0` num arquivo, corrigido para `1.0.0`** |
| *"A concorrência nunca foi testada"* | **testada, e havia um bug que perdia vendas** |

**Cada uma caiu porque alguém — ou um modelo revisor — perguntou "onde está a prova?".**

## As lições que ficam escritas

1. **Um teste que passa por motivo errado é pior que um vermelho** (r217)
2. **Uma execução parcial de testes é a mesma mentira que uma janela não aberta** (r224)
3. **O instrumento que mede precisa ser auditado junto com o que ele mede** — meu detector de erro falhou **4 vezes** por procurar palavras em vez de olhar a diferença (r230, r239, r240)
4. **Regex sobre estrutura aninhada falha** — **3 vezes** (r224, r236)
5. **Quando o número não fecha, o erro está na medição** (r250)
6. **Uma revisão sem repositório produz metade de ouro e metade de ruído** — e a metade de ouro **era a única que importava** (r246)

## O ciclo termina; o produto não

**`NOT_READY` não é fracasso — é a classificação correta.** O produto:

- **funciona** no que foi provado: ERP, CRM, estoque, financeiro, vendas, agenda, 25 telas, app empacotado que abre
- **não funciona** no que depende de credencial: agentes executando, WhatsApp enviando
- **não é seguro o bastante** para multiempresa real: 25 canais sem guard
- **não é instalável profissionalmente**: sem assinatura

**O próximo passo não é mais código. É recurso**: certificado, credencial de provider, credencial Meta, um Mac.

**As 25 guardas de permissão são a única dívida que depende só de trabalho** — e a receita está em `docs/b3po/audit/PERMISSION-*.md`.
