import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The invite-email route reads logo/cover/icon files from public/ at runtime
  // (nodemailer CID attachments). Vercel doesn't bundle public/ into serverless
  // functions by default, so trace them in explicitly.
  outputFileTracingIncludes: {
    "/api/admin/invite": ["./public/**/*"],
  },
};

export default nextConfig;
