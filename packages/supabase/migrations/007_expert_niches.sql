-- 007_expert_niches.sql
-- Множественные ниши для эксперта (максимум 3)

CREATE TABLE public.expert_niches (
  expert_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  niche_id  UUID NOT NULL REFERENCES public.niches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (expert_id, niche_id)
);

CREATE INDEX idx_expert_niches_expert ON public.expert_niches(expert_id);
CREATE INDEX idx_expert_niches_niche ON public.expert_niches(niche_id);

-- Мигрируем существующие данные из profiles.niche_id
INSERT INTO public.expert_niches (expert_id, niche_id)
SELECT id, niche_id FROM public.profiles WHERE niche_id IS NOT NULL
ON CONFLICT DO NOTHING;
