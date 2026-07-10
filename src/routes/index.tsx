import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  MapPin,
  Layers,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  MoreHorizontal,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCnis, useHealth, useStats } from "@/lib/hooks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — CNI Scan" },
      {
        name: "description",
        content: "Suivi des cartes nationales d'identité traitées, statistiques et recherche.",
      },
    ],
  }),
  component: Dashboard,
});

const PAGE_SIZE = 10;

function KpiCard({
  label,
  value,
  hint,
  accent,
  Icon,
}: {
  label: string;
  value: string;
  hint: string;
  accent: "primary" | "success" | "warning";
  Icon: typeof MapPin;
}) {
  const accentBar =
    accent === "success" ? "bg-success" : accent === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className={`absolute left-0 top-0 h-full w-1 ${accentBar}`} />
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const health = useHealth();
  const stats = useStats();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Recherche débouncée (300 ms) ; toute nouvelle recherche revient page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const offset = page * PAGE_SIZE;
  const cnis = useCnis({ offset, limit: PAGE_SIZE, search });

  const items = cnis.data?.items ?? [];
  const total = cnis.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const backendDown = health.isError;
  const backendDegraded = health.data?.status === "degraded";

  const topRegion = stats.data?.repartition_par_region[0];
  const statValue = (v: number | undefined) => (stats.isLoading ? "…" : String(v ?? 0));

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
        {/* Bandeau backend injoignable / dégradé */}
        {(backendDown || backendDegraded) && (
          <div className="flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {backendDown
              ? "Impossible de joindre le serveur. Vérifiez que le backend est démarré."
              : "Service dégradé : la base de données ou le moteur OCR est indisponible."}
          </div>
        )}

        {/* KPIs */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Total des cartes"
            value={statValue(stats.data?.total_cartes)}
            hint="Cartes enregistrées en base"
            accent="primary"
            Icon={Layers}
          />
          <KpiCard
            label="Traitées aujourd'hui"
            value={statValue(stats.data?.cartes_aujourd_hui)}
            hint="Depuis minuit"
            accent="success"
            Icon={CalendarClock}
          />
          <KpiCard
            label="Régions couvertes"
            value={statValue(stats.data?.repartition_par_region.length)}
            hint="Réparties sur le territoire"
            accent="primary"
            Icon={MapPin}
          />
          <KpiCard
            label="Région principale"
            value={stats.isLoading ? "…" : (topRegion?.region ?? "—")}
            hint={topRegion ? `${topRegion.count} carte${topRegion.count > 1 ? "s" : ""}` : "Aucune donnée"}
            accent="warning"
            Icon={MapPin}
          />
        </section>

        {/* Table */}
        <section className="rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Enregistrements</h2>
              <p className="text-xs text-muted-foreground">
                {cnis.isLoading ? "Chargement…" : `${total} carte${total > 1 ? "s" : ""} au total`}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Numéro, nom, prénom…"
                  className="h-10 w-64 pl-9 bg-surface-muted"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground">
                    N° de carte
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    Nom
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    Prénom
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    Sexe
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    Expiration
                  </TableHead>
                  <TableHead className="w-16 pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cnis.isLoading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j} className={j === 0 ? "pl-6" : ""}>
                          <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-secondary" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : cnis.isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-danger">
                      <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                      {cnis.error.message}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center text-sm text-muted-foreground">
                      <Inbox className="mx-auto mb-2 h-7 w-7 text-muted-foreground/60" />
                      {search
                        ? `Aucune carte ne correspond à « ${search} ».`
                        : "Aucune carte enregistrée pour l'instant."}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((r) => (
                    <TableRow
                      key={r.numero_cni}
                      className="cursor-pointer border-border hover:bg-surface-muted/60"
                      onClick={() => navigate({ to: "/records/$id", params: { id: r.numero_cni } })}
                    >
                      <TableCell className="pl-6 font-mono-data text-[13px] text-foreground">
                        {r.numero_cni}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {r.nom ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.prenom ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.sexe ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono-data text-[13px] text-muted-foreground">
                        {r.date_expiration ?? "—"}
                      </TableCell>
                      <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to="/records/$id" params={{ id: r.numero_cni }}>
                                <Eye className="h-4 w-4 mr-2" /> Voir le détail
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/verify/$numero" params={{ numero: r.numero_cni }}>
                                <Pencil className="h-4 w-4 mr-2" /> Éditer
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-border p-4">
            <div className="text-xs text-muted-foreground">
              {total > 0
                ? `Page ${page + 1} sur ${pageCount} · ${items.length} affichée${items.length > 1 ? "s" : ""}`
                : "—"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                disabled={page === 0 || cnis.isLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1"
                disabled={page + 1 >= pageCount || cnis.isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
