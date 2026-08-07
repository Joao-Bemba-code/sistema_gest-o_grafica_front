import { cn } from "@/lib/utils";

function Card({ className, ...props }) {
  return (
    <div
      className={cn("rounded-xl border border-outline-variant/30 bg-card text-card-foreground shadow-sm transition-shadow duration-200 hover:border-outline-variant/50", className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn("text-sm sm:text-base font-semibold leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return (
    <div className={cn("p-5 sm:p-6 pt-0 sm:pt-0", className)} {...props} />
  );
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex items-center p-5 sm:p-6 pt-0 sm:pt-0",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };