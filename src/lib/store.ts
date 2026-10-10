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

const est = (name: string): Estab => ({ id: name.toLowerCase().replace(/\s+/g, "-"), name, bairros: [] });

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
      setData(raw ? JSON.parse(raw) : seed);
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
