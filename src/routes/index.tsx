import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, RotateCcw, Settings, FileText, StickyNote, Trash2, Bike, MessageCircle, History, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, brl, fmtDate, today, uid, type Estab, type Data, type Archive } from "@/lib/store";

// Days with any count or note for one establishment, newest first.
const estDays = (daily: Data["daily"], notes: Data["notes"], estId: string) =>
  Object.keys(daily)
    .filter((d) => Object.keys(daily[d]?.[estId] ?? {}).length || Object.keys(notes[d]?.[estId] ?? {}).length)
    .sort()
    .reverse();

// WhatsApp message: estab name, days descending, deliveries, notes, grand total.
const summaryText = (name: string, daily: Data["daily"], notes: Data["notes"], e: Estab) => {
  const days = estDays(daily, notes, e.id);
  if (days.length === 0) return "";
  let grandTotal = 0;
  const parts = days.map((d) => {
    const counts = daily[d]?.[e.id] ?? {};
    const dayNotes = notes[d]?.[e.id] ?? {};
    const lines = Object.entries(counts).map(([bid, n]) => {
      const b = e.bairros.find((x) => x.id === bid);
      return `${n}x ${b?.name ?? "Bairro removido"}`;
    });
    Object.entries(dayNotes).forEach(([bid, t]) => {
      const b = e.bairros.find((x) => x.id === bid);
      lines.push(`📝 ${b?.name ?? "Bairro removido"}: ${t}`);
    });
    let total = 0;
    Object.entries(counts).forEach(([bid, n]) => {
      const b = e.bairros.find((x) => x.id === bid);
      total += n * (b?.price ?? 0);
    });
    grandTotal += total;
    return [fmtDate(d), ...lines].join("\n");
  });
  return [name, "", ...parts.flatMap((p, i) => (i > 0 ? ["----------", ...p.split("\n")] : p.split("\n"))), "", `Total = ${brl(grandTotal)}`].join("\n");
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Motoboy Entregas — Controle por bairro" },
      { name: "description", content: "Conte entregas por estabelecimento e bairro, veja resumos diários e anotações." },
      { property: "og:title", content: "Motoboy Entregas" },
      { property: "og:description", content: "Controle de entregas para motoboys com resumo diário." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data, change, resetWeek, setNote, setEstabs } = useStore();
  const [tab, setTab] = useState<string>("");
  const [cfg, setCfg] = useState(false);
  const [resumo, setResumo] = useState<string | null>(null);
  const [note, setNoteOpen] = useState<{ est: string; b: string; name: string } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  if (!data) return <div className="min-h-screen bg-background" />;
  const active = data.estabs.find((e) => e.id === tab)?.id ?? data.estabs[0]?.id ?? "";

  const weekTotal = (e: Estab) =>
    e.bairros.reduce((s, b) => s + (data.counters[e.id]?.[b.id] ?? 0) * b.price, 0);

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-background px-4 pb-28 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary p-2 text-primary-foreground"><Bike className="h-5 w-5" /></div>
          <h1 className="text-xl font-extrabold tracking-tight">Entregas</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCfg(true)} aria-label="Configurações">
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      {data.estabs.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Nenhum estabelecimento. Toque na engrenagem para cadastrar.</p>
      ) : (
        <Tabs value={active} onValueChange={setTab}>
          <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
            {data.estabs.map((e) => (
              <TabsTrigger key={e.id} value={e.id}
                className="rounded-full bg-tab px-4 py-2 font-bold text-tab-foreground opacity-60 data-[state=active]:bg-tab data-[state=active]:text-tab-foreground data-[state=active]:opacity-100 data-[state=active]:ring-2 data-[state=active]:ring-primary">
                {e.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {data.estabs.map((e) => (
            <TabsContent key={e.id} value={e.id} className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground">
                <div>
                  <p className="text-xs font-semibold uppercase opacity-80">Total da semana</p>
                  <p className="text-2xl font-extrabold">{brl(weekTotal(e))}</p>
                </div>
                <Button variant="secondary" onClick={() => setResumo(e.id)}><FileText className="h-4 w-4" />Resumo</Button>
              </div>
              {e.bairros.map((b) => {
                const c = data.counters[e.id]?.[b.id] ?? 0;
                const hasNote = !!data.notes[today()]?.[e.id]?.[b.id];
                return (
                  <div key={b.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{b.name}</p>
                      <p className="text-sm text-muted-foreground">{brl(b.price)} · <span className="text-success">{brl(c * b.price)}</span></p>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Observações"
                      className={hasNote ? "text-primary" : "text-muted-foreground"}
                      onClick={() => { setNoteOpen({ est: e.id, b: b.id, name: b.name }); setNoteText(data.notes[today()]?.[e.id]?.[b.id] ?? ""); }}>
                      <StickyNote className="h-5 w-5" />
                    </Button>
                    <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full" onClick={() => change(e.id, b.id, -1)}><Minus /></Button>
                    <span className="w-8 text-center text-xl font-extrabold tabular-nums">{c}</span>
                    <Button size="icon" className="h-10 w-10 rounded-full" onClick={() => change(e.id, b.id, 1)}><Plus /></Button>
                  </div>
                );
              })}
              {e.bairros.length === 0 && <p className="text-center text-sm text-muted-foreground">Sem bairros cadastrados.</p>}
            </TabsContent>
          ))}
        </Tabs>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-xl bg-background/90 p-4 backdrop-blur">
        <Button variant="destructive" className="h-12 w-full text-base font-bold" onClick={() => setConfirmReset(true)}>
          <RotateCcw /> Resetar Semana
        </Button>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetar semana?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Isso vai zerar todos os contadores e apagar todo o histórico do resumo. Deseja continuar?</p>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>Não</Button>
            <Button variant="destructive" onClick={() => { resetWeek(); setConfirmReset(false); }}>Sim, resetar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!note} onOpenChange={(o) => !o && setNoteOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Observações · {note?.name} ({fmtDate(today())})</DialogTitle></DialogHeader>
          <Textarea rows={4} value={noteText} onChange={(ev) => setNoteText(ev.target.value)} placeholder="Ex: +R$ 5 de gorjeta" />
          <DialogFooter><Button onClick={() => { if (note) setNote(note.est, note.b, noteText); setNoteOpen(null); }}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ResumoDialog data={data} estId={resumo} onClose={() => setResumo(null)} />
      <ConfigDialog open={cfg} onClose={() => setCfg(false)} estabs={data.estabs} onSave={setEstabs} />
    </div>
  );
}

function ResumoDialog({ data, estId, onClose }: { data: Data; estId: string | null; onClose: () => void }) {
  const e = data.estabs.find((x) => x.id === estId);
  const days = Object.keys(data.daily).filter((d) => estId && (Object.keys(data.daily[d]![estId] ?? {}).length || Object.keys(data.notes[d]?.[estId] ?? {}).length)).sort().reverse();

  const whatsappText = () => {
    if (!e) return "";
    let grandTotal = 0;
    const parts = days.map((d) => {
      const counts = data.daily[d]![e.id] ?? {};
      const notes = data.notes[d]?.[e.id] ?? {};
      const lines = Object.entries(counts).map(([bid, n]) => {
        const b = e.bairros.find((x) => x.id === bid);
        return `${n}x ${b?.name ?? "Bairro removido"}`;
      });
      Object.entries(notes).forEach(([bid, t]) => {
        const b = e.bairros.find((x) => x.id === bid);
        lines.push(`📝 ${b?.name ?? "Bairro removido"}: ${t}`);
      });
      let total = 0;
      Object.entries(counts).forEach(([bid, n]) => {
        const b = e.bairros.find((x) => x.id === bid);
        total += n * (b?.price ?? 0);
      });
      grandTotal += total;
      return [fmtDate(d), ...lines].join("\n");
    });
    return [e.name, "", ...parts.flatMap((p, i) => (i > 0 ? ["----------", ...p.split("\n")] : p.split("\n"))), "", `Total = ${brl(grandTotal)}`].join("\n");
  };

  const share = () => {
    const text = whatsappText();
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Dialog open={!!estId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Resumo · {e?.name}</DialogTitle></DialogHeader>
        {days.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma entrega registrada ainda.</p>}
        <div className="space-y-3">
          {e && days.map((d) => {
            const counts = data.daily[d]![e.id] ?? {};
            const notes = data.notes[d]?.[e.id] ?? {};
            let total = 0;
            const rows = Object.entries(counts).map(([bid, n]) => {
              const b = e.bairros.find((x) => x.id === bid);
              const v = n * (b?.price ?? 0); total += v;
              return { bid, label: `${n}x ${b?.name ?? "Bairro removido"}`, v };
            });
            return (
              <div key={d} className="rounded-xl border bg-secondary p-3">
                <div className="mb-2 flex justify-between font-bold"><span>{fmtDate(d)}</span><span className="text-success">{brl(total)}</span></div>
                {rows.map((r) => (
                  <div key={r.bid} className="flex justify-between text-sm"><span>{r.label}</span><span>{brl(r.v)}</span></div>
                ))}
                {Object.entries(notes).map(([bid, t]) => (
                  <p key={bid} className="mt-2 rounded-lg bg-accent p-2 text-xs">📝 <b>{e.bairros.find((x) => x.id === bid)?.name}:</b> {t}</p>
                ))}
              </div>
            );
          })}
        </div>
        {days.length > 0 && (
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Fechar</Button>
            <Button className="flex-1" onClick={share}><MessageCircle /> WhatsApp</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfigDialog({ open, onClose, estabs, onSave }: { open: boolean; onClose: () => void; estabs: Estab[]; onSave: (e: Estab[]) => void }) {
  const [newEst, setNewEst] = useState("");
  // Edits apply instantly: every change is saved right away, no Save button needed.
  const edit = (fn: (d: Estab[]) => void) => { const c = structuredClone(estabs); fn(c); onSave(c); };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Configurações</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Tudo é salvo automaticamente enquanto você digita.</p>
        <div className="flex gap-2">
          <Input placeholder="Novo estabelecimento" value={newEst} onChange={(e) => setNewEst(e.target.value)} />
          <Button onClick={() => { if (newEst.trim()) { edit((d) => d.push({ id: uid(), name: newEst.trim(), bairros: [] })); setNewEst(""); } }}><Plus /></Button>
        </div>
        <div className="space-y-4">
          {estabs.map((e, i) => (
            <div key={e.id} className="space-y-2 rounded-xl border bg-secondary p-3">
              <div className="flex gap-2">
                <Input className="font-bold" value={e.name} onChange={(ev) => edit((d) => { d[i]!.name = ev.target.value; })} />
                <Button variant="ghost" size="icon" onClick={() => confirm(`Remover ${e.name}?`) && edit((d) => { d.splice(i, 1); })}><Trash2 className="text-destructive" /></Button>
              </div>
              {e.bairros.map((b, j) => (
                <div key={b.id} className="flex gap-2">
                  <Input value={b.name} placeholder="Bairro" onChange={(ev) => edit((d) => { d[i]!.bairros[j]!.name = ev.target.value; })} />
                  <Input className="w-24" type="number" inputMode="decimal" step="0.5" placeholder="0" value={b.price || ""}
                    onChange={(ev) => edit((d) => { d[i]!.bairros[j]!.price = Number(ev.target.value) || 0; })} />
                  <Button variant="ghost" size="icon" onClick={() => edit((d) => { d[i]!.bairros.splice(j, 1); })}><Trash2 /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => edit((d) => { d[i]!.bairros.push({ id: uid(), name: "", price: 0 }); })}><Plus /> Bairro</Button>
            </div>
          ))}
        </div>
        <DialogFooter><Button className="w-full" onClick={onClose}>Concluir</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
