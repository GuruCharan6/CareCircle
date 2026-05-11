"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  label: string;
  loading?: boolean;
  onClick: () => void;
}

export function PdfDownloadBtn({ label, loading, onClick }: Props) {
  return (
    <Button variant="outline" size="sm" loading={loading} onClick={onClick}>
      <FileDown size={14} />
      {label}
    </Button>
  );
}
