-- 002_rls_policies.sql
-- НейроЭксперт — Row Level Security политики

-- ============================================================
-- profiles: свой профиль + публичные
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable"
  ON public.profiles FOR SELECT
  USING (is_published = TRUE);

-- ============================================================
-- content_packages: владелец + published
-- ============================================================
ALTER TABLE public.content_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can manage own content"
  ON public.content_packages FOR ALL
  USING (auth.uid() = expert_id);

CREATE POLICY "Published content is public"
  ON public.content_packages FOR SELECT
  USING (status = 'published');

-- ============================================================
-- leads: эксперт видит свои + anyone создаёт
-- ============================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can view own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = expert_id);

CREATE POLICY "Anyone can create leads"
  ON public.leads FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================
-- orders: только владелец
-- ============================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can view own orders"
  ON public.orders FOR ALL
  USING (auth.uid() = expert_id);

-- ============================================================
-- payments: только владелец
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = expert_id);
