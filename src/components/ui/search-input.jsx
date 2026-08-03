import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Text input with a leading search icon — use for filter/search fields app-wide.
 */
export function SearchInput({
  className,
  inputClassName,
  value,
  onChange,
  placeholder = "Search…",
  ...props
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn("h-9 pl-8", inputClassName)}
        {...props}
      />
    </div>
  );
}
