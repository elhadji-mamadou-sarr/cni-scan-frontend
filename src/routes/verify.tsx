import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ShieldCheck,
  AlertTriangle,
  Info,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfidenceBadge, ConfidenceDot, type Confidence } from "@/components/confidence-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Vérification des données extraites — CNI Scan" },
      { name: "description", content: "Contrôle et correction manuelle des champs extraits de la CNI avant enregistrement." },
    ],
  }),
  component: VerifyPage,
});

type FieldSpec = {
  key: string;
  label: string;
  value: string;
  confidence: Confidence;
  mono?: boolean;
  hint?: string;
  error?: string;
  type?: "text" | "date" | "select";
  options?: { value: string; label: string }[];
};

const RECTO_FIELDS: FieldSpec[] = [
  { key: "cardNumber", label: "Numéro de la carte", value: "1 234 5678 9012", confidence: "high", mono: true },
  { key: "firstName", label: "Prénom", value: "Fatou", confidence: "high" },
  { key: "lastName", label: "Nom", value: "NDIAYE", confidence: "high" },
  {
    key: "sex",
    label: "Sexe",
    value: "F",
    confidence: "high",
    type: "select",
    options: [
      { value: "F", label: "F — Féminin" },
      { value: "M", label: "M — Masculin" },
    ],
  },
  { key: "height", label: "Taille", value: "1,68 m", confidence: "medium", hint: "Chiffre partiellement flou" },
  { key: "birthPlace", label: "Lieu de naissance", value: "Rufisque", confidence: "high" },
  { key: "issueDate", label: "Date de délivrance", value: "12/03/2022", confidence: "high", type: "date" },
  { key: "expiryDate", label: "Date d'expiration", value: "12/03/2032", confidence: "high", type: "date" },
  { key: "center", label: "Centre d'enregistrement", value: "Dakar - Plateau", confidence: "medium", hint: "OCR ambigu sur la commune" },
  {
    key: "address",
    label: "Adresse du domicile",
    value: "Sicap Liberté 6, Villa n° 5432",
    confidence: "low",
    error: "Extraction partielle — à saisir manuellement",
  },
];

const VERSO_FIELDS: FieldSpec[] = [
  { key: "country", label: "Code pays", value: "SEN", confidence: "high", mono: true },
  { key: "voterNumber", label: "Numéro d'électeur", value: "7788221345", confidence: "high", mono: true },
  { key: "region", label: "Région", value: "Dakar", confidence: "high" },
  { key: "department", label: "Département", value: "Dakar", confidence: "high" },
  { key: "district", label: "Arrondissement", value: "Grand Dakar", confidence: "medium" },
  { key: "commune", label: "Commune", value: "Sicap Liberté", confidence: "high" },
  { key: "pollingPlace", label: "Lieu de vote", value: "École Élémentaire Liberté 6", confidence: "medium" },
  { key: "bureau", label: "Bureau", value: "04", confidence: "high", mono: true },
  { key: "nin", label: "NIN", value: "1 8909 1998 00234", confidence: "high", mono: true },
];

const MRZ = `IDSEN12345678<9012<<<<<<<<<<<<<
9807152F3203127SEN<<<<<<<<<<<4
NDIAYE<<FATOU<<<<<<<<<<<<<<<<<`;

function Field({ f }: { f: FieldSpec }) {
  const [value, setValue] = useState(f.value);
  const badge = f.confidence;
  const borderClass =
    badge === "low"
      ? "border-danger/40 focus-visible:ring-danger/30"
      : badge === "medium"
        ? "border-warning/40 focus-visible:ring-warning/30"
        : "border-input";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={f.key} className="text-xs font-medium text-foreground">
          {f.label}
        </Label>
        <ConfidenceBadge level={badge} compact />
      </div>
      {f.type === "select" ? (
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id={f.key} className={cn("h-11 bg-surface", borderClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {f.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={f.key}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn("h-11 bg-surface", f.mono && "font-mono-data text-[13px]", borderClass)}
        />
      )}
      {f.error ? (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-danger">
          <AlertTriangle className="h-3 w-3" /> {f.error}
        </p>
      ) : f.hint ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" /> {f.hint}
        </p>
      ) : null}
    </div>
  );
}

function CardPreview({ side }: { side: "recto" | "verso" }) {
  // Stylised placeholder representing the CNI. Uses tokens and gradients only.
  return (
    <div className="relative aspect-[1.586/1] w-full overflow-hidden rounded-lg border border-border shadow-[var(--shadow-elev)]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.94 0.03 155) 0%, oklch(0.92 0.04 100) 55%, oklch(0.93 0.06 30) 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.5),transparent_50%)]" />
      <div className="relative flex h-full flex-col p-5 text-[color:oklch(0.22_0.06_255)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest opacity-80">
              République du Sénégal
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wide">
              Carte Nationale d'Identité
            </div>
          </div>
          <div className="rounded-sm bg-[color:oklch(0.55_0.13_155)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
            {side}
          </div>
        </div>
        {side === "recto" ? (
          <div className="mt-4 grid flex-1 grid-cols-[80px_1fr] gap-4">
            <div className="rounded-sm bg-white/70 backdrop-blur-sm" />
            <div className="space-y-1.5 text-[10px] leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="opacity-60">N°</span>
                <span className="font-mono-data font-semibold">1 234 5678 9012</span>
              </div>
              <div>
                <div className="opacity-60">Nom</div>
                <div className="text-[13px] font-bold">NDIAYE</div>
              </div>
              <div>
                <div className="opacity-60">Prénom</div>
                <div className="text-[13px] font-semibold">Fatou</div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <div className="opacity-60">Née le</div>
                  <div className="font-mono-data font-semibold">15/07/1998</div>
                </div>
                <div>
                  <div className="opacity-60">Sexe</div>
                  <div className="font-semibold">F</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex-1 space-y-2 text-[10px] leading-tight">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="opacity-60">Région</div>
                <div className="font-semibold">Dakar</div>
              </div>
              <div>
                <div className="opacity-60">Commune</div>
                <div className="font-semibold">Sicap Liberté</div>
              </div>
              <div>
                <div className="opacity-60">Bureau</div>
                <div className="font-mono-data font-semibold">04</div>
              </div>
            </div>
            <div>
              <div className="opacity-60">NIN</div>
              <div className="font-mono-data font-semibold">1 8909 1998 00234</div>
            </div>
            <div className="mt-auto rounded-sm bg-white/60 p-2 font-mono-data text-[9px] leading-relaxed">
              IDSEN12345678&lt;9012&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />
              9807152F3203127SEN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;4<br />
              NDIAYE&lt;&lt;FATOU&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyPage() {
  const [side, setSide] = useState<"recto" | "verso">("recto");
  const [zoom, setZoom] = useState(1);
  const navigate = useNavigate();

  const totalDoubts =
    RECTO_FIELDS.filter((f) => f.confidence !== "high").length +
    VERSO_FIELDS.filter((f) => f.confidence !== "high").length;

  return (
    <AppShell
      breadcrumb="Nouvelle numérisation · Étape 3"
      title="Vérification et correction des données extraites"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              toast.error("Enregistrement rejeté");
              navigate({ to: "/" });
            }}
          >
            <X className="h-4 w-4 mr-1.5" /> Rejeter
          </Button>
          <Button
            className="h-10 gap-1.5"
            onClick={() => {
              toast.success("CNI validée et enregistrée");
              navigate({ to: "/" });
            }}
          >
            <Check className="h-4 w-4" /> Valider et enregistrer
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-[1440px] p-6">
        {/* Summary banner */}
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Extraction terminée — {totalDoubts} champ{totalDoubts > 1 ? "s" : ""} à vérifier
              </div>
              <div className="text-xs text-muted-foreground">
                MRZ décodée avec succès · Sommes de contrôle valides
              </div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <ConfidenceDot level="high" /> <span className="text-muted-foreground">Élevée</span>
              <span className="font-mono-data font-semibold text-foreground">
                {RECTO_FIELDS.filter((f) => f.confidence === "high").length +
                  VERSO_FIELDS.filter((f) => f.confidence === "high").length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ConfidenceDot level="medium" /> <span className="text-muted-foreground">Moyenne</span>
              <span className="font-mono-data font-semibold text-foreground">
                {RECTO_FIELDS.filter((f) => f.confidence === "medium").length +
                  VERSO_FIELDS.filter((f) => f.confidence === "medium").length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ConfidenceDot level="low" /> <span className="text-muted-foreground">Faible</span>
              <span className="font-mono-data font-semibold text-foreground">
                {RECTO_FIELDS.filter((f) => f.confidence === "low").length +
                  VERSO_FIELDS.filter((f) => f.confidence === "low").length}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,540px)_minmax(0,1fr)]">
          {/* Left — image viewer */}
          <div className="space-y-4">
            <div className="sticky top-[76px] space-y-3">
              <Tabs value={side} onValueChange={(v) => setSide(v as "recto" | "verso")}>
                <div className="flex items-center justify-between gap-2">
                  <TabsList className="h-10 bg-surface-muted">
                    <TabsTrigger value="recto" className="h-8 px-4">Recto</TabsTrigger>
                    <TabsTrigger value="verso" className="h-8 px-4">Verso</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Dézoomer"
                      onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <div className="font-mono-data w-12 text-center text-xs text-muted-foreground">
                      {Math.round(zoom * 100)}%
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Zoomer"
                      onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <div className="mx-1 h-5 w-px bg-border" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Pivoter">
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <TabsContent value="recto" className="mt-3">
                  <div className="overflow-hidden rounded-lg border border-border bg-[color:oklch(0.96_0.005_240)] p-6">
                    <div
                      className="mx-auto transition-transform duration-200"
                      style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                    >
                      <CardPreview side="recto" />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="verso" className="mt-3">
                  <div className="overflow-hidden rounded-lg border border-border bg-[color:oklch(0.96_0.005_240)] p-6">
                    <div
                      className="mx-auto transition-transform duration-200"
                      style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                    >
                      <CardPreview side="verso" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="rounded-lg border border-border bg-surface p-4 text-xs text-muted-foreground">
                <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  Astuce
                </div>
                Cliquez sur un champ à droite pour surligner sa zone d'origine sur la carte.
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="space-y-5">
            <section className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
              <header className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Champs — Recto</h2>
                  <p className="text-xs text-muted-foreground">
                    10 champs extraits · {RECTO_FIELDS.filter((f) => f.confidence !== "high").length} à contrôler
                  </p>
                </div>
                <ArrowLeft
                  className="h-4 w-4 text-muted-foreground cursor-pointer"
                  onClick={() => setSide("recto")}
                />
              </header>
              <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2">
                {RECTO_FIELDS.map((f) => (
                  <div
                    key={f.key}
                    className={cn(f.key === "address" && "md:col-span-2")}
                  >
                    <Field f={f} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
              <header className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Champs — Verso</h2>
                  <p className="text-xs text-muted-foreground">
                    9 champs administratifs · MRZ conforme ICAO 9303 (TD1)
                  </p>
                </div>
              </header>
              <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2">
                {VERSO_FIELDS.map((f) => (
                  <Field key={f.key} f={f} />
                ))}
                <div className="md:col-span-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mrz" className="text-xs font-medium text-foreground">
                      Zone MRZ (lecture seule)
                    </Label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                      <Check className="h-3 w-3" /> Somme de contrôle valide
                    </span>
                  </div>
                  <Textarea
                    id="mrz"
                    readOnly
                    value={MRZ}
                    rows={3}
                    className="font-mono-data text-[13px] bg-surface-muted resize-none"
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="text-xs text-muted-foreground">
                En validant, l'enregistrement sera transmis à la base et journalisé au nom de
                l'opérateur connecté.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    toast.error("Enregistrement rejeté");
                    navigate({ to: "/" });
                  }}
                >
                  Rejeter
                </Button>
                <Button
                  className="h-11 gap-1.5"
                  onClick={() => {
                    toast.success("CNI validée et enregistrée");
                    navigate({ to: "/" });
                  }}
                >
                  <Check className="h-4 w-4" /> Valider et enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
