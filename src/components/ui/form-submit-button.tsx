"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

type FormSubmitButtonProps = {
  idleText: string;
  pendingText?: string;
  variant?: "default" | "outline" | "destructive";
};

export function FormSubmitButton({
  idleText,
  pendingText = "Guardando...",
  variant = "default",
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingText : idleText}
    </Button>
  );
}

