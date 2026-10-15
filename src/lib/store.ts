import { useEffect, useState, useCallback } from "react";
import { FLASH_CENTRO_ESTABS, FLASH_CENTRO_PRICES, FLASH_CENTRO_CITIES } from "./flash-centro-prices";

export type Bairro = { id: string; name: string; price: number; region?: string | undefined };
export type Estab = { id: string; name: string; bairros: Bairro[] };
type Daily = Record<string, Record<string, Record<string, number>>>;
type Notes = Record<string, Record<string, Record<string, string>>>;
// daily[date][estId][bairroId] = count ; notes[date][estId][bairroId] = text
// archives: snapshot of daily+notes saved at each weekly reset
export type Archive = { id: string; savedAt: string; daily: Daily; notes: Notes };
export type Data = {
  estabs: Estab[];
  counters: Record<string, Record<string, number>>;
  daily: Daily;
  notes: Notes;
  archives?: Archive[];
  schemaVersion?: number;
};

const KEY = "motoboy-data-v2";
export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Bairros padrão (Jaraguá do Sul, Guaramirim e Schroeder) com valores iniciais.
// O usuário ajusta os valores por estabelecimento na engrenagem.
// [nome, preço, região]
const DEFAULT_BAIRROS: [string, number, string][] = [
  ["Água Verde", 17, "Jaraguá do Sul"], ["Águas Claras", 13, "Jaraguá do Sul"], ["Amizade", 18, "Jaraguá do Sul"], ["Barra do Rio Cerro", 20, "Jaraguá do Sul"],
  ["Barra do Rio Molha", 15, "Jaraguá do Sul"], ["Boa Vista", 15, "Jaraguá do Sul"], ["Centro", 14, "Jaraguá do Sul"], ["Chico de Paulo", 17, "Jaraguá do Sul"],
  ["Czerniewicz", 14, "Jaraguá do Sul"], ["Centenário", 13, "Jaraguá do Sul"], ["Estrada Nova", 20, "Jaraguá do Sul"], ["Figueira", 12, "Jaraguá do Sul"],
  ["Garibaldi", 40, "Jaraguá do Sul"], ["Jaraguá 84", 30, "Jaraguá do Sul"], ["Jaraguá 99", 25, "Jaraguá do Sul"], ["Jaraguá Esquerdo", 15, "Jaraguá do Sul"],
  ["João Pessoa", 20, "Jaraguá do Sul"], ["João Pessoa (pós ponte Schroeder)", 25, "Jaraguá do Sul"], ["Morro do Molha", 20, "Jaraguá do Sul"],
  ["Nereu Ramos", 30, "Jaraguá do Sul"], ["Nova Brasília", 14, "Jaraguá do Sul"], ["Rau", 17, "Jaraguá do Sul"], ["Ribeirão Cavalo", 30, "Jaraguá do Sul"],
  ["Ribeirão Cavalo (Braço)", 35, "Jaraguá do Sul"], ["Rio Cerro 1", 30, "Jaraguá do Sul"], ["Rio Cerro 2", 35, "Jaraguá do Sul"], ["Rio da Luz", 35, "Jaraguá do Sul"],
  ["Santa Luzia", 45, "Jaraguá do Sul"], ["Santo Antônio", 30, "Jaraguá do Sul"], ["São Luís", 18, "Jaraguá do Sul"], ["Tifa Martins", 18, "Jaraguá do Sul"],
  ["Tifa Monos", 25, "Jaraguá do Sul"], ["Três Rios Norte", 25, "Jaraguá do Sul"], ["Três Rios Sul", 20, "Jaraguá do Sul"], ["Vila Chartres", 30, "Jaraguá do Sul"],
  ["Vieiras", 15, "Jaraguá do Sul"], ["Vila Baependi", 13, "Jaraguá do Sul"], ["Vila Lalau", 13, "Jaraguá do Sul"], ["Vila Lenzi", 15, "Jaraguá do Sul"], ["Vila Nova", 14, "Jaraguá do Sul"],
  // Guaramirim
  ["Avaí", 28, "Guaramirim"], ["Amizade (Guaramirim)", 28, "Guaramirim"], ["Bananal (até a ponte)", 25, "Guaramirim"], ["Bananal (após ponte)", 30, "Guaramirim"],
  ["Barro Branco (até Feldmann)", 25, "Guaramirim"], ["Barro Branco (pós Feldmann)", 30, "Guaramirim"], ["Caixa d'Água", 35, "Guaramirim"],
  ["Centro (Guaramirim)", 20, "Guaramirim"], ["Corticeira", 40, "Guaramirim"], ["Escolinha", 28, "Guaramirim"], ["Figueira (Guaramirim)", 15, "Guaramirim"],
  ["Figueirinha", 15, "Guaramirim"], ["Guamiranga", 40, "Guaramirim"], ["Imigrantes", 15, "Guaramirim"], ["Nova Esperança", 15, "Guaramirim"],
  ["Recanto Feliz", 20, "Guaramirim"], ["Rio Branco", 20, "Guaramirim"], ["Vila Amizade", 20, "Guaramirim"],
  // Schroeder
  ["Centro (Schroeder)", 35, "Schroeder"], ["Centro Norte", 40, "Schroeder"], ["Bracinho", 45, "Schroeder"], ["Braço do Sul", 45, "Schroeder"],
  ["Duas Mamas", 50, "Schroeder"], ["Itoupava-Açu", 45, "Schroeder"], ["Rancho Bom", 55, "Schroeder"], ["Rio Hern", 30, "Schroeder"],
  ["Sossego", 40, "Schroeder"], ["Tomaselli", 40, "Schroeder"], ["Schroeder 1", 30, "Schroeder"], ["Schroeder 3", 45, "Schroeder"],
];

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Mapa nome → região para classificar bairros já salvos (sem região gravada).
const REGION_MAP = new Map(DEFAULT_BAIRROS.map(([name, , region]) => [slug(name), region]));
// Ordem fixa dos separadores; bairros fora dessas regiões ficam em "Outros".
export const REGION_ORDER = ["Jaraguá do Sul", "Guaramirim", "Schroeder", "Cidades até centro"];

// Tabela de preços especial do estabelecimento "Sabor da Casa" (menor que o padrão).
// Aplicada uma única vez pela migração abaixo; depois os valores podem ser ajustados na engrenagem.
// Observação: "Molha" foi interpretado como "Barra do Rio Molha".
const SABOR_DA_CASA_PRICES: Record<string, number> = {
  "centro": 8, "vila-lenzi": 8, "lenzi": 8, "nova-brasilia": 8, "vila-baependi": 8, "baependi": 8,
  "vila-nova": 8, "amizade": 10, "estrada-nova": 10, "rau": 10, "barra-do-rio-molha": 10, "molha": 10,
  "vila-lalau": 10, "lalau": 10, "tifa-martins": 10, "chico-de-paulo": 10, "agua-verde": 10,
  "czerniewicz": 10, "figueira": 12, "ilha-da-figueira": 12, "tres-rios-sul": 12,
  "nereu-ramos": 15, "nereu": 15, "vieiras": 15, "vieras": 15, "joao-pessoa": 20,
};
const SCHEMA_VERSION = 4;

const defaultBairros = (): Bairro[] => DEFAULT_BAIRROS.map(([name, price, region]) => ({ id: slug(name), name, price, region }));

const est = (name: string): Estab => ({ id: slug(name), name, bairros: defaultBairros() });

// Preenche com os bairros padrão apenas as abas que ainda não têm nenhum bairro,
// e classificar bairros salvos nas regiões (Jaraguá/Guaramirim/Schroeder).
export const withDefaults = (d: Data): Data => {
  const applySaborPrices = (d.schemaVersion ?? 0) < 3;
  const applyFlashPrices = (d.schemaVersion ?? 0) < 4;
  return {
    ...d,
    schemaVersion: SCHEMA_VERSION,
    estabs: d.estabs.map((e) => {
      let bairros: Bairro[] = (e.bairros.length === 0 ? defaultBairros() : e.bairros).map((b) => ({
        ...b,
        region: b.region ?? REGION_MAP.get(b.id) ?? REGION_MAP.get(slug(b.name)),
      }));
      if (applySaborPrices && e.id === "sabor-da-casa") {
        bairros = bairros.map((b) => {
          const p = SABOR_DA_CASA_PRICES[b.id] ?? SABOR_DA_CASA_PRICES[slug(b.name)];
          return p !== undefined ? { ...b, price: p } : b;
        });
      }
      if (applyFlashPrices && (FLASH_CENTRO_ESTABS.has(e.id) || FLASH_CENTRO_ESTABS.has(slug(e.name)))) {
        const table = [
          ...defaultBairros().map((b) => ({ ...b, price: FLASH_CENTRO_PRICES[b.id] ?? b.price })),
          ...FLASH_CENTRO_CITIES.map(([name, price]) => ({ id: slug(name), name, price, region: "Cidades até centro" })),
        ];
        const matched = new Set<string>();
        bairros = bairros.map((b) => {
          const row = table.find((r) => r.id === b.id || (
            (slug(r.name) === slug(b.name) || slug(r.name.replace(/ \((Guaramirim|Schroeder)\)$/, "")) === slug(b.name))
            && r.region === b.region
          ));
          if (!row) return b;
          matched.add(row.id);
          return { ...b, price: row.price, region: row.region };
        });
        bairros.push(...table.filter((b) => !matched.has(b.id)));
      }
      return { ...e, bairros };
    }),
  };
};

const seed: Data = {
  estabs: [
    "American", "Batisti", "Jet Frango", "Pastini", "Santly Sushi", "Society",
    "Dom Vicente", "Seu Maze", "Giac San", "Manu Doces", "Sabor da Casa", "Casa do Sushi",
  ].map(est),
  counters: {}, daily: {}, notes: {}, archives: [],
};

export function useStore() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setData(withDefaults(raw ? JSON.parse(raw) : seed));
    } catch { setData(withDefaults(seed)); }
  }, []);
  useEffect(() => { if (data) localStorage.setItem(KEY, JSON.stringify(data)); }, [data]);

  const update = useCallback((fn: (d: Data) => Data) => setData((d) => (d ? fn(structuredClone(d)) : d)), []);

  const change = (estId: string, bId: string, delta: number) => update((d) => {
    const cur = d.counters[estId]?.[bId] ?? 0;
    if (cur + delta < 0) return d;
    (d.counters[estId] ??= {})[bId] = cur + delta;
    const t = today();
    const day = ((d.daily[t] ??= {})[estId] ??= {});
    day[bId] = Math.max(0, (day[bId] ?? 0) + delta);
    if (day[bId] === 0) delete day[bId];
    return d;
  });
  const resetWeek = () => update((d) => {
    const hasHistory = Object.keys(d.daily).length > 0 || Object.keys(d.notes).length > 0;
    const archives = hasHistory
      ? [{ id: uid(), savedAt: today(), daily: d.daily, notes: d.notes }, ...(d.archives ?? [])]
      : (d.archives ?? []);
    return { ...d, counters: {}, daily: {}, notes: {}, archives };
  });
  const deleteArchive = (id: string) => update((d) => ({ ...d, archives: (d.archives ?? []).filter((a) => a.id !== id) }));
  const setNote = (estId: string, bId: string, text: string) => update((d) => {
    const n = ((d.notes[today()] ??= {})[estId] ??= {});
    if (text.trim()) n[bId] = text; else delete n[bId];
    return d;
  });
  const setEstabs = (estabs: Estab[]) => update((d) => ({ ...d, estabs }));

  return { data, change, resetWeek, setNote, setEstabs, deleteArchive };
}
