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

function loadServiceAccount(): ServiceAccount | null {
  const file = process.env.GOOGLE_WALLET_SA_KEY_FILE;
  if (!file) return null;
  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!json.client_email || !json.private_key) return null;
    return { client_email: json.client_email, private_key: json.private_key };
  } catch {
    return null;
  }
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
  // app is on a real https origin (skipped on localhost).
  if (httpsOrigin) {
    genericObject.heroImage = {
      sourceUri: { uri: `${httpsOrigin}/main cover landscape.jpg` },
      contentDescription: {
        defaultValue: { language: "en", value: "CPE Hardhatting 2026" },
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
