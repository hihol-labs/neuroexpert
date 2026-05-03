import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sizeParam = parseInt(searchParams.get("size") || "192", 10);
  const size = [192, 512].includes(sizeParam) ? sizeParam : 192;
  const fontSize = Math.round(size * 0.6);
  const borderRadius = Math.round(size * 0.15);

  return new ImageResponse(
    (
      <div
        style={{
          fontSize,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          borderRadius,
          color: "white",
          fontWeight: 700,
        }}
      >
        Н
      </div>
    ),
    { width: size, height: size },
  );
}
