import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { Select } from "@nous-research/ui/ui/components/select";

interface NamedSelectProps {
  /** Visible label of the field. Applied as the combobox's accessible name. */
  label: string;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  value?: string;
}

/**
 * r97 — `Select` do `@nous-research/ui` deixa o `<button role="combobox">` **sem nome acessível**.
 *
 * Duas causas, e as duas são do componente:
 *
 * 1. Ele usa `role="combobox"`. Pela ARIA, `combobox` **NÃO** herda nome do conteúdo — então o
 *    `<span>` com o valor ("Default", "All profiles") não conta como nome. Só `aria-label` /
 *    `aria-labelledby` nomeiam um combobox.
 * 2. O `Select` faz destructuring de props fixas (`children, className, disabled, id,
 *    onValueChange, placeholder, style, value`) e **descarta o resto** — um `aria-label` passado
 *    de fora é silenciosamente ignorado.
 *
 * Resultado medido: `axe` classificava 2 dois como `button-name` **critical** em `/chat` e `/cron`
 * (e o mesmo defeito existe em qualquer `Select` renderizado).
 *
 * A correção fica na **nossa** camada porque patchear `node_modules` se perde no próximo
 * `npm install`. O wrapper não cria caixa de layout (`display: contents`), então trocar a
 * importação não muda um pixel.
 */
export function NamedSelect({ children, label, ...props }: NamedSelectProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const botao = ref.current?.querySelector('button[role="combobox"]');

    if (botao) botao.setAttribute("aria-label", label);
  }, [label]);

  return (
    <div ref={ref} style={{ display: "contents" }}>
      <Select {...props}>{children}</Select>
    </div>
  );
}
