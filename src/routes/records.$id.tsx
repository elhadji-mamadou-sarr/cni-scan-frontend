import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText, FileJson, History, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/records/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Enregistrement ${params.id} — CNI Scan` },
      { name: "description", content: "Fiche détaillée d'une CNI archivée : champs, images et historique." },
    ],
  }),
  component: RecordDetail,
});

type Row = { label: string; value: string; mono?: boolean };

const RECTO_ROWS: Row[] = [
  { label: "Numéro de la carte", value: "1 234 5678 9012", mono: true },
  { label: "Nom", value: "NDIAYE" },
  { label: "Prénom", value: "Fatou" },
  { label: "Sexe", value: "F" },
  { label: "Taille", value: "1,68 m" },
  { label: "Date de naissance", value: "15/07/1998", mono: true },
  { label: "Lieu de naissance", value: "Rufisque" },
  { label: "Date de délivrance", value: "12/03/2022", mono: true },
  { label: "Date d'expiration", value: "12/03/2032", mono: true },
  { label: "Centre d'enregistrement", value: "Dakar - Plateau" },
  { label: "Adresse du domicile", value: "Sicap Liberté 6, Villa n° 5432" },
];

const VERSO_ROWS: Row[] = [
  { label: "Code pays", value: "SEN", mono: true },
  { label: "Numéro d'électeur", value: "7788221345", mono: true },
  { label: "Région", value: "Dakar" },
  { label: "Département", value: "Dakar" },
  { label: "Arrondissement", value: "Grand Dakar" },
  { label: "Commune", value: "Sicap Liberté" },
  { label: "Lieu de vote", value: "École Élémentaire Liberté 6" },
  { label: "Bureau", value: "04", mono: true },
  { label: "NIN", value: "1 8909 1998 00234", mono: true },
];

const HISTORY = [
  { at: "09 juil. 2026 — 14:32", by: "Aïcha Diop", action: "Extraction OCR initiale" },
  { at: "09 juil. 2026 — 14:33", by: "Aïcha Diop", action: "Correction manuelle : Adresse du domicile" },
  { at: "09 juil. 2026 — 14:34", by: "Aïcha Diop", action: "Validation et enregistrement" },
];

function Row({ label, value, mono }: Row) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-border last:border-b-0">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono-data text-[13px] text-foreground text-right" : "text-sm font-medium text-foreground text-right"}>
        {value}
      </div>
    </div>
  );
}

function CardStub({ side }: { side: "Recto" | "Verso" }) {
  return (
    <div
      className="relative aspect-[1.586/1] w-full overflow-hidden rounded-md border border-border shadow-[var(--shadow-card)]"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.94 0.03 155) 0%, oklch(0.92 0.04 100) 55%, oklch(0.93 0.06 30) 100%)",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.5),transparent_50%)]" />
      <div className="absolute inset-0 p-3 text-[color:oklch(0.22_0.06_255)]">
        <div className="text-[8px] font-semibold uppercase tracking-widest opacity-80">
          République du Sénégal
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wide">
          Carte Nationale d'Identité — {side}
        </div>
      </div>
    </div>
  );
}

function RecordDetail() {
  const { id } = Route.useParams();

  return (
    <AppShell
      breadcrumb={`Enregistrement · ${id}`}
      title="NDIAYE Fatou"
      actions={
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" className="h-10 gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 gap-2">
                <Download className="h-4 w-4" /> Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" /> Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileJson className="h-4 w-4 mr-2" /> Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="mx-auto max-w-[1400px] space-y-6 p-6">
        {/* Header meta */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Numéro de carte
            </div>
            <div className="font-mono-data text-xl font-semibold text-foreground">
              1 234 5678 9012
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">NIN</div>
            <div className="font-mono-data text-sm font-semibold text-foreground">
              1 8909 1998 00234
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Extrait le
            </div>
            <div className="text-sm font-medium text-foreground">09 juil. 2026 — 14:32</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-success-soft text-success border border-success/20 hover:bg-success-soft">
              <ShieldCheck className="h-3 w-3 mr-1" /> Validé
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              Lecture seule
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* Left — images + history */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Images archivées
              </div>
              <div className="grid gap-3">
                <CardStub side="Recto" />
                <CardStub side="Verso" />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Historique</h3>
              </div>
              <ol className="relative space-y-4 border-l border-border pl-4">
                {HISTORY.map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[19px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary ring-4 ring-surface" />
                    <div className="text-sm font-medium text-foreground">{h.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.at} · {h.by}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right — data */}
          <div className="space-y-5">
            <section className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Champs Recto
              </h2>
              <div>
                {RECTO_ROWS.map((r) => (
                  <Row key={r.label} {...r} />
                ))}
              </div>
            </section>
            <section className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Champs Verso</h2>
              <div>
                {VERSO_ROWS.map((r) => (
                  <Row key={r.label} {...r} />
                ))}
              </div>
              <div className="mt-5">
                <div className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  Zone MRZ (ICAO 9303 · TD1)
                </div>
                <pre className="rounded-md bg-surface-muted p-4 font-mono-data text-[13px] leading-relaxed text-foreground overflow-x-auto">
{`IDSEN12345678<9012<<<<<<<<<<<<<
9807152F3203127SEN<<<<<<<<<<<4
NDIAYE<<FATOU<<<<<<<<<<<<<<<<<`}
                </pre>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
