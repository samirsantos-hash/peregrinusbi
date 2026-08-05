INSERT INTO public.grupos (nome, descricao, ativo)
VALUES ('Grupo Canada', 'Grupo econômico Canada', true)
ON CONFLICT DO NOTHING;

UPDATE public.sellers
SET grupo_id = (SELECT id FROM public.grupos WHERE nome = 'Grupo Canada' LIMIT 1)
WHERE cust_id IN ('237664328', '1319276993');