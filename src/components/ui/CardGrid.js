import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

const COLS = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const GAPS = {
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
};

function CardGrid({
  columns = 4,
  gap = 6,
  stagger = 80,
  animate = true,
  className,
  itemClassName,
  children,
}) {
  return (
    <div className={cn("grid grid-cols-1", COLS[columns] || COLS[4], GAPS[gap] || GAPS[6], className)}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        if (!animate) return child;
        return cloneElement(child, {
          className: cn(child.props.className, "animate-card-in h-full", itemClassName),
          style: { ...child.props.style, "--stagger": `${index * stagger}ms` },
        });
      })}
    </div>
  );
}

export { CardGrid };
