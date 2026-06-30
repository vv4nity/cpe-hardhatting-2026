import { checkinHtml } from "@/lib/email/checkin";

export const dynamic = "force-dynamic";

function renderPreviewHtml(html: string) {
  const assets: Record<string, string> = {
    "cid:cover": "/main%20cover%20landscape.jpg",
    "cid:icPin": "/email/ic-pin.png",
    "cid:icClock": "/email/ic-clock.png",
    "cid:access": "/access.png",
    "cid:cpedept": "/cpe%20dept%20logo.png",
    "cid:icpep": "/icpep.png",
  };

  return Object.entries(assets).reduce(
    (currentHtml, [cid, url]) => currentHtml.replaceAll(cid, url),
    html,
  );
}

export default function CheckinEmailPreviewPage() {
  const html = renderPreviewHtml(checkinHtml("Emanuel Jabon", "A01", "A", "8:15 PM"));

  return (
    <main style={{ padding: 24, background: "#f5efe4", minHeight: "100vh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>Check-in email preview</h1>
        <p style={{ marginBottom: 16, color: "#5f574a" }}>
          This renders the same branded HTML used for the check-in confirmation email.
        </p>
        <div
          style={{ border: "1px solid #e2d8c6", borderRadius: 16, overflow: "hidden", background: "white" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </main>
  );
}
