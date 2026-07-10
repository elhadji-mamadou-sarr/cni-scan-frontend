import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  FileJson,
  Printer,
  Pencil,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCniDetail } from "@/lib/hooks";
import type { CniDetail, CniRectoOut, CniVersoOut } from "@/lib/types";

export const Route = createFileRoute("/records/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Enregistrement ${params.id} — CNI Scan` },
      { name: "description", content: "Fiche détaillée d'une CNI archivée : champs recto, verso et MRZ." },
    ],
  }),
  component: RecordDetail,
});

type Row = { label: string; value: string; mono?: boolean };

const dash = (v: string | null | undefined) => (v == null || v === "" ? "—" : v);

function rectoRows(r: CniRectoOut): Row[] {
  return [
    { label: "Numéro de la carte", value: dash(r.numero_cni), mono: true },
    { label: "Nom", value: dash(r.nom) },
    { label: "Prénom", value: dash(r.prenom) },
    { label: "Sexe", value: dash(r.sexe) },
    { label: "Taille", value: r.taille != null ? `${r.taille} m` : "—", mono: true },
    { label: "Lieu de naissance", value: dash(r.lieu_naissance) },
    { label: "Date de délivrance", value: dash(r.date_delivrance), mono: true },
    { label: "Date d'expiration", value: dash(r.date_expiration), mono: true },
    { label: "Centre d'enregistrement", value: dash(r.centre_enregistrement) },
    { label: "Adresse du domicile", value: dash(r.adresse_domicile) },
  ];
}

function versoRows(v: CniVersoOut): Row[] {
  return [
    { label: "Code pays", value: dash(v.code_pays), mono: true },
    { label: "Numéro d'électeur", value: dash(v.numero_electeur), mono: true },
    { label: "Région", value: dash(v.region) },
    { label: "Département", value: dash(v.departement) },
    { label: "Arrondissement", value: dash(v.arrondissement) },
    { label: "Commune", value: dash(v.commune) },
    { label: "Lieu de vote", value: dash(v.lieu_vote) },
    { label: "Bureau", value: dash(v.bureau), mono: true },
    { label: "NIN", value: dash(v.nin), mono: true },
  ];
}

function Row({ label, value, mono }: Row) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={
          mono
            ? "font-mono-data text-right text-[13px] text-foreground"
            : "text-right text-sm font-medium text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}

function downloadJson(id: string, detail: CniDetail) {
  const blob = new Blob([JSON.stringify(detail, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cni-${id}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function RecordDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useCniDetail(id);

  if (isLoading) {
    return (
      <AppShell breadcrumb={`Enregistrement · ${id}`} title="Chargement…">
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la fiche…
        </div>
      </AppShell>
    );
  }

  if (isError || !data) {
    return (
      <AppShell breadcrumb={`Enregistrement · ${id}`} title="Fiche introuvable">
        <div className="mx-auto max-w-md p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {isError ? error.message : "Cette carte n'existe pas."}
          </p>
          <Link to="/">
            <Button className="mt-6">Retour au tableau de bord</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const { recto, verso } = data;
  const fullName = [recto.nom, recto.prenom].filter(Boolean).join(" ") || recto.numero_cni;
  const mrzLines = [verso.mrz_ligne1, verso.mrz_ligne2, verso.mrz_ligne3].filter(
    (l): l is string => Boolean(l),
  );

  return (
    <AppShell
      breadcrumb={`Enregistrement · ${id}`}
      title={fullName}
      actions={
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" className="h-10 gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          </Link>
          <Button
            variant="outline"
            className="h-10 gap-1.5"
            onClick={() => navigate({ to: "/verify/$numero", params: { numero: recto.numero_cni } })}
          >
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 gap-2">
                <Download className="h-4 w-4" /> Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadJson(id, data)}>
                <FileJson className="h-4 w-4 mr-2" /> Télécharger le JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Imprimer / PDF
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
              {recto.numero_cni}
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">NIN</div>
            <div className="font-mono-data text-sm font-semibold text-foreground">
              {dash(verso.nin)}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="border border-success/20 bg-success-soft text-success hover:bg-success-soft">
              <ShieldCheck className="mr-1 h-3 w-3" /> Enregistrée
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Champs Recto</h2>
            <div>
              {rectoRows(recto).map((r) => (
                <Row key={r.label} {...r} />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Champs Verso</h2>
            <div>
              {versoRows(verso).map((r) => (
                <Row key={r.label} {...r} />
              ))}
            </div>
            <div className="mt-5">
              <div className="mb-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                Zone MRZ (ICAO 9303 · TD1)
              </div>
              <pre className="overflow-x-auto rounded-md bg-surface-muted p-4 font-mono-data text-[13px] leading-relaxed text-foreground">
                {mrzLines.length > 0 ? mrzLines.join("\n") : "— MRZ non disponible —"}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
