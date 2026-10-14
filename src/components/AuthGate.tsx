import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import flashLogo from "@/assets/flash-logo.png";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return null;
  if (session) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const mail = email.trim().toLowerCase();
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (error) setMsg("E-mail ou senha incorretos, ou e-mail ainda não confirmado.");
    } else {
      const { error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMsg("Este e-mail não tem permissão para usar o app.");
      else setMsg("Pronto! Confirme no link enviado para seu e-mail e depois entre.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6">
        <img src={flashLogo} alt="Flash Entregas" className="mx-auto h-24 w-24 object-contain" />
        <h1 className="text-center text-xl font-bold text-foreground">
          {mode === "login" ? "Entrar" : "Criar acesso"}
        </h1>
        <Input type="email" required placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" required minLength={6} placeholder="Senha (mín. 6)" value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg && <p className="text-sm text-muted-foreground text-center">{msg}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "login" ? "Entrar" : "Criar acesso"}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-primary underline"
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(""); }}
        >
          {mode === "login" ? "Primeiro acesso? Criar senha" : "Já tenho senha"}
        </button>
      </form>
    </div>
  );
}
