"use client";

import { useState, useMemo } from "react";
import Icon from "@/components/Icon";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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

export default function FilterBar({ search, onSearchChange, placeholder = "Pesquisar...", filters = [], activeFilter, onFilterChange, sortBy, onSortChange, sortOptions = [], count, countLabel = "registos" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            icon="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="h-9 text-xs"
          />
        </div>

        {sortOptions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Icon name="sort" className="text-sm text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {count !== undefined && (
          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {count} {countLabel}
          </span>
        )}
      </div>

      {filters.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilterChange(f.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                activeFilter === f.value
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.icon && <Icon name={f.icon} className="text-xs" />}
              {f.label}
              {f.count !== undefined && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] ${activeFilter === f.value ? "bg-primary/20" : "bg-muted"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {search && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSearchChange("")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:text-foreground hover:bg-accent transition-colors"
          >
            <Icon name="close" className="text-xs" /> Limpar busca
          </button>
        </div>
      )}
    </div>
  );
}
