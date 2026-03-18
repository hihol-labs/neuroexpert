-- 011: Update auth trigger to handle referral and niche_id

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_niche_id UUID;
BEGIN
  -- Resolve referrer by slug
  IF NEW.raw_user_meta_data->>'referrer_slug' IS NOT NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE slug = NEW.raw_user_meta_data->>'referrer_slug'
    LIMIT 1;
  END IF;

  -- Resolve niche_id
  IF NEW.raw_user_meta_data->>'niche_id' IS NOT NULL THEN
    v_niche_id := (NEW.raw_user_meta_data->>'niche_id')::UUID;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, slug, niche_id, referrer_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'slug',
      LOWER(REPLACE(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), ' ', '-'), '.', '-'))
        || '-' || LEFT(NEW.id::TEXT, 8)
    ),
    v_niche_id,
    v_referrer_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
