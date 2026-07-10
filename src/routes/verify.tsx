import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>): { numero?: string } => ({
    numero: typeof search.numero === "string" ? search.numero : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Vérification des données extraites — CNI Scan" },
      { name: "description", content: "Contrôle et correction manuelle des champs extraits de la CNI avant enregistrement." },
    ],
  }),
  component: VerifyPage,
});

// --- Descripteurs de champs (clés alignées sur le backend) ---------------

type InputType = "text" | "date" | "select";

interface FieldDef {
  key: string;
  label: string;
  type?: InputType;
  mono?: boolean;
  full?: boolean; // occupe toute la largeur
}

const RECTO_FIELDS: FieldDef[] = [
  { key: "prenom", label: "Prénom" },
  { key: "nom", label: "Nom" },
  { key: "sexe", label: "Sexe", type: "select" },
  { key: "taille", label: "Taille (m)", mono: true },
  { key: "lieu_naissance", label: "Lieu de naissance" },
  { key: "date_delivrance", label: "Date de délivrance", type: "date" },
  { key: "date_expiration", label: "Date d'expiration", type: "date" },
  { key: "centre_enregistrement", label: "Centre d'enregistrement" },
  { key: "adresse_domicile", label: "Adresse du domicile", full: true },
];

const VERSO_FIELDS: FieldDef[] = [
  { key: "code_pays", label: "Code pays", mono: true },
  { key: "numero_electeur", label: "Numéro d'électeur", mono: true },
  { key: "region", label: "Région" },
  { key: "departement", label: "Département" },
  { key: "arrondissement", label: "Arrondissement" },
  { key: "commune", label: "Commune" },
  { key: "lieu_vote", label: "Lieu de vote" },
  { key: "bureau", label: "Bureau", mono: true },
  { key: "nin", label: "NIN", mono: true },
];

const RECTO_KEYS = RECTO_FIELDS.map((f) => f.key);
const VERSO_KEYS = VERSO_FIELDS.map((f) => f.key);

type FormState = Record<string, string>;

/** Construit l'état de formulaire (valeurs texte) depuis recto + verso. */
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

// --- Champ éditable -------------------------------------------------------

function FieldRow({
  def,
  value,
  toVerify,
  error,
  onChange,
}: {
  def: FieldDef;
  value: string;
  toVerify: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  const borderClass = error
    ? "border-danger/50 focus-visible:ring-danger/30"
    : toVerify
      ? "border-warning/50 focus-visible:ring-warning/30"
      : "border-input";

  return (
    <div className={cn("space-y-1.5", def.full && "md:col-span-2")}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={def.key} className="text-xs font-medium text-foreground">
          {def.label}
        </Label>
        {toVerify && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning-foreground">
            <AlertTriangle className="h-3 w-3" /> À vérifier
          </span>
        )}
      </div>

      {def.type === "select" ? (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={def.key} className={cn("h-11 bg-surface", borderClass)}>
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
          onChange={(e) => onChange(e.target.value)}
          className={cn("bg-surface resize-none", borderClass)}
        />
      ) : (
        <Input
          id={def.key}
          type={def.type === "date" ? "date" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("h-11 bg-surface", def.mono && "font-mono-data text-[13px]", borderClass)}
        />
      )}

      {error ? (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-danger">
          <AlertTriangle className="h-3 w-3" /> {error}
        </p>
      ) : toVerify ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" /> Champ non extrait — à saisir manuellement.
        </p>
      ) : null}
    </div>
  );
}

function VerifyPage() {
  const { numero } = Route.useSearch();
  const navigate = useNavigate();
  const saveCni = useSaveCni();

  // Source des données : extraction en mémoire (flux upload) si elle correspond
  // au numéro, sinon lecture API (accès direct à l'URL / rechargement).
  const cached = getLastExtraction();
  const fromCache = Boolean(cached && (!numero || cached.recto.numero_cni === numero));
  const detailQuery = useCniDetail(fromCache ? undefined : numero);

  const recto = fromCache ? cached!.recto : detailQuery.data?.recto;
  const verso = fromCache ? cached!.verso : detailQuery.data?.verso;
  const warnings = fromCache ? cached!.warnings : [];
  const cardNumber = recto?.numero_cni ?? numero;

  const [form, setForm] = useState<FormState | null>(null);
  const initialRef = useRef<FormState>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  // --- États de chargement / erreur (fallback API) -----------------------

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

  const toVerify = (key: string) => initialRef.current[key] === "";
  const doubtCount =
    [...RECTO_KEYS, ...VERSO_KEYS].filter((k) => initialRef.current[k] === "").length;

  const mrzLines = [verso?.mrz_ligne1, verso?.mrz_ligne2, verso?.mrz_ligne3].filter(
    (l): l is string => Boolean(l),
  );

  // --- Enregistrement ----------------------------------------------------

  const handleReject = () => {
    // Rien n'a été persisté à l'extraction : on abandonne simplement.
    toast.info("Extraction rejetée — carte non enregistrée.");
    navigate({ to: "/" });
  };

  const handleSave = () => {
    if (!cardNumber) return;

    // Validation client minimale de la taille (évite un 422 évident).
    if (form.taille.trim() !== "" && Number.isNaN(Number(form.taille.replace(",", ".")))) {
      setFieldErrors({ taille: "Nombre attendu (ex. 1.85)" });
      toast.error("La taille doit être un nombre.");
      return;
    }

    // On envoie la carte COMPLÈTE (champs corrigés) : POST /cni persiste
    // (upsert). Vide -> null pour ne pas enregistrer de chaîne vide.
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
    // La MRZ (lecture seule) n'est pas dans le formulaire : on la reprend
    // telle quelle de l'extraction pour la persister.
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

  return (
    <AppShell
      breadcrumb="Nouvelle numérisation · Étape 3"
      title="Vérification et correction des données extraites"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10" disabled={saving} onClick={handleReject}>
            <X className="h-4 w-4 mr-1.5" /> Rejeter
          </Button>
          <Button className="h-10 gap-1.5" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Valider et enregistrer
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-[1440px] p-6">
        {/* Bandeau warnings / synthèse */}
        {warnings.length > 0 ? (
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
        ) : (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success-soft text-success">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              Extraction terminée sans avertissement
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* Colonne gauche — synthèse identité */}
          <aside className="space-y-4">
            <div className="sticky top-[76px] space-y-4">
              <div className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Numéro de la carte
                </div>
                <div className="mt-1 font-mono-data text-lg font-semibold text-foreground">
                  {cardNumber}
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Identité
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {[form.nom, form.prenom].filter(Boolean).join(" ") || "—"}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-md bg-warning-soft/60 p-2.5 text-[11px] text-warning-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {doubtCount > 0
                    ? `${doubtCount} champ${doubtCount > 1 ? "s" : ""} non extrait${doubtCount > 1 ? "s" : ""} à vérifier`
                    : "Tous les champs ont été extraits"}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4 text-xs text-muted-foreground">
                <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  Astuce
                </div>
                Les champs marqués « À vérifier » n'ont pas pu être lus automatiquement.
                Complétez-les avant d'enregistrer. Les images originales ne sont pas conservées.
              </div>
            </div>
          </aside>

          {/* Colonne droite — formulaire */}
          <div className="space-y-5">
            <section className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
              <header className="border-b border-border px-6 py-4">
                <h2 className="text-sm font-semibold text-foreground">Champs — Recto</h2>
                <p className="text-xs text-muted-foreground">
                  {RECTO_FIELDS.length} champs extraits
                </p>
              </header>
              <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2">
                {RECTO_FIELDS.map((def) => (
                  <FieldRow
                    key={def.key}
                    def={def}
                    value={form[def.key]}
                    toVerify={toVerify(def.key)}
                    error={fieldErrors[def.key]}
                    onChange={(v) => setField(def.key, v)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
              <header className="border-b border-border px-6 py-4">
                <h2 className="text-sm font-semibold text-foreground">Champs — Verso</h2>
                <p className="text-xs text-muted-foreground">
                  {VERSO_FIELDS.length} champs administratifs · MRZ ICAO 9303 (TD1)
                </p>
              </header>
              <div className="grid gap-x-6 gap-y-5 p-6 md:grid-cols-2">
                {VERSO_FIELDS.map((def) => (
                  <FieldRow
                    key={def.key}
                    def={def}
                    value={form[def.key]}
                    toVerify={toVerify(def.key)}
                    error={fieldErrors[def.key]}
                    onChange={(v) => setField(def.key, v)}
                  />
                ))}
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="mrz" className="text-xs font-medium text-foreground">
                    Zone MRZ (lecture seule)
                  </Label>
                  <Textarea
                    id="mrz"
                    readOnly
                    value={mrzLines.join("\n") || "—"}
                    rows={3}
                    className="font-mono-data text-[13px] bg-surface-muted resize-none"
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="text-xs text-muted-foreground">
                La carte n'est enregistrée qu'à la validation. « Rejeter » l'abandonne
                sans rien enregistrer.
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
