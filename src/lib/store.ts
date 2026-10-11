import { useEffect, useState, useCallback } from "react";

export type Bairro = { id: string; name: string; price: number };
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
const DEFAULT_BAIRROS: [string, number][] = [
  ["Água Verde", 17], ["Águas Claras", 13], ["Amizade", 18], ["Barra do Rio Cerro", 20],
  ["Barra do Rio Molha", 15], ["Boa Vista", 15], ["Centro", 14], ["Chico de Paulo", 17],
  ["Czerniewicz", 14], ["Centenário", 13], ["Estrada Nova", 20], ["Figueira", 12],
  ["Garibaldi", 40], ["Jaraguá 84", 30], ["Jaraguá 99", 25], ["Jaraguá Esquerdo", 15],
  ["João Pessoa", 20], ["João Pessoa (pós ponte Schroeder)", 25], ["Morro do Molha", 20],
  ["Nereu Ramos", 30], ["Nova Brasília", 14], ["Rau", 17], ["Ribeirão Cavalo", 30],
  ["Ribeirão Cavalo (Braço)", 35], ["Rio Cerro 1", 30], ["Rio Cerro 2", 35], ["Rio da Luz", 35],
  ["Santa Luzia", 45], ["Santo Antônio", 30], ["São Luís", 18], ["Tifa Martins", 18],
  ["Tifa Monos", 25], ["Três Rios Norte", 25], ["Três Rios Sul", 20], ["Vila Chartres", 30],
  ["Vieiras", 15], ["Vila Baependi", 13], ["Vila Lalau", 13], ["Vila Lenzi", 15], ["Vila Nova", 14],
  // Guaramirim
  ["Avaí", 28], ["Amizade (Guaramirim)", 28], ["Bananal (até a ponte)", 25], ["Bananal (após ponte)", 30],
  ["Barro Branco (até Feldmann)", 25], ["Barro Branco (pós Feldmann)", 30], ["Caixa d'Água", 35],
  ["Centro (Guaramirim)", 20], ["Corticeira", 40], ["Escolinha", 28], ["Figueira (Guaramirim)", 15],
  ["Figueirinha", 15], ["Guamiranga", 40], ["Imigrantes", 15], ["Nova Esperança", 15],
  ["Recanto Feliz", 20], ["Rio Branco", 20], ["Vila Amizade", 20],
  // Schroeder
  ["Centro (Schroeder)", 35], ["Centro Norte", 40], ["Bracinho", 45], ["Braço do Sul", 45],
  ["Duas Mamas", 50], ["Itoupava-Açu", 45], ["Rancho Bom", 55], ["Rio Hern", 30],
  ["Sossego", 40], ["Tomaselli", 40], ["Schroeder 1", 30], ["Schroeder 3", 45],
];

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const defaultBairros = (): Bairro[] => DEFAULT_BAIRROS.map(([name, price]) => ({ id: slug(name), name, price }));

const est = (name: string): Estab => ({ id: slug(name), name, bairros: defaultBairros() });

// Preenche com os bairros padrão apenas as abas que ainda não têm nenhum bairro.
const withDefaults = (d: Data): Data => ({
  ...d,
  estabs: d.estabs.map((e) => (e.bairros.length === 0 ? { ...e, bairros: defaultBairros() } : e)),
});

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
      setData(raw ? withDefaults(JSON.parse(raw)) : seed);
    } catch { setData(seed); }
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
