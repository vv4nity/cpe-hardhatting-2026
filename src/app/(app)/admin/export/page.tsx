"use client";

import { Download } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ExportPage() {
  const exportData = useApp((s) => s.exportData);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="EXPORT ATTENDANCE"
        subtitle="Download the current attendance snapshot as a CSV file."
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Attendance export
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Export the current attendance roster for reporting, backup, or sharing with your team.
              </p>
            </div>
            <Button size="lg" onClick={exportData}>
              <Download className="size-4" />
              Export attendance CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
