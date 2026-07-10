import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Camera,
  X,
  Check,
  Sun,
  Focus,
  Maximize2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Lock,
  FileImage,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setPendingUpload } from "@/lib/flow-store";

/** Validation client, alignée sur le backend (image/jpeg|png, 10 Mo max). */
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Nouvelle numérisation — CNI Scan" },
      { name: "description", content: "Déposez le recto et le verso d'une CNI pour lancer l'extraction OCR." },
    ],
  }),
  component: UploadPage,
});

type Side = "recto" | "verso";

function DropZone({
  side,
  file,
  onFile,
  onClear,
}: {
  side: Side;
  file: File | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Aperçu via objectURL révoqué au changement (pas de fuite mémoire).
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFiles = (f: File | undefined) => {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Format non supporté (JPEG ou PNG attendu)");
      return;
    }
    if (f.size > MAX_UPLOAD_SIZE) {
      setError("Fichier trop volumineux (max 10 Mo)");
      return;
    }
    setError(null);
    onFile(f);
  };

  const handleClear = () => {
    setError(null);
    onClear();
  };

  const label = side === "recto" ? "Recto" : "Verso";
  const sublabel = side === "recto" ? "Face avant" : "Face arrière";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {sublabel} ({label})
        </div>
        {file && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
            <Check className="h-3 w-3" /> Chargé
          </span>
        )}
      </div>

      {preview ? (
        <div className="relative overflow-hidden rounded-lg border border-border bg-surface-muted">
          <div className="aspect-[1.586/1] w-full">
            <img
              src={preview}
              alt={`Aperçu ${side}`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
            <div className="text-xs font-medium text-white">Aperçu — {label}</div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="h-8 gap-1.5 bg-white/95 text-foreground hover:bg-white"
                onClick={() => inputRef.current?.click()}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Remplacer
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/95 text-danger hover:bg-white"
                aria-label="Supprimer"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files?.[0])}
          />
        </div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files[0]);
          }}
          className={cn(
            "group relative flex aspect-[1.586/1] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-all",
            dragOver
              ? "border-primary bg-info-soft scale-[1.01]"
              : "border-border bg-surface-muted/60 hover:border-primary/60 hover:bg-info-soft/60",
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-elev)] transition-transform group-hover:scale-105">
            {side === "recto" ? (
              <Camera className="h-6 w-6" />
            ) : (
              <FileImage className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="text-base font-semibold text-foreground">{label}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Glisser-déposer ou{" "}
              <span className="font-medium text-primary underline underline-offset-2">
                parcourir
              </span>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={(e) => {
              e.preventDefault();
              inputRef.current?.click();
            }}
          >
            <Camera className="h-3.5 w-3.5" /> Capturer par webcam
          </Button>
          <div className="absolute bottom-2 text-[10px] text-muted-foreground/70">
            JPEG · PNG — 10 Mo max
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files?.[0])}
          />
        </label>
      )}

      {error && (
        <p className="flex items-center gap-1.5 px-0.5 text-xs font-medium text-danger">
          <X className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function UploadPage() {
  const [recto, setRecto] = useState<File | null>(null);
  const [verso, setVerso] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const navigate = useNavigate();

  const count = (recto ? 1 : 0) + (verso ? 1 : 0);
  const ready = count === 2 && consent;
  const progress = (count / 2) * 100;

  const handleSubmit = () => {
    if (!recto || !verso) return;
    // Remise des fichiers au store ; /processing lance alors l'extraction.
    setPendingUpload({ recto, verso, persist: true });
    navigate({ to: "/processing" });
  };

  return (
    <AppShell breadcrumb="Nouvelle numérisation" title="Étape 1 · Dépôt des images">
      <div className="mx-auto max-w-[1240px] p-6 lg:p-8">
        {/* Stepper */}
        <ol className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <li className="flex items-center gap-2 text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px]">
              1
            </span>
            Dépôt
          </li>
          <li className="h-px w-8 bg-border" />
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-[11px]">
              2
            </span>
            Extraction
          </li>
          <li className="h-px w-8 bg-border" />
          <li className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-[11px]">
              3
            </span>
            Vérification
          </li>
        </ol>

        <div className="mb-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Extraction de données d'identité
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Veuillez soumettre les deux faces de la Carte Nationale d'Identité pour procéder
            à la vérification par nos systèmes OCR sécurisés.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Upload zone */}
          <section className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] lg:p-7">
            <div className="grid gap-5 md:grid-cols-2">
              <DropZone side="recto" file={recto} onFile={setRecto} onClear={() => setRecto(null)} />
              <DropZone side="verso" file={verso} onFile={setVerso} onClear={() => setVerso(null)} />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <Link
                to="/"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                ← Retour au tableau de bord
              </Link>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Résolution recommandée · ≥ 1200 × 750 px
              </div>
            </div>
          </section>

          {/* Right rail */}
          <aside className="space-y-5">
            {/* Instructions — dark green institutional panel */}
            <div className="relative overflow-hidden rounded-xl bg-sidebar p-5 text-sidebar-foreground shadow-[var(--shadow-elev)]">
              <ShieldCheck className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 text-white/5" />
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold">Instructions de capture</h3>
              </div>
              <ul className="space-y-3 text-[13px] leading-snug">
                <li className="flex items-start gap-2.5">
                  <Sun className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" />
                  <span>
                    <span className="font-semibold">Bonne luminosité :</span>{" "}
                    <span className="text-sidebar-foreground/85">
                      évitez les reflets directs sur le plastique.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Maximize2 className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" />
                  <span>
                    <span className="font-semibold">Carte entière :</span>{" "}
                    <span className="text-sidebar-foreground/85">
                      les quatre coins doivent être visibles.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Focus className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-primary" />
                  <span>
                    <span className="font-semibold">Pas de flou :</span>{" "}
                    <span className="text-sidebar-foreground/85">
                      assurez-vous que le texte est parfaitement lisible.
                    </span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Completion status + CTA */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Statut de complétion</span>
                <span className="font-mono-data text-xs font-semibold text-muted-foreground">
                  {count} / 2 fichiers
                </span>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    count === 2 ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-md bg-surface-muted p-3 text-[11px] leading-snug text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--color-primary)]"
                />
                <span>
                  J'accepte le traitement sécurisé des données biométriques conformément aux
                  protocoles du Ministère de l'Intérieur.
                </span>
              </label>

              <Button
                className="mt-4 h-11 w-full gap-2"
                disabled={!ready}
                onClick={handleSubmit}
              >
                <UploadCloud className="h-4 w-4" />
                Lancer l'extraction
                <ArrowRight className="h-4 w-4" />
              </Button>
              {!ready && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {count < 2
                    ? "Ajoutez les deux faces pour continuer."
                    : "Cochez le consentement pour activer le bouton."}
                </p>
              )}
            </div>

            {/* Trust badge */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success-soft text-success">
                <Lock className="h-4 w-4" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="text-xs font-semibold uppercase tracking-widest text-foreground">
                  Cryptage AES-256
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Données éphémères, non stockées.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
