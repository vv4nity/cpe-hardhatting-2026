"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ImportPage() {
  const runImport = useApp((s) => s.runImport);
  const sampleCsv = useApp((s) => s.sampleCsv);
  const exportData = useApp((s) => s.exportData);
  const importActive = useApp((s) => s.importActive);
  const importStage = useApp((s) => s.importStage);
  const importPct = useApp((s) => s.importPct);
  const importDone = useApp((s) => s.importDone);
  const importValid = useApp((s) => s.importValid);
  const importErrors = useApp((s) => s.importErrors);
  const importTotal = useApp((s) => s.importTotal);

  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="IMPORT & EXPORT"
        subtitle="Bulk-load attendee records or download the latest attendance data."
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* import */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Import attendees
            </h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                runImport();
              }}
              onClick={() => runImport()}
              className={cn(
                "mt-4 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
                dragOver
                  ? "border-brand-orange bg-brand-amber/10"
                  : "border-border bg-secondary/30 hover:border-brand-orange/60",
              )}
            >
              <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-brand-ink text-brand-amber">
                <UploadCloud className="size-7" />
              </span>
              <div className="font-semibold">
                {dragOver ? "Drop to upload" : "Drag & drop CSV / Excel here"}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                or click to browse — up to 500 attendee records
              </div>
            </div>

            {importActive && (
              <div className="mt-5 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <FileUp className="size-4 text-brand-orange" />
                    {importStage}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {importPct}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-brand-orange transition-all duration-500"
                    style={{ width: importPct }}
                  />
                </div>

                {importDone && (
                  <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <Stat
                      icon={<CheckCircle2 className="size-4 text-brand-green" />}
                      value={importValid}
                      label="Valid"
                    />
                    <Stat
                      icon={<TriangleAlert className="size-4 text-brand-red" />}
                      value={importErrors}
                      label="Errors"
                    />
                    <Stat value={importTotal} label="Total rows" />
                  </div>
                )}
              </div>
            )}

            <Button variant="outline" className="mt-4" onClick={sampleCsv}>
              <FileSpreadsheet />
              Download sample CSV
            </Button>
          </CardContent>
        </Card>

        {/* export */}
        <Card>
          <CardContent className="flex h-full flex-col p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Export attendance
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Download the current attendance snapshot — including check-in times
              and scanner — as a CSV for reporting or archiving.
            </p>

            <ul className="mt-4 space-y-2 text-sm">
              {[
                "Attendee ID, name & email",
                "Block & seat assignment",
                "Status, check-in time & gate",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-brand-green" />
                  {t}
                </li>
              ))}
            </ul>

            <Button className="mt-auto" size="lg" onClick={exportData}>
              <Download />
              Export attendance CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon?: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 py-3">
      <div className="flex items-center justify-center gap-1.5 font-display text-2xl">
        {icon}
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
