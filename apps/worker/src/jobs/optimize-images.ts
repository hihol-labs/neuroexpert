import { supabase } from "../supabase.js";

// Оптимизация изображений: конвертация в WebP, сжатие до 150KB
// Использует sharp (если установлен) для конвертации

const MAX_SIZE_BYTES = 150 * 1024; // 150KB

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSharp(): Promise<any | null> {
  try {
    const mod = await import("sharp" as string);
    return mod.default ?? mod;
  } catch {
    console.warn("[optimize_images] sharp not installed, skipping optimization");
    return null;
  }
}

export async function handleOptimizeImages(payload: Record<string, unknown>): Promise<{ optimized: number }> {
  const contentId = payload.content_id as string;

  const sharp = await getSharp();
  if (!sharp) {
    return { optimized: 0 };
  }

  // Если contentId задан — оптимизируем для конкретного пакета
  // Иначе — сканируем все изображения в storage
  let imagePaths: string[] = [];

  if (contentId) {
    const { data: pkg } = await supabase
      .from("content_packages")
      .select("expert_id")
      .eq("id", contentId)
      .single();

    if (pkg) {
      const { data: files } = await supabase.storage
        .from("images")
        .list(`content/${contentId}`, { limit: 50 });
      imagePaths = (files ?? [])
        .filter((f) => /\.(jpg|jpeg|png|gif)$/i.test(f.name))
        .map((f) => `content/${contentId}/${f.name}`);
    }
  } else {
    // Сканируем аватары экспертов
    const { data: profiles } = await supabase
      .from("profiles")
      .select("avatar_url")
      .not("avatar_url", "is", null)
      .limit(50);

    for (const p of profiles ?? []) {
      const url = p.avatar_url as string;
      if (url && url.includes("/storage/") && /\.(jpg|jpeg|png|gif)/i.test(url)) {
        const path = url.split("/storage/v1/object/public/")[1];
        if (path) imagePaths.push(path);
      }
    }
  }

  if (imagePaths.length === 0) {
    console.log("[optimize_images] No images to optimize");
    return { optimized: 0 };
  }

  let optimized = 0;

  for (const path of imagePaths) {
    try {
      // Определяем бакет и путь
      const [bucket, ...rest] = path.split("/");
      const filePath = rest.join("/");

      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error || !data) continue;

      const buffer = Buffer.from(await data.arrayBuffer());

      // Уже маленький?
      if (buffer.length <= MAX_SIZE_BYTES) continue;

      // Конвертируем в WebP
      let quality = 80;
      let webpBuffer = await sharp(buffer).webp({ quality }).toBuffer();

      // Уменьшаем качество если всё ещё большой
      while (webpBuffer.length > MAX_SIZE_BYTES && quality > 30) {
        quality -= 10;
        webpBuffer = await sharp(buffer).webp({ quality }).toBuffer();
      }

      // Загружаем обратно
      const webpPath = filePath.replace(/\.(jpg|jpeg|png|gif)$/i, ".webp");
      await supabase.storage.from(bucket).upload(webpPath, webpBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

      optimized++;
      console.log(`[optimize_images] ${path}: ${buffer.length} → ${webpBuffer.length} bytes (WebP, q=${quality})`);
    } catch (err) {
      console.error(`[optimize_images] Failed for ${path}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[optimize_images] Optimized ${optimized} images`);
  return { optimized };
}
