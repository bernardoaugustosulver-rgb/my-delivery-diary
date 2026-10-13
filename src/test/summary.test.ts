import { describe, expect, it } from "vitest";
import { estDays, summaryText, summaryTotals } from "../lib/summary";
import type { Data, Estab } from "../lib/store";

const e: Estab = { id: "dom", name: "Dom Vicente", bairros: [
  { id: "baependi", name: "Baependi", price: 12 },
  { id: "lalau", name: "Vila Lalau", price: 13 },
  { id: "amizade", name: "Amizade", price: 15 },
  { id: "figueira", name: "Figueira", price: 15 },
] };
const daily: Data["daily"] = {
  "2026-10-09": { dom: { figueira: 1 } },
  "2026-10-05": { dom: { baependi: 1 } },
  "2026-10-08": { dom: { amizade: 1 } },
  "2026-10-06": { dom: { lalau: 1 }, other: { lalau: 100 } },
};

describe("resumos atuais e arquivados", () => {
  it("totaliza somente as entregas da aba e formata o exemplo com emojis", () => {
    expect(summaryTotals(daily, e)).toEqual({ deliveries: 4, value: 55 });
    const text = summaryText(e.name, daily, {}, e);
    expect(text).toContain("Dom Vicente 05/10\n\n📍1x Baependi 12,00");
    expect(text.indexOf("05/10")).toBeLessThan(text.indexOf("09/10"));
    expect(text).toContain("--------------------");
    expect(text).toMatch(/🛵 \*Entregas 4x\*  💰 \*Total = R\$\s55,00\*$/);
  });
  it("soma quantidades em vez de contar linhas", () => {
    expect(summaryTotals({ "2026-10-09": { dom: { figueira: 10 } } }, e)).toEqual({ deliveries: 10, value: 150 });
  });
  it("preserva observações e dias que só têm notas", () => {
    const notes = { "2026-10-10": { dom: { figueira: "Gorjeta" } } };
    expect(estDays(daily, notes, e.id)).toContain("2026-10-10");
    expect(summaryText(e.name, daily, notes, e)).toContain("📝 Figueira: Gorjeta");
    expect(summaryText(e.name, {}, {}, e)).toBe("");
  });
});