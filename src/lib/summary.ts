import { brl, fmtDate, type Data, type Estab } from "./store";

export const estDays = (daily: Data["daily"], notes: Data["notes"], estId: string) =>
  [...new Set([...Object.keys(daily), ...Object.keys(notes)])]
    .filter((d) => Object.keys(daily[d]?.[estId] ?? {}).length || Object.keys(notes[d]?.[estId] ?? {}).length)
    .sort();

export const summaryTotals = (daily: Data["daily"], e: Estab) =>
  Object.values(daily).reduce((total, day) => {
    Object.entries(day[e.id] ?? {}).forEach(([bid, n]) => {
      total.deliveries += n;
      total.value += n * (e.bairros.find((b) => b.id === bid)?.price ?? 0);
    });
    return total;
  }, { deliveries: 0, value: 0 });

export const summaryText = (name: string, daily: Data["daily"], notes: Data["notes"], e: Estab) => {
  const days = estDays(daily, notes, e.id);
  if (days.length === 0) return "";
  const parts = days.map((d) => {
    const lines = Object.entries(daily[d]?.[e.id] ?? {}).map(([bid, n]) => {
      const b = e.bairros.find((x) => x.id === bid);
      const value = (n * (b?.price ?? 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `📍${n}x ${b?.name ?? "Bairro removido"} ${value}`;
    });
    Object.entries(notes[d]?.[e.id] ?? {}).forEach(([bid, text]) => {
      lines.push(`📝 ${e.bairros.find((b) => b.id === bid)?.name ?? "Bairro removido"}: ${text}`);
    });
    return [`${name} ${fmtDate(d)}`, "", ...lines].join("\n");
  });
  const total = summaryTotals(daily, e);
  return [...parts, `🛵 *Entregas ${total.deliveries}x*  💰 *Total = ${brl(total.value)}*`].join("\n\n--------------------\n\n");
};