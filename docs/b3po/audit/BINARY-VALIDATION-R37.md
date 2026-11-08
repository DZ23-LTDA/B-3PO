# Validação no binário — RH (rodada 37)

## O que foi provado

| Prova | Resultado medido |
|---|---|
| `/rh` monta | título **"Pessoas"** |
| Grava pelo IPC real | departamento `Operacoes R37` + colaborador `Ana Validada R37` |
| **Salário protegido** | `employees(false)` → `salary_cents: null`; `employees(true)` → `420000` |
| Política antes da tentativa | `desligar` → `required: true`; `alterar_cargo` → `required: false` |
| Motivo vedado | `desligar` + "por causa da idade" → `motivo_vedado:idade` |
| **Bloqueio na tela** | situação `desligado` → `desabilitado: true` |

## A captura que importa

`rh-02-bloqueio.png` mostra os quatro estados ao mesmo tempo:

1. situação **desligado** escolhida;
2. aviso **"Isto exige aprovação humana — uma decisão sobre uma pessoa"**;
3. botão **Cadastrar colaborador esmaecido** (desabilitado);
4. colaborador na lista **sem salário**, com "Mostrar salário" ao lado.

O bloqueio acontece **antes** da tentativa. Não é o usuário digitando tudo e recebendo
`desligamento_exige_aprovacao` como se fosse defeito.

## Uma medição imprecisa minha, de novo

Meu seletor de aviso no script buscava o primeiro `<p>` que casasse com `/aprovação/i` — e pegou o
**texto do hint** ("O salário não é carregado por padrão. Desligamentos e mudanças de salário exigem
aprovação."), não o aviso específico. O `bloqueio.aviso` do relatório JSON está errado por isso.

O aviso correto **está** na tela — a captura de imagem mostra. Pela terceira vez nesta série, a
imagem corrigiu o que o texto automatizado mediu mal.

## O que esta validação não cobre

- Não cliquei em "Adicionar departamento" nem em "Cadastrar colaborador" pela interface; a gravação
  foi pelo IPC. Um erro no `onClick` não apareceria.
- A lista já tinha um colaborador porque foi gravado antes da verificação de bloqueio — ordem das
  operações, não defeito.
- Não testei o caso de tentar salvar com a situação bloqueada (o botão está desabilitado, então não
  há caminho pela UI; o store recusa de qualquer forma, provado em teste unitário da rodada 36).
