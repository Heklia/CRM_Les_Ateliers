"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteSubmitButton({
  confirmMessage,
  label = "Supprimer"
}: {
  confirmMessage: string;
  label?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
      variant="secondary"
    >
      <Trash2 size={16} />
      {pending ? "Suppression..." : label}
    </Button>
  );
}
