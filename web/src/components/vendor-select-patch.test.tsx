// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Select, SelectOption } from "@nous-research/ui/ui/components/select";

/**
 * r99 — prova que o patch de `@nous-research/ui` está aplicado (decisão do dono #2).
 *
 * O defeito original: `Select` fazia destructuring de props fixas e **descartava** qualquer
 * `aria-label`. Como ele usa `role="combobox"`, e a ARIA **não** permite nome por conteúdo nesse
 * papel, o botão ficava sem nome acessível — `axe` classificava como `button-name` **critical**.
 *
 * O patch (`scripts/vendor-patches/nous-research-ui-select.mjs`, reaplicado no `postinstall`) é
 * aditivo: acrescenta `...rest` ao destructuring e o espalha no `<button role="combobox">`.
 *
 * ESTE TESTE É A GARANTIA DE QUE ELE CONTINUA APLICADO. Se um `npm install` limpar
 * `node_modules` e o `postinstall` não rodar, é aqui que quebra — e não no `axe` de produção.
 */
// O config do web não tem setupFile global: sem isto, cada `render` acumula no DOM e
// `getByRole("combobox")` acha os anteriores.
afterEach(cleanup)

describe("patch de fornecedor: Select aceita nome acessível", () => {
  it("encaminha aria-label para o botão combobox", () => {
    render(
      <Select aria-label="Perfil" onValueChange={() => {}} value="a">
        <SelectOption value="a">A</SelectOption>
      </Select>
    );

    const combobox = screen.getByRole("combobox");

    expect(combobox).toBeTruthy();
    expect(combobox.getAttribute("aria-label")).toBe("Perfil");
  });

  it("encaminha aria-labelledby quando o rótulo é um elemento", () => {
    render(
      <div>
        <span id="rotulo-perfil">Perfil</span>
        <Select aria-labelledby="rotulo-perfil" onValueChange={() => {}} value="a">
          <SelectOption value="a">A</SelectOption>
        </Select>
      </div>
    );

    expect(screen.getByRole("combobox").getAttribute("aria-labelledby")).toBe("rotulo-perfil");
  });

  it("sem as props, o comportamento do upstream não muda (patch é aditivo)", () => {
    render(
      <Select onValueChange={() => {}} value="b">
        <SelectOption value="b">B</SelectOption>
      </Select>
    );

    const combobox = screen.getByRole("combobox");

    expect(combobox.hasAttribute("aria-label")).toBe(false);
    expect(combobox.getAttribute("aria-haspopup")).toBe("listbox");
    expect(combobox.getAttribute("role")).toBe("combobox");
  });
});
