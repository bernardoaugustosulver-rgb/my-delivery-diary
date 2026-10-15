import { describe, expect, it } from "vitest";
import { withDefaults, type Data } from "../lib/store";
import { FLASH_CENTRO_PRICES } from "../lib/flash-centro-prices";

const fixture = (): Data => ({
  schemaVersion: 3,
  estabs: ["Santly Sushi", "Pastini", "Jet Frango", "American", "Sabor da Casa"].map((name) => ({
    id: name.toLowerCase().replaceAll(" ", "-"), name,
    bairros: [{ id: "centro", name: "Centro", price: 99, region: "Jaraguá do Sul" }],
  })),
  counters: { "santly-sushi": { centro: 3 } },
  daily: { "2026-10-14": { "santly-sushi": { centro: 3 } } },
  notes: { "2026-10-14": { "santly-sushi": { centro: "Gorjeta" } } },
  archives: [{ id: "old", savedAt: "2026-10-07", daily: {}, notes: {} }],
});

describe("atualização da tabela Flash Centro", () => {
  it("aplica todos os valores e cidades somente às três abas", () => {
    const result = withDefaults(fixture());
    for (const e of result.estabs.slice(0, 3)) {
      expect(e.bairros).toHaveLength(77);
      for (const [id, price] of Object.entries(FLASH_CENTRO_PRICES)) {
        expect(e.bairros.find((b) => b.id === id)?.price, id).toBe(price);
      }
      expect(e.bairros.find((b) => b.id === "joinville")?.price).toBe(120);
      expect(e.bairros.find((b) => b.id === "corupa")?.region).toBe("Cidades até centro");
    }
    expect(result.estabs[3]?.bairros[0]?.price).toBe(99);
    expect(result.estabs[4]?.bairros[0]?.price).toBe(99);
  });
  it("preserva contadores, notas, dias, arquivos e IDs personalizados", () => {
    const source = fixture();
    const e = source.estabs[0];
    if (e) e.bairros.push({ id: "custom-id", name: "Figueira", price: 1, region: "Jaraguá do Sul" });
    const result = withDefaults(source);
    for (const key of ["counters", "daily", "notes", "archives"] as const) expect(result[key]).toEqual(source[key]);
    expect(result.estabs[0]?.bairros.find((b) => b.id === "custom-id")?.price).toBe(14);
    expect(result.estabs[0]?.bairros.some((b) => b.id === "figueira")).toBe(false);
  });
  it("não reaplica a tabela após ajustes manuais ou recarga", () => {
    const migrated = withDefaults(fixture());
    const b = migrated.estabs[0]?.bairros[0];
    if (b) b.price = 42;
    expect(withDefaults(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
  });
  it("aplica ambas as tabelas no primeiro acesso", () => {
    const source = fixture();
    delete source.schemaVersion;
    source.estabs.forEach((e) => { e.bairros = []; });
    const result = withDefaults(source);
    expect(result.estabs[0]?.bairros.find((b) => b.id === "centro")?.price).toBe(10);
    expect(result.estabs[4]?.bairros.find((b) => b.id === "centro")?.price).toBe(8);
  });
});