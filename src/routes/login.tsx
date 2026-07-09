import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — CNI Scan" },
      { name: "description", content: "Connexion sécurisée à l'espace opérateur CNI Scan." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* Left brand panel */}
      <aside className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:block">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, oklch(0.55 0.13 155 / 0.35), transparent 40%), radial-gradient(circle at 80% 60%, oklch(0.55 0.14 255 / 0.35), transparent 45%)",
          }}
        />
        <div className="relative flex h-full flex-col p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">CNI Scan</div>
              <div className="text-[11px] text-sidebar-foreground/60">
                République du Sénégal · DGE
              </div>
            </div>
          </div>

          <div className="mt-auto max-w-md">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-1 text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Système sécurisé · Conforme ICAO 9303
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">
              Numérisation et extraction<br />des cartes nationales d'identité.
            </h1>
            <p className="mt-4 text-sm text-sidebar-foreground/70">
              Une interface dédiée aux opérateurs administratifs pour saisir, contrôler et
              archiver les CNI sénégalaises avec fiabilité.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-mono-data text-2xl font-semibold">94%</div>
                <div className="text-sidebar-foreground/60">Taux d'extraction</div>
              </div>
              <div>
                <div className="font-mono-data text-2xl font-semibold">&lt; 12s</div>
                <div className="text-sidebar-foreground/60">Par carte</div>
              </div>
              <div>
                <div className="font-mono-data text-2xl font-semibold">ICAO</div>
                <div className="text-sidebar-foreground/60">9303 · TD1</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right form */}
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold">CNI Scan</div>
          </div>

          <div className="mb-6">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Espace opérateur
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Se connecter
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Utilisez vos identifiants professionnels.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/" });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Adresse professionnelle
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="prenom.nom@interieur.gouv.sn"
                  className="h-11 pl-9 bg-surface"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">
                  Mot de passe
                </Label>
                <a href="#" className="text-xs font-medium text-primary hover:underline">
                  Oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="h-11 pl-9 pr-11 bg-surface"
                />
                <button
                  type="button"
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox id="remember" /> <span>Rester connecté sur ce poste</span>
            </label>
            <Button type="submit" className="h-11 w-full">
              Se connecter
            </Button>
          </form>

          <div className="mt-8 rounded-md border border-border bg-surface-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
            L'accès à cette application est restreint aux opérateurs habilités. Toute action est
            journalisée conformément à la Loi n° 2008-12 sur la protection des données à
            caractère personnel.
          </div>
        </div>
      </main>
    </div>
  );
}
