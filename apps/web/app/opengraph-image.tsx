import { ImageResponse } from "next/og";

export const alt = "НейроЭксперт — AI-система для экспертов";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
          background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700 }}>НейроЭксперт</div>
        <div
          style={{
            fontSize: 28,
            marginTop: 16,
            opacity: 0.9,
            maxWidth: 800,
            textAlign: "center",
          }}
        >
          AI-система, которая превращает экспертизу в клиентов из поиска и
          нейросетей
        </div>
      </div>
    ),
    { ...size },
  );
}
