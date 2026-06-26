import QRCode from "qrcode";

/**
 * Render the attendee's pass as a high-resolution PNG that mirrors the on-screen
 * My QR ticket (landscape hero, Admission Pass badge, attendee details,
 * perforated divider, QR stub). Fully client-side via canvas.
 */
export interface PassInfo {
  name: string;
  email: string;
  initials: string;
  seat: string;
  block: string;
  id: string;
  statusLabel: string;
  payload: string;
}

const COLORS = {
  cream: "#faf6ee",
  card: "#fffdf8",
  ink: "#1a1712",
  muted: "#8a7e60",
  amber: "#ffbf00",
  border: "#e4d9bf",
  secondary: "#efe6d2",
  white: "#ffffff",
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function brandFonts() {
  const cs = getComputedStyle(document.documentElement);
  const league = cs.getPropertyValue("--font-league").trim();
  const hanken = cs.getPropertyValue("--font-hanken").trim();
  return {
    display: league
      ? `${league}, "Arial Narrow", sans-serif`
      : "'Arial Narrow', Impact, sans-serif",
    sans: hanken ? `${hanken}, Arial, sans-serif` : "Arial, sans-serif",
  };
}

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

export async function downloadPassPng(info: PassInfo): Promise<void> {
  await (document.fonts?.ready ?? Promise.resolve());
  const f = brandFonts();

  // logical layout (multiplied by `scale` for a crisp export)
  const scale = 3;
  const W = 480;
  const M = 22; // page margin around the ticket
  const cardX = M;
  const cardY = M;
  const cardW = W - M * 2;
  const padX = cardX + 22;
  const innerW = cardW - 44;
  const cx = cardX + cardW / 2;

  const heroH = Math.round(cardW * (18 / 41)); // landscape cover is 41:18

  const attY = cardY + heroH + 20;
  const avatarR = 26;
  const detailsY = attY + avatarR * 2 + 18;
  const detailH = 50;
  const perfY = detailsY + detailH + 22;
  const qrLabelY = perfY + 24;
  const tileSize = 210;
  const tileY = qrLabelY + 16;
  const codeY = tileY + tileSize + 26;
  const cardBottom = codeY + 18;
  const cardH = cardBottom - cardY;
  const H = cardBottom + M;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // page background
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, W, H);

  // card
  ctx.save();
  ctx.shadowColor = "rgba(26,23,18,0.18)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = COLORS.card;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 26);
  ctx.fill();
  ctx.restore();

  // hero image
  const hero = await loadImage("/main cover landscape.jpg");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, heroH, [26, 26, 0, 0]);
  ctx.clip();
  ctx.drawImage(hero, cardX, cardY, cardW, heroH);
  const grad = ctx.createLinearGradient(0, cardY + heroH / 2, 0, cardY + heroH);
  grad.addColorStop(0, "rgba(26,23,18,0)");
  grad.addColorStop(1, "rgba(26,23,18,0.6)");
  ctx.fillStyle = grad;
  ctx.fillRect(cardX, cardY + heroH / 2, cardW, heroH / 2);
  ctx.restore();

  // ADMISSION PASS badge (top-right of hero)
  ctx.font = `700 11px ${f.sans}`;
  const badgeText = "ADMISSION PASS";
  const bw = ctx.measureText(badgeText).width + 22;
  const bx = cardX + cardW - 14 - bw;
  const by = cardY + 14;
  ctx.fillStyle = COLORS.amber;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, 22, 11);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, bx + bw / 2, by + 15);

  // avatar
  const avX = padX + avatarR;
  const avY = attY + avatarR;
  ctx.fillStyle = COLORS.secondary;
  ctx.beginPath();
  ctx.arc(avX, avY, avatarR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.muted;
  ctx.font = `700 20px ${f.sans}`;
  ctx.textAlign = "center";
  ctx.fillText(info.initials || "··", avX, avY + 7);

  // name + email
  const textX = padX + avatarR * 2 + 14;
  const textMax = cardX + cardW - 22 - textX;
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.ink;
  ctx.font = `400 26px ${f.display}`;
  ctx.fillText(truncate(ctx, info.name, textMax), textX, avY - 1);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 13px ${f.sans}`;
  ctx.fillText(truncate(ctx, info.email, textMax), textX, avY + 17);

  // detail boxes
  const boxGap = 8;
  const boxW = (innerW - boxGap * 2) / 3;
  const details = [
    { label: "ID", value: info.id },
    { label: "SEAT", value: info.seat },
    { label: "BLOCK", value: info.block },
  ];
  details.forEach((d, i) => {
    const x = padX + i * (boxW + boxGap);
    ctx.fillStyle = COLORS.card;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, detailsY, boxW, detailH, 11);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 9px ${f.sans}`;
    ctx.fillText(d.label, x + 11, detailsY + 19);
    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 14px ${f.sans}`;
    ctx.fillText(truncate(ctx, d.value, boxW - 22), x + 11, detailsY + 37);
  });

  // perforation: notches + dashed line
  ctx.fillStyle = COLORS.cream;
  ctx.beginPath();
  ctx.arc(cardX, perfY, 10, 0, Math.PI * 2);
  ctx.arc(cardX + cardW, perfY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(cardX + 24, perfY);
  ctx.lineTo(cardX + cardW - 24, perfY);
  ctx.stroke();
  ctx.setLineDash([]);

  // QR stub label
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.muted;
  ctx.font = `700 10px ${f.sans}`;
  ctx.fillText("SCAN AT THE GATE", cx, qrLabelY + 4);

  // QR tile
  const tileX = cx - tileSize / 2;
  ctx.fillStyle = COLORS.white;
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(tileX, tileY, tileSize, tileSize, 22);
  ctx.fill();
  ctx.stroke();

  const qrUrl = await QRCode.toDataURL(info.payload, {
    margin: 1,
    width: 660,
    color: { dark: "#1a1712ff", light: "#ffffffff" },
    errorCorrectionLevel: "M",
  });
  const qrImg = await loadImage(qrUrl);
  const qrPad = 22;
  ctx.drawImage(
    qrImg,
    tileX + qrPad,
    tileY + qrPad,
    tileSize - qrPad * 2,
    tileSize - qrPad * 2,
  );

  // pass code
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 11px ui-monospace, "Courier New", monospace`;
  ctx.fillText(`Pass code: ${info.payload}`, cx, codeY);

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
