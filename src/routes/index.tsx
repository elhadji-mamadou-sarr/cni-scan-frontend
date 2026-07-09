import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Plus,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfidenceDot } from "@/components/confidence-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — CNI Scan" },
      {
        name: "description",
        content: "Suivi des cartes nationales d'identité traitées, taux d'extraction et files de vérification.",
      },
    ],
  }),
  component: Dashboard,
});

type Status = "validated" | "pending" | "rejected";

const RECORDS: {
  id: string;
  cardNumber: string;
  lastName: string;
  firstName: string;
  region: string;
  date: string;
  operator: string;
  status: Status;
  confidence: "high" | "medium" | "low";
}[] = [
  {
    id: "R-2039",
    cardNumber: "1 234 5678 9012",
    lastName: "NDIAYE",
    firstName: "Fatou",
    region: "Dakar",
    date: "09 juil. 2026 — 14:32",
    operator: "A. Diop",
    status: "pending",
    confidence: "medium",
  },
  {
    id: "R-2038",
    cardNumber: "2 998 1123 4501",
    lastName: "SARR",
    firstName: "Ousmane",
    region: "Thiès",
    date: "09 juil. 2026 — 14:18",
    operator: "A. Diop",
    status: "validated",
    confidence: "high",
  },
  {
    id: "R-2037",
    cardNumber: "1 876 5432 1098",
    lastName: "FALL",
    firstName: "Mariama",
    region: "Saint-Louis",
    date: "09 juil. 2026 — 13:55",
    operator: "M. Ba",
    status: "validated",
    confidence: "high",
  },
  {
    id: "R-2036",
    cardNumber: "—",
    lastName: "—",
    firstName: "—",
    region: "—",
    date: "09 juil. 2026 — 13:41",
    operator: "M. Ba",
    status: "rejected",
    confidence: "low",
  },
  {
    id: "R-2035",
    cardNumber: "1 543 2109 8765",
    lastName: "DIALLO",
    firstName: "Ibrahima",
    region: "Kaolack",
    date: "09 juil. 2026 — 13:22",
    operator: "A. Diop",
    status: "pending",
    confidence: "medium",
  },
  {
    id: "R-2034",
    cardNumber: "2 210 3456 7890",
    lastName: "SOW",
    firstName: "Aminata",
    region: "Ziguinchor",
    date: "09 juil. 2026 — 12:47",
    operator: "M. Ba",
    status: "validated",
    confidence: "high",
  },
  {
    id: "R-2033",
    cardNumber: "1 998 8776 6554",
    lastName: "GUEYE",
    firstName: "Mamadou",
    region: "Diourbel",
    date: "09 juil. 2026 — 12:11",
    operator: "S. Ndiaye",
    status: "validated",
    confidence: "high",
  },
  {
    id: "R-2032",
    cardNumber: "1 665 4433 2211",
    lastName: "SECK",
    firstName: "Awa",
    region: "Louga",
    date: "09 juil. 2026 — 11:38",
    operator: "S. Ndiaye",
    status: "pending",
    confidence: "medium",
  },
];

function StatusBadge({ status }: { status: Status }) {
  if (status === "validated")
    return (
      <Badge className="bg-success-soft text-success border border-success/20 hover:bg-success-soft font-medium">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Validé
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge className="bg-warning-soft text-warning-foreground border border-warning/30 hover:bg-warning-soft font-medium">
        <Clock className="h-3 w-3 mr-1" />
        À vérifier
      </Badge>
    );
  return (
    <Badge className="bg-danger-soft text-danger border border-danger/25 hover:bg-danger-soft font-medium">
      <XCircle className="h-3 w-3 mr-1" />
      Rejeté
    </Badge>
  );
}

function KpiCard({
  label,
  value,
  hint,
  trend,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  trend?: string;
  accent: "primary" | "success" | "warning";
}) {
  const accentBar =
    accent === "success"
      ? "bg-success"
      : accent === "warning"
        ? "bg-warning"
        : "bg-primary";
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} />
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-end gap-3">
        <div className="text-3xl font-semibold tracking-tight text-foreground">{value}</div>
        {trend && (
          <div className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-success">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </div>
        )}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Dashboard() {
  const [status, setStatus] = useState<string>("all");
  const filtered = status === "all" ? RECORDS : RECORDS.filter((r) => r.status === status);

  return (
    <AppShell
      breadcrumb="Espace opérateur"
      title="Tableau de bord"
      actions={
        <Link to="/upload">
          <Button className="h-10 gap-2">
            <Plus className="h-4 w-4" /> Nouvelle numérisation
          </Button>
        </Link>
      }
    >
      <div className="mx-auto max-w-[1400px] space-y-6 p-6">
        {/* KPIs */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Cartes traitées aujourd'hui"
            value="42"
            hint="Cible quotidienne : 60"
            trend="+18%"
            accent="primary"
          />
          <KpiCard
            label="Taux d'extraction réussie"
            value="94,3 %"
            hint="Moyenne 7 derniers jours"
            trend="+2,1 pts"
            accent="success"
          />
          <KpiCard
            label="En attente de vérification"
            value="7"
            hint="Champs à confiance moyenne"
            accent="warning"
          />
          <KpiCard
            label="Rejets"
            value="3"
            hint="Images illisibles ou incomplètes"
            accent="warning"
          />
        </section>

        {/* Table card */}
        <section className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Enregistrements récents</h2>
              <p className="text-xs text-muted-foreground">
                {filtered.length} résultats sur {RECORDS.length}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Numéro, nom, prénom…"
                  className="h-10 w-64 pl-9 bg-surface-muted"
                />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 w-44 bg-surface-muted">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="validated">Validés</SelectItem>
                  <SelectItem value="pending">À vérifier</SelectItem>
                  <SelectItem value="rejected">Rejetés</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all-regions">
                <SelectTrigger className="h-10 w-40 bg-surface-muted">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-regions">Toutes régions</SelectItem>
                  <SelectItem value="dakar">Dakar</SelectItem>
                  <SelectItem value="thies">Thiès</SelectItem>
                  <SelectItem value="saint-louis">Saint-Louis</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-10 gap-2">
                <Filter className="h-4 w-4" /> Filtres
              </Button>
              <Button variant="outline" size="sm" className="h-10 gap-2">
                <Download className="h-4 w-4" /> Exporter
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-24 pl-6 text-xs uppercase tracking-wider text-muted-foreground">
                  ID
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  N° de carte
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Identité
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Région
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Date d'extraction
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Opérateur
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                  Statut
                </TableHead>
                <TableHead className="w-16 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="border-border hover:bg-surface-muted/60">
                  <TableCell className="pl-6 font-mono-data text-xs text-muted-foreground">
                    {r.id}
                  </TableCell>
                  <TableCell className="font-mono-data text-[13px] text-foreground">
                    {r.cardNumber}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ConfidenceDot level={r.confidence} />
                      <div className="leading-tight">
                        <div className="text-sm font-medium text-foreground">
                          {r.lastName} {r.firstName}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.region}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.date}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.operator}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          aria-label="Actions sur l'enregistrement"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/records/$id" params={{ id: r.id }}>
                            <Eye className="h-4 w-4 mr-2" /> Voir le détail
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/verify">
                            <Pencil className="h-4 w-4 mr-2" /> Éditer
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-danger focus:text-danger">
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-border p-4">
            <div className="text-xs text-muted-foreground">
              Page 1 sur 24 · 8 résultats affichés
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <ChevronLeft className="h-4 w-4" /> Précédent
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                Suivant <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
