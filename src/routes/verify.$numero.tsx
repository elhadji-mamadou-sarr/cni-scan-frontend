import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getLastExtraction } from "@/lib/flow-store";
import { useCniDetail, useSaveCni } from "@/lib/hooks";
import type {
  CniRectoIn,
  CniRectoOut,
  CniVersoOut,
  CniVersoUpdate,
} from "@/lib/types";

export const Route = createFileRoute("/verify/$numero")({
  head: () => ({
    meta: [
      { title: "Vérification des données extraites — CNI Scan" },
      { name: "description", content: "Contrôle et correction manuelle des champs extraits de la CNI avant enregistrement." },
    ],
  }),
  component: VerifyPage,
});

type Side = "recto" | "verso";
type InputType = "text" | "date" | "select";
/** Zone de la carte mise en surbrillance au focus d'un champ. */
type CardZone = "numero" | "nom" | "prenom" | "sexe" | "naissance" | "photo" | "mrz" | null;

interface FieldDef {
  key: string;
  label: string;
  type?: InputType;
  mono?: boolean;
  full?: boolean;
  readOnly?: boolean;
  zone?: Exclude<CardZone, null>;
}

interface Section {
  title: string;
  fields: FieldDef[];
}

const RECTO_SECTIONS: Section[] = [
  {
    title: "Identité",
    fields: [
      { key: "numero_cni", label: "Numéro de la carte", mono: true, readOnly: true, zone: "numero" },
      { key: "prenom", label: "Prénom", zone: "prenom" },
      { key: "nom", label: "Nom", zone: "nom" },
      { key: "sexe", label: "Sexe", type: "select", zone: "sexe" },
      { key: "taille", label: "Taille (m)", mono: true },
    ],
  },
  {
    title: "Naissance",
    fields: [{ key: "lieu_naissance", label: "Lieu de naissance", zone: "naissance" }],
  },
  {
    title: "Validité",
    fields: [
      { key: "date_delivrance", label: "Date de délivrance", type: "date" },
      { key: "date_expiration", label: "Date d'expiration", type: "date" },
      { key: "centre_enregistrement", label: "Centre d'enregistrement" },
    ],
  },
  {
    title: "Adresse",
    fields: [{ key: "adresse_domicile", label: "Adresse du domicile", full: true }],
  },
];

const VERSO_SECTIONS: Section[] = [
  {
    title: "Localisation",
    fields: [
      { key: "region", label: "Région" },
      { key: "departement", label: "Département" },
      { key: "arrondissement", label: "Arrondissement" },
      { key: "commune", label: "Commune" },
      { key: "lieu_vote", label: "Lieu de vote" },
    ],
  },
  {
    title: "Données électorales",
    fields: [
      { key: "code_pays", label: "Code pays", mono: true },
      { key: "numero_electeur", label: "Numéro d'électeur", mono: true },
      { key: "bureau", label: "Bureau", mono: true },
      { key: "nin", label: "NIN", mono: true },
    ],
  },
];

const RECTO_KEYS = RECTO_SECTIONS.flatMap((s) => s.fields).filter((f) => !f.readOnly).map((f) => f.key);
const VERSO_KEYS = VERSO_SECTIONS.flatMap((s) => s.fields).map((f) => f.key);

type FormState = Record<string, string>;

function buildForm(recto: CniRectoOut, verso: CniVersoOut | undefined): FormState {
  const form: FormState = {};
  const rectoRec = recto as unknown as Record<string, unknown>;
  const versoRec = verso as unknown as Record<string, unknown> | undefined;
  for (const key of RECTO_KEYS) {
    const raw = rectoRec[key];
    form[key] = raw == null ? "" : String(raw);
  }
  for (const key of VERSO_KEYS) {
    const raw = versoRec ? versoRec[key] : null;
    form[key] = raw == null ? "" : String(raw);
  }
  return form;
}

/** Date de naissance dérivée de la MRZ ligne 2 (AAMMJJ en tête), au format JJ/MM/AAAA. */
function mrzBirthDate(line2: string | null | undefined): string | null {
  if (!line2) return null;
  const yymmdd = line2.replace(/\s/g, "").toUpperCase().slice(0, 6);
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = Number(yymmdd.slice(2, 4));
  const dd = Number(yymmdd.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const nowYY = new Date().getFullYear() % 100;
  const year = yy <= nowYY ? 2000 + yy : 1900 + yy;
  return `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${year}`;
}

type FieldStatus = "ok" | "warn" | "missing";

function StatusIcon({ status }: { status: FieldStatus }) {
  if (status === "ok") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-soft text-success">
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning-soft text-warning-foreground">
        <AlertTriangle className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger-soft text-danger">
      <XCircle className="h-3.5 w-3.5" />
    </span>
  );
}

// --- Champ éditable -------------------------------------------------------

function FieldRow({
  def,
  value,
  status,
  message,
  error,
  onChange,
  onFocusZone,
}: {
  def: FieldDef;
  value: string;
  status: FieldStatus;
  message?: string;
  error?: string;
  onChange: (value: string) => void;
  onFocusZone: (zone: CardZone) => void;
}) {
  const borderClass =
    error || status === "missing"
      ? "border-danger/50 focus-visible:ring-danger/30"
      : status === "warn"
        ? "border-warning/50 focus-visible:ring-warning/30"
        : "border-input";

  const focus = () => onFocusZone(def.zone ?? null);

  return (
    <div className={cn("space-y-1.5", def.full && "sm:col-span-2")}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={def.key} className="text-xs font-medium text-foreground">
          {def.label}
        </Label>
        <StatusIcon status={error ? "missing" : status} />
      </div>

      {def.readOnly ? (
        <div className="flex h-11 items-center gap-2 rounded-md border border-input bg-surface-muted px-3 font-mono-data text-[13px] text-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{value || "—"}</span>
        </div>
      ) : def.type === "select" ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={def.key} className={cn("h-11 bg-surface", borderClass)} onFocus={focus}>
            <SelectValue placeholder="Non renseigné" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="M">M — Masculin</SelectItem>
            <SelectItem value="F">F — Féminin</SelectItem>
          </SelectContent>
        </Select>
      ) : def.full ? (
        <Textarea
          id={def.key}
          value={value}
          rows={2}
          onFocus={focus}
          onChange={(e) => onChange(e.target.value)}
          className={cn("resize-none bg-surface", borderClass)}
        />
      ) : (
        <Input
          id={def.key}
          type={def.type === "date" ? "date" : "text"}
          value={value}
          onFocus={focus}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-11 bg-surface", def.mono && "font-mono-data text-[13px]", borderClass)}
        />
      )}

      {error ? (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-danger">
          <XCircle className="h-3 w-3" /> {error}
        </p>
      ) : status === "missing" ? (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-danger">
          <AlertTriangle className="h-3 w-3" /> Non extrait — à saisir manuellement.
        </p>
      ) : message ? (
        <p className="flex items-center gap-1.5 text-[11px] text-warning-foreground">
          <Info className="h-3 w-3" /> {message}
        </p>
      ) : null}
    </div>
  );
}

// --- Aperçu carte ---------------------------------------------------------

function CardRow({
  label,
  value,
  active,
  strong,
  mono,
}: {
  label: string;
  value: string;
  active: boolean;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded px-1.5 py-0.5 transition-colors",
        active && "bg-[color:oklch(0.55_0.13_155/0.22)] ring-1 ring-[color:oklch(0.45_0.13_155/0.5)]",
      )}
    >
      <div className="text-[9px] uppercase tracking-wide opacity-60">{label}</div>
      <div
        className={cn(
          strong ? "text-[13px] font-bold" : "text-[11px] font-semibold",
          mono && "font-mono-data",
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function CardPreview({
  side,
  recto,
  verso,
  form,
  zone,
}: {
  side: Side;
  recto: CniRectoOut;
  verso: CniVersoOut | undefined;
  form: FormState;
  zone: CardZone;
}) {
  const birth = mrzBirthDate(verso?.mrz_ligne2);
  const mrzLines = [verso?.mrz_ligne1, verso?.mrz_ligne2, verso?.mrz_ligne3].filter(
    (l): l is string => Boolean(l),
  );

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
          <div className="rounded-sm bg-[color:oklch(0.45_0.13_155)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
            {side}
          </div>
        </div>

        {side === "recto" ? (
          <div className="mt-4 grid flex-1 grid-cols-[84px_1fr] gap-4">
            <div
              className={cn(
                "rounded-sm bg-white/70 backdrop-blur-sm transition-shadow",
                zone === "photo" && "ring-2 ring-[color:oklch(0.45_0.13_155/0.6)]",
              )}
            />
            <div className="grid grid-cols-2 content-start gap-x-2 gap-y-1">
              <div className="col-span-2">
                <CardRow label="N°" value={form.numero_cni} active={zone === "numero"} mono />
              </div>
              <div className="col-span-2">
                <CardRow label="Nom" value={form.nom} active={zone === "nom"} strong />
              </div>
              <div className="col-span-2">
                <CardRow label="Prénom" value={form.prenom} active={zone === "prenom"} strong />
              </div>
              <CardRow label="Née le" value={birth ?? "—"} active={zone === "naissance"} mono />
              <CardRow label="Sexe" value={form.sexe} active={zone === "sexe"} />
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-1 flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              <CardRow label="Région" value={form.region} active={false} />
              <CardRow label="Commune" value={form.commune} active={false} />
              <CardRow label="Bureau" value={form.bureau} active={false} mono />
            </div>
            <CardRow label="NIN" value={form.nin} active={false} mono />
            <div
              className={cn(
                "mt-auto rounded-sm bg-white/60 p-2 font-mono-data text-[9px] leading-relaxed transition-shadow",
                zone === "mrz" && "ring-2 ring-[color:oklch(0.45_0.13_155/0.6)]",
              )}
            >
              {mrzLines.length > 0
                ? mrzLines.map((l, i) => <div key={i}>{l}</div>)
                : "MRZ non disponible"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyPage() {
  const { numero } = Route.useParams();
  const navigate = useNavigate();
  const saveCni = useSaveCni();

  const cached = getLastExtraction();
  const fromCache = Boolean(cached && cached.recto.numero_cni === numero);
  const detailQuery = useCniDetail(fromCache ? undefined : numero);

  const recto = fromCache ? cached!.recto : detailQuery.data?.recto;
  const verso = fromCache ? cached!.verso : detailQuery.data?.verso;
  const warnings = fromCache ? cached!.warnings : [];
  const cardNumber = recto?.numero_cni ?? numero;

  const [side, setSide] = useState<Side>("recto");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [zone, setZone] = useState<CardZone>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const initialRef = useRef<FormState>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Associe chaque champ à son avertissement backend (ex. "sexe: désaccord...").
  const warningMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const w of warnings) {
      const idx = w.indexOf(":");
      if (idx > 0) {
        const key = w.slice(0, idx).trim();
        const msg = w.slice(idx + 1).trim();
        map[key] = map[key] ? `${map[key]} ; ${msg}` : msg;
      }
    }
    return map;
  }, [warnings]);

  useEffect(() => {
    if (!recto) return;
    const init = buildForm(recto, verso);
    setForm(init);
    initialRef.current = init;
    setFieldErrors({});
  }, [recto, verso]);

  const setField = (key: string, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // --- Chargement / erreur (fallback API) --------------------------------

  if (!fromCache && numero && detailQuery.isLoading) {
    return (
      <AppShell breadcrumb="Vérification" title="Chargement de la fiche…">
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des données extraites…
        </div>
      </AppShell>
    );
  }

  if (!recto || !form) {
    const message = detailQuery.isError
      ? detailQuery.error.message
      : "Aucune donnée à vérifier. Lancez une nouvelle numérisation.";
    return (
      <AppShell breadcrumb="Vérification" title="Vérification">
        <div className="mx-auto max-w-md p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
          <Button className="mt-6" onClick={() => navigate({ to: "/upload" })}>
            Nouvelle numérisation
          </Button>
        </div>
      </AppShell>
    );
  }

  // --- Statut par champ --------------------------------------------------

  const statusOf = (key: string, readOnly?: boolean): FieldStatus => {
    const value = readOnly ? cardNumber ?? "" : form[key];
    if (!value) return "missing";
    if (warningMap[key]) return "warn";
    return "ok";
  };

  const sections = side === "recto" ? RECTO_SECTIONS : VERSO_SECTIONS;
  const sideFields = sections.flatMap((s) => s.fields);
  const toControl = sideFields.filter((f) => statusOf(f.key, f.readOnly) !== "ok").length;

  // --- Actions -----------------------------------------------------------

  const handleReject = () => {
    toast.info("Extraction rejetée — carte non enregistrée.");
    navigate({ to: "/" });
  };

  const handleSave = () => {
    if (!cardNumber) return;

    if (form.taille.trim() !== "" && Number.isNaN(Number(form.taille.replace(",", ".")))) {
      setFieldErrors({ taille: "Nombre attendu (ex. 1.85)" });
      toast.error("La taille doit être un nombre.");
      setSide("recto");
      return;
    }

    const rectoPayload: Record<string, string | number | null> = { numero_cni: cardNumber };
    for (const key of RECTO_KEYS) {
      const raw = form[key].trim();
      rectoPayload[key] =
        key === "taille"
          ? raw === ""
            ? null
            : Number(raw.replace(",", "."))
          : raw === ""
            ? null
            : raw;
    }
    const versoPayload: Record<string, string | null> = {};
    for (const key of VERSO_KEYS) {
      const raw = form[key].trim();
      versoPayload[key] = raw === "" ? null : raw;
    }
    versoPayload.mrz_ligne1 = verso?.mrz_ligne1 ?? null;
    versoPayload.mrz_ligne2 = verso?.mrz_ligne2 ?? null;
    versoPayload.mrz_ligne3 = verso?.mrz_ligne3 ?? null;

    setFieldErrors({});
    saveCni.mutate(
      { recto: rectoPayload as CniRectoIn, verso: versoPayload as CniVersoUpdate },
      {
        onSuccess: () => {
          toast.success("CNI validée et enregistrée");
          navigate({ to: "/records/$id", params: { id: cardNumber } });
        },
        onError: (err) => {
          if (err.fields) {
            setFieldErrors(err.fields);
            toast.error("Certains champs sont invalides.");
          } else {
            toast.error(err.message);
          }
        },
      },
    );
  };

  const saving = saveCni.isPending;
  const totalToControl = [...RECTO_SECTIONS, ...VERSO_SECTIONS]
    .flatMap((s) => s.fields)
    .filter((f) => statusOf(f.key, f.readOnly) !== "ok").length;

  return (
    <AppShell
      breadcrumb="Nouvelle numérisation · Étape 3"
      title="Vérification et correction des données extraites"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10" disabled={saving} onClick={handleReject}>
            <X className="mr-1.5 h-4 w-4" /> Rejeter
          </Button>
          <Button className="h-10 gap-1.5" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Valider et enregistrer
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-[1440px] p-6">
        {/* Bandeau warnings */}
        {warnings.length > 0 && (
          <div className="mb-5 rounded-lg border border-warning/40 bg-warning-soft p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
              <AlertTriangle className="h-4 w-4" />
              {warnings.length} avertissement{warnings.length > 1 ? "s" : ""} lors de l'extraction
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-8 text-xs text-warning-foreground/90">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          {/* Panneau carte */}
          <div className="space-y-4">
            <div className="space-y-3 xl:sticky xl:top-[76px]">
              <div className="flex items-center justify-between gap-2">
                <Tabs value={side} onValueChange={(v) => setSide(v as Side)}>
                  <TabsList className="h-10 bg-surface-muted">
                    <TabsTrigger value="recto" className="h-8 px-4">Recto</TabsTrigger>
                    <TabsTrigger value="verso" className="h-8 px-4">Verso</TabsTrigger>
                  </TabsList>
                </Tabs>

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
                  <div className="w-12 text-center font-mono-data text-xs text-muted-foreground">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Pivoter"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border bg-[color:oklch(0.96_0.005_240)] p-6">
                <div
                  className="mx-auto"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center",
                    transition: "transform 200ms ease",
                  }}
                >
                  <CardPreview side={side} recto={recto} verso={verso} form={form} zone={zone} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4 text-xs text-muted-foreground">
                <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  Astuce
                </div>
                Cliquez sur un champ à droite pour surligner sa zone d'origine sur la carte. Les
                champs marqués <span className="font-medium text-warning-foreground">⚠</span> ou{" "}
                <span className="font-medium text-danger">✗</span> sont à contrôler avant
                d'enregistrer. Les images originales ne sont pas conservées.
              </div>
            </div>
          </div>

          {/* Panneau champs */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Champs — {side === "recto" ? "Recto" : "Verso"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {sideFields.length} champs · {toControl} à contrôler
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><StatusIcon status="ok" /> Validé</span>
                <span className="flex items-center gap-1.5"><StatusIcon status="warn" /> À vérifier</span>
                <span className="flex items-center gap-1.5"><StatusIcon status="missing" /> Manquant</span>
              </div>
            </div>

            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]"
              >
                <header className="border-b border-border px-6 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                </header>
                <div className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2">
                  {section.fields.map((def) => (
                    <FieldRow
                      key={def.key}
                      def={def}
                      value={def.readOnly ? cardNumber ?? "" : form[def.key]}
                      status={statusOf(def.key, def.readOnly)}
                      message={warningMap[def.key]}
                      error={fieldErrors[def.key]}
                      onChange={(v) => setField(def.key, v)}
                      onFocusZone={setZone}
                    />
                  ))}
                </div>
              </section>
            ))}

            {side === "verso" && (
              <section className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
                <Label htmlFor="mrz" className="text-xs font-medium text-foreground">
                  Zone MRZ (lecture seule)
                </Label>
                <Textarea
                  id="mrz"
                  readOnly
                  onFocus={() => setZone("mrz")}
                  value={
                    [verso?.mrz_ligne1, verso?.mrz_ligne2, verso?.mrz_ligne3]
                      .filter(Boolean)
                      .join("\n") || "—"
                  }
                  rows={3}
                  className="mt-1.5 resize-none bg-surface-muted font-mono-data text-[13px]"
                />
              </section>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="text-xs text-muted-foreground">
                {totalToControl > 0
                  ? `${totalToControl} champ${totalToControl > 1 ? "s" : ""} à contrôler (recto + verso). `
                  : "Tous les champs sont renseignés. "}
                La carte n'est enregistrée qu'à la validation.
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-11" disabled={saving} onClick={handleReject}>
                  Rejeter
                </Button>
                <Button className="h-11 gap-1.5" disabled={saving} onClick={handleSave}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Valider et enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
