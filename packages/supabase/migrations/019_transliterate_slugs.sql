-- 019: Transliterate existing cyrillic slugs to latin
--
-- Cyrillic slugs cause 404 on public article pages. Root cause (B-008 / F-E2E-007):
-- slugify() in apps/worker/src/jobs/generate-content.ts kept cyrillic,
-- and the auth trigger (006/011) fell back to REPLACE() without transliteration.
--
-- Fix in code: packages/shared/src/utils/slug.ts::slugifyLatin() (lat-only output).
-- This migration backfills existing rows and hardens the DB-side fallback
-- so that freshly-created rows can never get cyrillic slugs again
-- (e.g. when a user registers via TG bot without passing slug in metadata).
--
-- Idempotent: guarded by `slug ~ '[а-яёА-ЯЁ]'`.

CREATE OR REPLACE FUNCTION public.transliterate_cyrillic(s text)
RETURNS text AS $$
DECLARE
  r text;
BEGIN
  r := lower(coalesce(s, ''));
  -- Multi-char first (longest match wins)
  r := replace(r, 'щ', 'sch');
  r := replace(r, 'ю', 'yu');
  r := replace(r, 'я', 'ya');
  r := replace(r, 'ж', 'zh');
  r := replace(r, 'ч', 'ch');
  r := replace(r, 'ш', 'sh');
  r := replace(r, 'ц', 'ts');
  -- Drop hard/soft sign separately (translate only drops terminal-index chars)
  r := replace(r, 'ъ', '');
  r := replace(r, 'ь', '');
  -- Single-char 1:1 (24 chars in, 24 chars out)
  r := translate(
    r,
    'абвгдеёзийклмнопрстуфхыэ',
    'abvgdeeziiklmnoprstufhye'
  );
  -- Strip anything outside [a-z0-9\s-]
  r := regexp_replace(r, '[^a-z0-9[:space:]-]', '', 'g');
  -- Whitespace → dash, collapse repeats, trim
  r := regexp_replace(r, '\s+', '-', 'g');
  r := regexp_replace(r, '-+', '-', 'g');
  r := regexp_replace(r, '^-+|-+$', '', 'g');
  RETURN r;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill profiles.slug
UPDATE public.profiles
SET slug = public.transliterate_cyrillic(slug)
WHERE slug ~ '[а-яёА-ЯЁ]';

-- Backfill content_packages.slug
UPDATE public.content_packages
SET slug = public.transliterate_cyrillic(slug)
WHERE slug ~ '[а-яёА-ЯЁ]';

-- Harden handle_new_user() trigger so DB-side fallback produces latin slugs too
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_niche_id UUID;
  v_slug TEXT;
  v_base TEXT;
BEGIN
  IF NEW.raw_user_meta_data->>'referrer_slug' IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE slug = NEW.raw_user_meta_data->>'referrer_slug'
    LIMIT 1;
  END IF;

  IF NEW.raw_user_meta_data->>'niche_id' IS NOT NULL THEN
    v_niche_id := (NEW.raw_user_meta_data->>'niche_id')::UUID;
  END IF;

  v_slug := NEW.raw_user_meta_data->>'slug';

  IF v_slug IS NULL OR v_slug = '' THEN
    v_base := public.transliterate_cyrillic(
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    -- transliterate_cyrillic already strips non-latin and collapses dashes
    IF v_base IS NULL OR v_base = '' THEN v_base := 'user'; END IF;
    v_slug := v_base || '-' || LEFT(NEW.id::TEXT, 8);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, slug, niche_id, referrer_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    v_slug,
    v_niche_id,
    v_referrer_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
