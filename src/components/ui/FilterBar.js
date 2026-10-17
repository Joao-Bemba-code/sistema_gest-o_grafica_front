"use client";

import { useState, useMemo } from "react";
import Icon from "@/components/Icon";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export function useFilter({ items = [], searchFields = [], filterConfig = [], sortOptions = [] }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [sortBy, setSortBy] = useState(sortOptions[0]?.value || "");

  const filtered = useMemo(() => {
    let result = [...items];

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = field.split(".").reduce((o, k) => o?.[k], item);
          return String(val || "").toLowerCase().includes(term);
        })
      );
    }

    if (activeFilter !== "todos") {
      const cfg = filterConfig.find((f) => f.value === activeFilter);
      if (cfg?.predicate) {
        result = result.filter(cfg.predicate);
      } else if (cfg?.field) {
        result = result.filter((item) => item[cfg.field] === activeFilter);
      }
    }

    if (sortBy) {
      const opt = sortOptions.find((s) => s.value === sortBy);
      if (opt?.compare) {
        result.sort(opt.compare);
      } else if (opt?.field) {
        result.sort((a, b) => {
          const av = a[opt.field], bv = b[opt.field];
          if (opt.dir === "desc") return av > bv ? -1 : av < bv ? 1 : 0;
          return av < bv ? -1 : av > bv ? 1 : 0;
        });
      }
    }

    return result;
  }, [items, search, activeFilter, sortBy, searchFields, filterConfig, sortOptions]);

  return { search, setSearch, activeFilter, setActiveFilter, sortBy, setSortBy, filtered, total: filtered.length };
}

// Barra de filtros no modelo da referência:
// [Filtros como pills segmentados] · [busca] · [ordenação] · [Limpar]
export default function FilterBar({
  search,
  onSearchChange,
  placeholder = "Pesquisar...",
  filters = [],
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
  sortOptions = [],
  count,
  countLabel = "registos",
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Pills segmentados (todos + filtros) */}
        {filters.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5"
            role="group"
            aria-label="Filtros"
          >
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => onFilterChange(f.value)}
                aria-pressed={activeFilter === f.value}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  activeFilter === f.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.icon && <Icon name={f.icon} className="text-sm" />}
                {f.label}
                {f.count !== undefined && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] tabular-nums",
                      activeFilter === f.value ? "bg-muted" : "bg-muted/70"
                    )}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {/* Busca */}
          <div className="w-full min-w-40 sm:w-64">
            <Input
              icon="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="h-10 rounded-lg text-xs"
            />
          </div>

          {/* Ordenação */}
          {sortOptions.length > 0 && (
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                aria-label="Ordenar por"
                className="h-10 appearance-none rounded-lg border border-border bg-card pl-3 pr-8 text-xs font-medium text-foreground outline-none transition hover:bg-muted focus:border-primary cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Icon
                name="unfold_more"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
              />
            </div>
          )}

          {/* Limpar */}
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Limpar
            </button>
          )}

          {count !== undefined && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {count} {countLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
