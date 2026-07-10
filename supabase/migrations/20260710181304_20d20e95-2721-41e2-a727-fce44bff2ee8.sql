
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS vertical_dominant text;

WITH ranked AS (
  SELECT seller_id, vertical, SUM(itens) AS s,
         ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY SUM(itens) DESC) rn
  FROM public.live_listings
  WHERE vertical IS NOT NULL AND vertical <> ''
  GROUP BY seller_id, vertical
)
UPDATE public.sellers s
   SET vertical_dominant = r.vertical
  FROM ranked r
 WHERE r.rn = 1 AND r.seller_id = s.id;

CREATE INDEX IF NOT EXISTS idx_sellers_vertical_dominant ON public.sellers(vertical_dominant);
