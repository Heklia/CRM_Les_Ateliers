"use client";

import { Circle, Star, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { updateProspectCategory } from "@/app/prospects/[id]/actions";
import { prospectCategoryLabels } from "@/lib/constants";
import type { ProspectCategory } from "@/lib/types";

const categories = [
  { value: "favori", icon: Star, className: "text-amber-500 hover:border-amber-300 hover:bg-amber-50" },
  { value: "standard", icon: Circle, className: "text-muted hover:bg-background" },
  { value: "a_ecarter", icon: XCircle, className: "text-red-600 hover:border-red-200 hover:bg-red-50" }
] as const;

export function ProspectCategoryForm({
  prospectId,
  category,
  compact = false,
  disabled = false
}: {
  prospectId: string;
  category: ProspectCategory;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <form action={updateProspectCategory}>
      <input name="prospect_id" type="hidden" value={prospectId} />
      <div className="inline-flex items-center gap-1 rounded-md border border-border bg-white p-1">
        {categories.map((item) => {
          const Icon = item.icon;
          const active = item.value === category;

          return (
            <CategoryButton
              active={active}
              category={item.value}
              className={item.className}
              compact={compact}
              disabled={disabled}
              key={item.value}
            >
              <Icon size={compact ? 15 : 17} />
            </CategoryButton>
          );
        })}
      </div>
    </form>
  );
}

function CategoryButton({
  active,
  category,
  children,
  className,
  compact,
  disabled
}: {
  active: boolean;
  category: ProspectCategory;
  children: ReactNode;
  className: string;
  compact: boolean;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={prospectCategoryLabels[category]}
      className={`inline-flex items-center justify-center rounded-md border text-sm transition disabled:opacity-60 ${
        compact ? "size-8" : "size-9"
      } ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : `border-transparent ${className}`
      }`}
      disabled={pending || disabled}
      name="category"
      title={prospectCategoryLabels[category]}
      type="submit"
      value={category}
    >
      {children}
    </button>
  );
}
