import "server-only";
import fs from "fs";
import jwt from "jsonwebtoken";

/**
 * Google Wallet "Add to Wallet" link builder. Signs a save JWT (with the
 * issuer's service-account key) that carries an inline generic class + the
 * attendee's pass object, so no separate API setup call is needed. Returns
 * a https://pay.google.com/gp/v/save/<jwt> URL.
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function parseSA(raw: string): ServiceAccount | null {
  try {
    const json = JSON.parse(raw);
    if (!json.client_email || !json.private_key) return null;
    return { client_email: json.client_email, private_key: json.private_key };
  } catch {
    return null;
  }
}

/**
 * Loads the service-account key from (in order): a base64 env var, a raw-JSON
 * env var, or a local file path. The env-var forms work on hosts like Vercel
 * where the gitignored key file isn't deployed.
 */
function loadServiceAccount(): ServiceAccount | null {
  const b64 = process.env.GOOGLE_WALLET_SA_KEY_B64;
  if (b64) {
    const sa = parseSA(Buffer.from(b64, "base64").toString("utf8"));
    if (sa) return sa;
  }
  const inline = process.env.GOOGLE_WALLET_SA_JSON;
  if (inline) {
    const sa = parseSA(inline);
    if (sa) return sa;
  }
  const file = process.env.GOOGLE_WALLET_SA_KEY_FILE;
  if (file) {
    try {
      return parseSA(fs.readFileSync(file, "utf8"));
    } catch {
      return null;
    }
  }
  return null;
}

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID;
const CLASS_SUFFIX = "cpe_hardhatting_2026";

export const isGoogleWalletConfigured =
  !!ISSUER_ID && !!loadServiceAccount();

export interface PassUser {
  id: string;
  name: string;
  seat?: string | null;
  block?: string | null;
}

/** Object/class id segments must be [A-Za-z0-9._-]. */
const safeId = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, "");

export function buildGoogleWalletSaveUrl(
  user: PassUser,
  payload: string,
  origin: string,
): string {
  const sa = loadServiceAccount();
  if (!sa || !ISSUER_ID) throw new Error("Google Wallet is not configured");

  const classId = `${ISSUER_ID}.${CLASS_SUFFIX}`;
  const objectId = `${ISSUER_ID}.${safeId(user.id)}`;
  const httpsOrigin = origin.startsWith("https://") ? origin : null;

  const genericClass = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [
                    { fieldPath: "object.textModulesData['seat']" },
                  ],
                },
              },
              endItem: {
                firstValue: {
                  fields: [
                    { fieldPath: "object.textModulesData['block']" },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  };

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: "ACTIVE",
    hexBackgroundColor: "#1a1712",
    cardTitle: {
      defaultValue: { language: "en", value: "CPE Hardhatting 2026" },
    },
    subheader: {
      defaultValue: { language: "en", value: "Admission Pass" },
    },
    header: {
      defaultValue: { language: "en", value: user.name },
    },
    textModulesData: [
      { id: "seat", header: "Seat", body: user.seat || "—" },
      { id: "block", header: "Block", body: user.block || "—" },
    ],
    barcode: {
      type: "QR_CODE",
      value: payload,
      alternateText: payload,
    },
  };

  // Google fetches these over the public internet, so only add them when the
  // app is on a real https origin (skipped on localhost). Use a no-space
  // filename so the image URL isn't broken by spaces.
  if (httpsOrigin) {
    genericObject.heroImage = {
      sourceUri: { uri: `${httpsOrigin}/wallet-hero.jpg` },
      contentDescription: {
        defaultValue: { language: "en", value: "CPE Hardhatting 2026" },
      },
    };
    genericObject.logo = {
      sourceUri: { uri: `${httpsOrigin}/wallet-logo.png` },
      contentDescription: {
        defaultValue: { language: "en", value: "CPE Hardhatting 2026 logo" },
      },
    };
  }

  const claims = {
    iss: sa.client_email,
    aud: "google",
    typ: "savetowallet",
    origins: httpsOrigin ? [httpsOrigin] : [],
    payload: {
      genericClasses: [genericClass],
      genericObjects: [genericObject],
    },
  };

  const token = jwt.sign(claims, sa.private_key, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}
