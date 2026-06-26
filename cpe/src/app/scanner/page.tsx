"use client";

import { AuthGate } from "@/components/app/auth-gate";
import { ScannerScreen } from "@/components/scanner/scanner-screen";

export default function ScannerPage() {
  return (
    <AuthGate roles={["scanner"]}>
      <ScannerScreen />
    </AuthGate>
  );
}
