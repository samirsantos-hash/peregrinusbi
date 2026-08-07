UPDATE public.user_access_control
SET allowed_cust_ids = ARRAY['2913945198','2353984473','2368389073','2982251221','3150127987','2242307083'],
    updated_at = now()
WHERE user_email = 'guilhermehenriquefx1@gmail.com';

UPDATE public.portfolios
SET assigned_to = '964b5d17-db97-46d8-b55a-df21031414b9'
WHERE name ILIKE 'HS Gest%' AND assigned_to IS NULL;