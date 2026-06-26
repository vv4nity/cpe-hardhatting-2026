import QRCode from "qrcode";

/**
 * Render the attendee's pass as a branded PNG and trigger a download.
 * Fully client-side (canvas), so it works in the front-only demo.
 */
export interface PassInfo {
  name: string;
  seat: string;
  block: string;
  id: string;
  statusLabel: string;
  payload: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function downloadPassPng(info: PassInfo): Promise<void> {
  const W = 680;
  const H = 940;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const ink = "#1a1712";
  const cream = "#faf6ee";
  const amber = "#ffbf00";
  const orange = "#fd8602";

  // page background
  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, W, H);

  // ink ticket card
  const m = 36;
  const cardX = m;
  const cardY = m;
  const cardW = W - m * 2;
  const cardH = H - m * 2;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  // hazard stripe along the top of the card
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 16, [32, 32, 0, 0]);
  ctx.clip();
  const stripe = 22;
  for (let x = cardX - cardH; x < cardX + cardW; x += stripe * 2) {
    ctx.fillStyle = amber;
    ctx.beginPath();
    ctx.moveTo(x, cardY);
    ctx.lineTo(x + stripe, cardY);
    ctx.lineTo(x + stripe - 30, cardY + 16);
    ctx.lineTo(x - 30, cardY + 16);
    ctx.fill();
  }
  ctx.restore();

  // header text
  const cx = W / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(249,246,238,0.6)";
  ctx.font = "700 16px Arial";
  ctx.fillText("DIGITAL PASS", cx, cardY + 64);
  ctx.fillStyle = cream;
  ctx.font = "800 40px Arial";
  ctx.fillText("HARDHATTING 2026", cx, cardY + 108);

  // white QR tile
  const tile = 380;
  const tileX = cx - tile / 2;
  const tileY = cardY + 150;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(tileX, tileY, tile, tile, 24);
  ctx.fill();

  const qrUrl = await QRCode.toDataURL(info.payload, {
    margin: 1,
    width: 640,
    color: { dark: "#1a1712ff", light: "#ffffffff" },
    errorCorrectionLevel: "M",
  });
  const qrImg = await loadImage(qrUrl);
  const pad = 28;
  ctx.drawImage(qrImg, tileX + pad, tileY + pad, tile - pad * 2, tile - pad * 2);

  // name + details
  let y = tileY + tile + 64;
  ctx.fillStyle = cream;
  ctx.font = "800 36px Arial";
  ctx.fillText(info.name, cx, y);

  y += 36;
  ctx.fillStyle = "rgba(249,246,238,0.65)";
  ctx.font = "500 20px Arial";
  ctx.fillText(`Seat ${info.seat} · ${info.block}`, cx, y);

  y += 30;
  ctx.fillStyle = orange;
  ctx.font = "700 16px Arial";
  ctx.fillText(`${info.statusLabel.toUpperCase()} · ID ${info.id}`, cx, y);

  // footer
  ctx.fillStyle = "rgba(249,246,238,0.5)";
  ctx.font = "500 16px Arial";
  ctx.fillText(
    "July 1, 2026 · Bulwagang Balagtas",
    cx,
    cardY + cardH - 36,
  );

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `hardhatting2026_pass_${info.id || "guest"}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      resolve();
    }, "image/png");
  });
}
