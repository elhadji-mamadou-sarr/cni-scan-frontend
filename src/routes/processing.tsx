import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Loader2,
  ImageIcon,
  ScanText,
  Barcode,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Hourglass,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExtract } from "@/lib/hooks";
import {
  clearPendingUpload,
  getPendingUpload,
  setLastExtraction,
} from "@/lib/flow-store";

export const Route = createFileRoute("/processing")({
  head: () => ({
    meta: [
      { title: "Extraction en cours — CNI Scan" },
      { name: "description", content: "Suivi de l'extraction OCR : prétraitement, lecture MRZ et validation." },
    ],
  }),
  component: ProcessingPage,
});

const STEPS = [
  { key: "preprocess", label: "Prétraitement image", desc: "Redressement, contraste, détection des bords", Icon: ImageIcon },
  { key: "ocr-recto", label: "OCR Recto", desc: "Lecture des champs visuels (nom, prénom, dates)", Icon: ScanText },
  { key: "ocr-verso", label: "OCR Verso", desc: "Analyse des données administratives", Icon: ScanText },
  { key: "mrz", label: "Lecture MRZ", desc: "Décodage ICAO 9303 · format TD1", Icon: Barcode },
  { key: "validate", label: "Validation finale", desc: "Vérification des sommes de contrôle", Icon: ShieldCheck },
] as const;

function ProcessingPage() {
  const navigate = useNavigate();
  const extract = useExtract();
  const startedRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);

  // Lance l'extraction à partir des fichiers déposés à l'étape 1.
  const runExtraction = useCallback(() => {
    const pending = getPendingUpload();
    if (!pending) {
      // Accès direct à /processing sans fichiers (ou après un rechargement) :
      // rien à traiter, on renvoie au dépôt.
      navigate({ to: "/upload" });
      return;
    }
    extract.mutate(
      { recto: pending.recto, verso: pending.verso, persist: pending.persist },
      {
        onSuccess: (data) => {
          setLastExtraction(data);
          clearPendingUpload();
          navigate({ to: "/verify", search: { numero: data.recto.numero_cni } });
        },
      },
    );
  }, [extract, navigate]);

  useEffect(() => {
    if (startedRef.current) return; // évite le double-lancement (StrictMode)
    startedRef.current = true;
    runExtraction();
  }, [runExtraction]);

  // Chronomètre d'attente : sert à animer une progression *indicative* et à
  // afficher un message rassurant au-delà de 15 s. Aucune étape n'est marquée
  // « terminée » avant la vraie réponse.
  useEffect(() => {
    if (!extract.isPending) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [extract.isPending]);

  const handleRetry = () => {
    extract.reset();
    runExtraction();
  };

  const failed = extract.isError;
  const errorMessage = extract.error?.message ?? "L'extraction a échoué.";
  // Progression asymptotique (n'atteint jamais 100 % : on navigue au succès).
  const progress = Math.min(95, Math.round((1 - Math.exp(-elapsed / 12)) * 100));
  const activeIndex = elapsed % STEPS.length; // rotation visuelle pendant l'attente
  const activeStep = STEPS[activeIndex];
  const longWait = elapsed >= 15;

  return (
    <AppShell breadcrumb="Nouvelle numérisation" title="Étape 2 · Extraction en cours">
      <div className="mx-auto max-w-[1200px] p-6 lg:p-8">
        {/* Stepper */}
        <ol className="mb-6 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <li className="flex items-center gap-2 text-success">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground text-[11px]">
              <Check className="h-3.5 w-3.5" />
            </span>
            Dépôt
          </li>
          <li className="h-px w-8 bg-border" />
          <li className="flex items-center gap-2 text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px]">
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

        {!failed ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Central document preview */}
            <section className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] lg:p-8">
              <div className="relative mx-auto aspect-[1.586/1] w-full max-w-[560px] overflow-hidden rounded-lg border border-border bg-surface-muted">
                {/* Skeleton card content */}
                <div className="absolute inset-0 p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-16 rounded bg-border/70" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-2.5 w-3/4 rounded bg-border/80" />
                      <div className="h-2.5 w-1/2 rounded bg-border/60" />
                      <div className="h-2 w-2/3 rounded bg-border/50 mt-4" />
                      <div className="h-2 w-1/3 rounded bg-border/50" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-1.5">
                    <div className="h-2 w-full rounded bg-border/40" />
                    <div className="h-2 w-11/12 rounded bg-border/40" />
                    <div className="h-2 w-10/12 rounded bg-border/40" />
                  </div>
                </div>
                {/* Scan line animation */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-b from-primary/60 via-primary to-primary/60 shadow-[0_0_18px_2px_var(--color-primary)] animate-scan" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
              </div>

              <div className="mt-8 text-center">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Traitement en cours…
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Veuillez patienter pendant que nos systèmes sécurisés analysent et valident
                  le document d'identité. L'extraction peut prendre plusieurs dizaines de secondes.
                </p>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-widest text-primary">
                  {activeStep.label}
                </p>
                {longWait && (
                  <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">
                    Le traitement est plus long que d'habitude — merci de patienter, ne fermez
                    pas cette page.
                  </p>
                )}
              </div>

              <div className="mx-auto mt-6 max-w-lg">
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between font-mono-data text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <span>0 %</span>
                  <span className="text-primary">{progress} % complété</span>
                  <span>100 %</span>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end border-t border-border pt-5">
                <Button variant="ghost" onClick={() => navigate({ to: "/upload" })}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Annuler
                </Button>
              </div>
            </section>

            {/* Right rail — vertical timeline */}
            <aside className="space-y-5">
              <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Pipeline OCR</h3>
                  <span className="inline-flex items-center gap-1.5 font-mono-data text-[11px] font-semibold text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" /> En cours
                  </span>
                </div>

                <ol className="relative space-y-4">
                  {/* Vertical spine */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                  {/* Étapes *indicatives* : le backend est synchrone et ne remonte
                      aucune progression réelle. On met en avant une étape à la fois
                      par rotation, sans jamais marquer d'étape « terminée » avant
                      la vraie réponse. */}
                  {STEPS.map((s, i) => {
                    const active = i === activeIndex;
                    return (
                      <li key={s.key} className="relative flex items-start gap-3">
                        <div
                          className={cn(
                            "z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-surface-muted text-muted-foreground",
                          )}
                        >
                          {active ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Hourglass className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <div
                            className={cn(
                              "text-sm font-medium leading-tight",
                              active ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {s.label}
                          </div>
                          <div
                            className={cn(
                              "mt-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                              active
                                ? "bg-warning-soft text-warning-foreground"
                                : "bg-secondary text-muted-foreground",
                            )}
                          >
                            {active ? "Analyse en cours…" : "En attente"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border bg-info-soft p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="text-[12px] leading-snug text-foreground/80">
                  <span className="font-semibold text-foreground">Protocole de sécurité :</span>{" "}
                  les données sont cryptées en transit (AES-256). Aucune information biométrique
                  n'est stockée localement après la session.
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-8 shadow-[var(--shadow-card)] text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              L'extraction a échoué
            </h2>
            <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
              {errorMessage}
            </p>
            <ul className="mx-auto mt-5 max-w-sm rounded-md border border-border bg-surface-muted p-4 text-left text-xs text-muted-foreground space-y-1.5">
              <li>· Vérifier que la carte est posée à plat</li>
              <li>· S'assurer que la zone MRZ est intégralement visible</li>
              <li>· Éviter les reflets sur l'hologramme</li>
            </ul>
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button variant="outline" className="h-11" onClick={() => navigate({ to: "/upload" })}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Retour au dépôt
              </Button>
              <Button className="h-11" onClick={handleRetry}>
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
