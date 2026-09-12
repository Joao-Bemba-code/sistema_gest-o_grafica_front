"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const FALLBACK_TINTS = [
  "bg-primary/5",
  "bg-secondary/10",
  "bg-warning/10",
  "bg-info/10",
  "bg-success/10",
];

function MediaCard({
  thumbnail,
  alt = "",
  title,
  description,
  tags = [],
  badge,
  badgeVariant = "info",
  price,
  ctaLabel,
  onCta,
  ctaVariant = "default",
  favorite = false,
  onToggleFavorite,
  onShare,
  shared = false,
  gradientIndex = 0,
  className,
}) {
  const [imgError, setImgError] = useState(false);
  const tint = FALLBACK_TINTS[Math.abs(gradientIndex) % FALLBACK_TINTS.length];
  const showImage = thumbnail && !imgError;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-outline-variant/30 bg-card shadow-sm transition-all duration-200 ease-in-out",
        "hover:border-primary/40",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {showImage ? (
          <img
            src={thumbnail}
            alt={alt}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className={cn("flex h-full w-full items-center justify-center", tint)}>
            <Icon name="image" className="text-4xl text-muted-foreground/40" />
          </div>
        )}

        {badge && (
          <Badge
            variant={badgeVariant}
            className="absolute left-3 top-3 border border-outline-variant/40 text-[10px]"
          >
            {badge}
          </Badge>
        )}

        {onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className={cn(
              "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/40 shadow-sm",
              favorite
                ? "bg-white text-error dark:bg-card"
                : "bg-white text-muted-foreground hover:text-error dark:bg-card"
            )}
          >
            <Icon
              name={favorite ? "favorite" : "favorite_border"}
              className="text-lg"
            />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground sm:text-base">
          {title}
        </h3>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge
                key={tag.label}
                variant={tag.variant || "secondary"}
                className="text-[10px]"
              >
                {tag.label}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {price ? (
            <span className="text-base font-bold tracking-tight text-foreground">
              {price}
            </span>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            {ctaLabel && (
              <Button size="sm" variant={ctaVariant} onClick={onCta}>
                {ctaLabel}
                <Icon name="arrow_forward" className="text-sm" />
              </Button>
            )}
            {onShare && (
              <Button
                variant="outline"
                size="icon"
                className={cn("h-9 w-9", shared && "border-success text-success")}
                onClick={onShare}
                aria-label={shared ? "Link copiado" : "Compartilhar"}
              >
                <Icon name={shared ? "check" : "share"} className="text-base" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export { MediaCard };
