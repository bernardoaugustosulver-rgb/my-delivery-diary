import { useEffect, useState, useCallback } from "react";

export type Bairro = { id: string; name: string; price: number };
export type Estab = { id: string; name: string; bairros: Bairro[] };
// daily[date][estId][bairroId] = count ; notes[date][estId][bairroId] = text
export type Data = {
  estabs: Estab[];
  counters: Record<string, Record<string, number>>;
  daily: Record<string, Record<string, Record<string, number>>>;
  notes: Record<string, Record<string, Record<string, string>>>;
};

const KEY = "motoboy-data-v1";
export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const seed: Data = {
  estabs: [
    { id: "batisti", name: "Batisti", bairros: [
      { id: uid(), name: "Ilha da Figueira", price: 10 },
      { id: uid(), name: "Centro", price: 12 },
      { id: uid(), name: "Vila Lalau", price: 8 },
    ] },
    { id: "american", name: "American", bairros: [
      { id: uid(), name: "Centro", price: 9 },
      { id: uid(), name: "Czerniewicz", price: 11 },
    ] },
  ],
  counters: {}, daily: {}, notes: {},
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
  const resetWeek = () => update((d) => ({ ...d, counters: {} }));
  const setNote = (estId: string, bId: string, text: string) => update((d) => {
    const n = ((d.notes[today()] ??= {})[estId] ??= {});
    if (text.trim()) n[bId] = text; else delete n[bId];
    return d;
  });
  const setEstabs = (estabs: Estab[]) => update((d) => ({ ...d, estabs }));

  return { data, change, resetWeek, setNote, setEstabs };
}
