import { ImageResponse } from "next/og";

import { brand, splitLogoText } from "~/lib/branding";

export const alt = `${brand.name} - Invoicing Made Simple`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [logoPrefix, logoSuffix] = splitLogoText(brand.logoText);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(128,128,128,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "50%",
            backgroundColor: "rgba(163, 163, 163, 0.25)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
            padding: "0 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: "#18181b" }}>{brand.icon}</span>
            <span style={{ width: 16 }} />
            <span style={{ color: "#09090b" }}>{logoPrefix}</span>
            <span style={{ color: "rgba(9, 9, 11, 0.7)" }}>{logoSuffix}</span>
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 40,
              fontWeight: 600,
              color: "#09090b",
              textAlign: "center",
              letterSpacing: "-0.02em",
            }}
          >
            Invoicing Made Simple
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 22,
              fontWeight: 400,
              color: "#71717a",
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.4,
            }}
          >
            {brand.tagline}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
