-- One-time idempotent data repair; do not change reviewed permissions or store scope.
UPDATE public.usuario_permissao_estado
SET permissoes_legadas = array_append(permissoes_legadas, 'carteiras.visualizar')
WHERE legado = true
  AND revisado_em IS NULL
  AND NOT ('carteiras.visualizar' = ANY(permissoes_legadas));