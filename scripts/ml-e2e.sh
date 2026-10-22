#!/usr/bin/env bash
# Teste de ponta a ponta da gestão do Mercado Livre contra o projeto publicado.
#
# Uso:  scripts/ml-e2e.sh [ads|promo|pergunta|tudo]      (padrão: tudo)
# Requer: curl, jq, uuidgen e o .env do projeto (VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY).
# Variáveis opcionais:
#   CUST_ID=793541906      conta do ML (ml_user_id) a testar
#   ORCAMENTO=5            orçamento médio diário da campanha de teste, em reais
#   AD_GROUP_ID=…          anúncio de Ads a usar (senão, escolhe entre os que estão fora de campanha)
#   PROMO_ITEM_ID=…        anúncio a usar na promoção (senão, escolhe entre os candidatos)
#
# Cuidados (conta real):
#   - a campanha nasce pausada e continua pausada; a API não documenta exclusão de campanha,
#     então ela fica pausada com nome "TESTE PEREGRINUS …" para excluir no painel do ML;
#   - só usa anúncio que está fora de campanha, e no fim o devolve para fora de campanha;
#   - promoção só em 1 anúncio, de tipo com preço definido pelo ML e que permite sair; sai em seguida;
#   - cada escrita mostra a prévia e só envia depois de você digitar "s".
# O login é com o seu usuário do painel (precisa ser consultor da conta). Senha e token não são gravados nem impressos.

set -uo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
PASSOS="${1:-tudo}"
CUST_ID="${CUST_ID:-793541906}"
ORCAMENTO="${ORCAMENTO:-5}"
INICIO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p "$RAIZ/tmp/e2e"
LOG="$RAIZ/tmp/e2e/ml-e2e-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

for c in curl jq uuidgen; do command -v "$c" >/dev/null || { echo "Falta o comando $c."; exit 1; }; done
ler_env() { grep -E "^$1=" "$RAIZ/.env" | head -1 | cut -d= -f2- | tr -d '"'"'"; }
URL="$(ler_env VITE_SUPABASE_URL)"
ANON="$(ler_env VITE_SUPABASE_PUBLISHABLE_KEY)"
[ -n "$URL" ] && [ -n "$ANON" ] || { echo "Não achei VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env."; exit 1; }

RESUMO=()
anotar() { RESUMO+=("$1: $2"); }
titulo() { printf '\n== %s ==\n' "$1"; }
confirmar() { local r; read -r -p "$1 [s/N] " r </dev/tty; [ "$r" = "s" ] || [ "$r" = "S" ]; }
uri() { jq -rn --arg v "$1" '$v|@uri'; }

# ── Login ───────────────────────────────────────────────────────────────────
titulo "Login no painel ($URL)"
read -r -p "E-mail: " EMAIL </dev/tty
read -r -s -p "Senha: " SENHA </dev/tty; echo
TOKEN="$(curl -sS "$URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "$(jq -nc --arg e "$EMAIL" --arg s "$SENHA" '{email:$e, password:$s}')" | jq -r '.access_token // empty')"
unset SENHA
[ -n "$TOKEN" ] || { echo "Login recusado."; exit 1; }
echo "Login ok."

chamar() { # função, corpo JSON → HTTP e RESP
  local out
  out="$(curl -sS -m 150 -w $'\n%{http_code}' -X POST "$URL/functions/v1/$1" \
    -H "Authorization: Bearer $TOKEN" -H "apikey: $ANON" -H "Content-Type: application/json" -d "$2")"
  HTTP="${out##*$'\n'}"; RESP="${out%$'\n'*}"
}
rest() { curl -sS "$URL/rest/v1/$1" -H "Authorization: Bearer $TOKEN" -H "apikey: $ANON"; }
erro() { echo "  ERRO HTTP $HTTP: $(echo "$RESP" | jq -r '.error // .' 2>/dev/null || echo "$RESP")"; }

# Prévia → confirmação de uma ação em lote. Devolve 0 se algum item ficou feito.
lote() { # função, JSON da ação
  local chave; chave="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  chamar "$1" "$(jq -c --arg a "$CONTA" --arg k "$chave" '. + {account_id:$a, etapa:"previa", idempotency_key:$k}' <<<"$2")"
  [ "$HTTP" = 200 ] || { erro; return 1; }
  echo "  Prévia:"
  echo "$RESP" | jq -r '.linhas[] | "  - \(.titulo // .chave)\n      antes:  \(.antes)\n      depois: \(.depois)" + (if .aviso then "\n      aviso:  \(.aviso)" else "" end) + (if .bloqueio then "\n      BLOQUEADO: \(.bloqueio)" else "" end)'
  confirmar "  Enviar ao Mercado Livre?" || { echo "  Cancelado; nada foi enviado."; return 2; }
  chamar "$1" "$(jq -nc --arg a "$CONTA" --arg k "$chave" '{account_id:$a, etapa:"confirmar", idempotency_key:$k}')"
  [ "$HTTP" = 200 ] || { erro; return 1; }
  echo "$RESP" | jq -r '.resultados[] | "  Resultado \(.chave): \(.status)" + (if .mensagem then " — \(.mensagem)" else "" end) + (if .codigo_ml then " [\(.codigo_ml)]" else "" end)'
  echo "$RESP" | jq -e '[.resultados[] | select(.status == "feito" or .status == "ja_feito")] | length > 0' >/dev/null
}

passo() { # nome, comando…
  local nome="$1"; shift
  if "$@"; then anotar "$nome" "ok"; else anotar "$nome" "FALHOU ou cancelado"; return 1; fi
}

# ── Conta ───────────────────────────────────────────────────────────────────
titulo "Conta $CUST_ID"
CONTAS="$(curl -sS -X POST "$URL/rest/v1/rpc/ml_contas_gerenciaveis" -H "Authorization: Bearer $TOKEN" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{}')"
CONTA="$(echo "$CONTAS" | jq -r --argjson c "$CUST_ID" '.[]? | select(.ml_user_id == $c) | .id' | head -1)"
[ -n "$CONTA" ] || { echo "A conta $CUST_ID não está conectada ou você não a gerencia. Contas visíveis:"; echo "$CONTAS" | jq -r '.[]? | "  \(.ml_user_id) \(.nickname)"'; exit 1; }
echo "Conta: $(echo "$CONTAS" | jq -r --arg id "$CONTA" '.[] | select(.id == $id) | "\(.nickname) (\(.ml_user_id))"') · account_id $CONTA"

# ── Publicidade ─────────────────────────────────────────────────────────────
testar_ads() {
  titulo "Publicidade: leitura"
  chamar ml-ads-sync "$(jq -nc --arg a "$CONTA" '{account_id:$a}')"
  [ "$HTTP" = 200 ] || { erro; anotar "Ads: leitura" "FALHOU"; return 1; }
  echo "$RESP" | jq -r '.contas[0] | "  status \(.status) · campanhas \(.campanhas) · anúncios \(.anuncios) · dias lidos \(.dias_lidos) · pendentes \(.dias_pendentes)" + (if (.erros|length) > 0 then "\n  erros: \(.erros|join(" | "))" else "" end)'
  local st; st="$(echo "$RESP" | jq -r '.contas[0].status')"
  [ "$st" = "ativo" ] || { anotar "Ads: leitura" "conta sem Product Ads ($st)"; return 1; }
  anotar "Ads: leitura" "ok"

  local nome="TESTE PEREGRINUS $(date +%Y%m%d-%H%M)"
  titulo "Publicidade: criar campanha pausada \"$nome\" (R\$ $ORCAMENTO/dia, ROAS alvo 10)"
  passo "Ads: criar campanha" lote ml-ads-action "$(jq -nc --arg n "$nome" --argjson b "$ORCAMENTO" \
    '{tipo:"campanha_criar", campanha:{name:$n, budget:$b, strategy:"profitability", status:"paused", roas_target:10}}')" || return 1

  local cid
  cid="$(rest "ml_ads_campaigns?account_id=eq.$CONTA&name=eq.$(uri "$nome")&select=campaign_id" | jq -r '.[0].campaign_id // empty')"
  if [ -z "$cid" ]; then
    chamar ml-ads-sync "$(jq -nc --arg a "$CONTA" '{account_id:$a}')"
    cid="$(rest "ml_ads_campaigns?account_id=eq.$CONTA&name=eq.$(uri "$nome")&select=campaign_id" | jq -r '.[0].campaign_id // empty')"
  fi
  [ -n "$cid" ] || { echo "  A campanha não apareceu na leitura."; anotar "Ads: campanha na leitura" "FALHOU"; return 1; }
  echo "  campaign_id $cid"

  titulo "Publicidade: editar campanha (orçamento +1, continua pausada)"
  passo "Ads: editar campanha" lote ml-ads-action "$(jq -nc --argjson c "$cid" --argjson b "$ORCAMENTO" '{tipo:"campanha_editar", campaign_id:$c, campanha:{budget:($b+1)}}')"

  if confirmar "  Testar também ativar e pausar a campanha em seguida (fica ativa por alguns segundos, sem anúncios)?"; then
    passo "Ads: ativar campanha" lote ml-ads-action "$(jq -nc --argjson c "$cid" '{tipo:"campanha_editar", campaign_id:$c, campanha:{status:"active"}}')"
    passo "Ads: pausar campanha" lote ml-ads-action "$(jq -nc --argjson c "$cid" '{tipo:"campanha_editar", campaign_id:$c, campanha:{status:"paused"}}')"
  else
    anotar "Ads: ativar/pausar campanha" "pulado"
  fi

  titulo "Publicidade: incluir, pausar e remover um anúncio"
  local ag="${AD_GROUP_ID:-}"
  if [ -z "$ag" ]; then
    local fora; fora="$(rest "ml_ads_ads?account_id=eq.$CONTA&campaign_id=is.null&select=ad_group_id,external_id,title&limit=10")"
    if [ "$(echo "$fora" | jq 'length')" = 0 ]; then
      echo "  Nenhum anúncio de Ads fora de campanha. Rode de novo com AD_GROUP_ID=… (atenção: um anúncio em outra campanha sairia dela)."
      anotar "Ads: anúncio" "pulado (nenhum fora de campanha)"; return 1
    fi
    echo "$fora" | jq -r 'to_entries[] | "  [\(.key)] \(.value.ad_group_id) \(.value.external_id // "") \(.value.title // "")"'
    local i; read -r -p "  Qual usar? [0] " i </dev/tty
    ag="$(echo "$fora" | jq -r --argjson i "${i:-0}" '.[$i].ad_group_id // empty')"
  fi
  [ -n "$ag" ] || { anotar "Ads: anúncio" "pulado"; return 1; }
  passo "Ads: incluir anúncio" lote ml-ads-action "$(jq -nc --argjson c "$cid" --argjson g "$ag" '{tipo:"grupos_incluir", campaign_id:$c, ad_group_ids:[$g]}')" || return 1
  passo "Ads: pausar anúncio" lote ml-ads-action "$(jq -nc --argjson g "$ag" '{tipo:"grupos_status", status:"paused", ad_group_ids:[$g]}')"
  passo "Ads: remover anúncio" lote ml-ads-action "$(jq -nc --argjson g "$ag" '{tipo:"grupos_remover", ad_group_ids:[$g]}')"
  echo "  A campanha \"$nome\" ($cid) ficou pausada e vazia; exclua no painel do ML se quiser."
}

# ── Promoções ───────────────────────────────────────────────────────────────
testar_promo() {
  titulo "Promoções: leitura"
  chamar ml-promotions-sync "$(jq -nc --arg a "$CONTA" '{account_id:$a}')"
  [ "$HTTP" = 200 ] || { erro; anotar "Promo: leitura" "FALHOU"; return 1; }
  echo "$RESP" | jq -r '.contas[0] | "  promoções \(.promocoes) · itens \(.itens) · pendentes \(.pendentes)" + (if .erro then " · erro \(.erro)" else "" end)'
  anotar "Promo: leitura" "ok"

  local item="${PROMO_ITEM_ID:-}"
  local tipos="SMART,PRICE_MATCHING,MARKETPLACE_CAMPAIGN,VOLUME,PRE_NEGOTIATED,UNHEALTHY_STOCK"
  if [ -z "$item" ]; then
    local cand; cand="$(rest "ml_promotion_items?account_id=eq.$CONTA&status=in.(candidate,candidated)&tipo=in.($tipos)&select=item_id,promotion_id,tipo,preco,preco_original,meli_pct&limit=10")"
    if [ "$(echo "$cand" | jq 'length')" = 0 ]; then
      echo "  Nenhum convite de preço definido pelo ML. Rode de novo com PROMO_ITEM_ID=…"
      anotar "Promo: entrar/sair" "pulado (sem candidato)"; return 1
    fi
    echo "$cand" | jq -r 'to_entries[] | "  [\(.key)] \(.value.item_id) \(.value.tipo) R$ \(.value.preco_original // "?") → R$ \(.value.preco // "?") (ML paga \(.value.meli_pct // "?")%)"'
    local i; read -r -p "  Qual usar? [0] " i </dev/tty
    item="$(echo "$cand" | jq -r --argjson i "${i:-0}" '.[$i].item_id // empty')"
  fi
  [ -n "$item" ] || { anotar "Promo: entrar/sair" "pulado"; return 1; }

  chamar ml-promotions-item "$(jq -nc --arg a "$CONTA" --arg i "$item" '{account_id:$a, item_id:$i}')"
  [ "$HTTP" = 200 ] || { erro; anotar "Promo: leitura do anúncio" "FALHOU"; return 1; }
  local promo; promo="$(echo "$RESP" | jq -c --arg t "$tipos" '[.promocoes[] | select(.pode.aderir and (.tipo as $x | ($t | split(",") | index($x))))][0] // empty')"
  [ -n "$promo" ] || { echo "  O anúncio $item não tem convite aceitável agora."; anotar "Promo: entrar/sair" "pulado"; return 1; }
  echo "  $item · $(echo "$promo" | jq -r '"\(.nome_tipo) \(.promotion_id // "") · preço na promoção R$ \(.preco // .sugerido // "?")"')"
  local corpo; corpo="$(echo "$promo" | jq -c --arg i "$item" '{item_id:$i, promotion_type:.tipo, promotion_id:.promotion_id, offer_id:.offer_id}')"

  titulo "Promoções: entrar"
  passo "Promo: entrar" lote ml-promotions-action "$(jq -nc --argjson c "$corpo" '{acao:"aderir", itens:[$c]}')" || return 1
  titulo "Promoções: sair"
  passo "Promo: sair" lote ml-promotions-action "$(jq -nc --argjson c "$corpo" '{acao:"sair", itens:[$c]}')"
}

# ── Pergunta pelo webhook ───────────────────────────────────────────────────
testar_pergunta() {
  titulo "Perguntas: notificação e resposta"
  local desde; desde="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "  Com OUTRA conta do Mercado Livre (comprador), faça uma pergunta num anúncio ativo desta loja."
  read -r -p "  Enter depois de enviar a pergunta… " _ </dev/tty
  local q="" t
  for t in $(seq 1 60); do
    q="$(rest "ml_questions?account_id=eq.$CONTA&status=eq.UNANSWERED&data_criacao=gte.$(uri "$desde")&order=data_criacao.desc&limit=1&select=question_id,item_id,texto,synced_at")"
    [ "$(echo "$q" | jq 'length')" != 0 ] && break
    printf '.'; sleep 10
  done; echo
  if [ "$(echo "$q" | jq 'length')" = 0 ]; then
    echo "  Nenhuma pergunta chegou pelo webhook em 10 minutos. Confira no DevCenter a URL de notificações e o tópico questions."
    anotar "Pergunta: webhook" "FALHOU"; return 1
  fi
  local qid; qid="$(echo "$q" | jq -r '.[0].question_id')"
  echo "  Chegou: $(echo "$q" | jq -r '.[0] | "\(.item_id): \(.texto)"')"
  anotar "Pergunta: webhook" "ok"
  local n; n="$(rest "notifications?tipo=eq.pergunta&criado_em=gte.$(uri "$desde")&select=id" | jq 'length')"
  if [ "$n" != 0 ]; then anotar "Pergunta: aviso interno" "ok"; else anotar "Pergunta: aviso interno" "não chegou para este usuário"; fi

  local texto; read -r -p "  Resposta a publicar (vai para o comprador): " texto </dev/tty
  [ -n "$texto" ] || { anotar "Pergunta: responder" "pulado"; return 1; }
  local chave; chave="$(uuidgen | tr '[:upper:]' '[:lower:]')"
  local base; base="$(jq -nc --arg a "$CONTA" --argjson q "$qid" --arg t "$texto" --arg k "$chave" '{account_id:$a, question_id:$q, texto:$t, idempotency_key:$k}')"
  chamar ml-questions-answer "$(jq -c '. + {etapa:"previa"}' <<<"$base")"
  [ "$HTTP" = 200 ] || { erro; anotar "Pergunta: responder" "FALHOU"; return 1; }
  echo "$RESP" | jq -r '"  antes: \(.antes.status) · depois: \(.depois.status) — \(.depois.resposta)"'
  confirmar "  Publicar a resposta no Mercado Livre?" || { anotar "Pergunta: responder" "cancelado"; return 1; }
  chamar ml-questions-answer "$(jq -c '. + {etapa:"confirmar"}' <<<"$base")"
  [ "$HTTP" = 200 ] || { erro; anotar "Pergunta: responder" "FALHOU"; return 1; }
  echo "  $(echo "$RESP" | jq -r '.status')"
  anotar "Pergunta: responder" "ok"
}

case "$PASSOS" in
  ads) testar_ads ;;
  promo) testar_promo ;;
  pergunta) testar_pergunta ;;
  tudo) testar_ads; testar_promo; testar_pergunta ;;
  *) echo "Use: $0 [ads|promo|pergunta|tudo]"; exit 1 ;;
esac

titulo "Auditoria gravada desde $INICIO"
rest "ml_audit_log?account_id=eq.$CONTA&criado_em=gte.$(uri "$INICIO")&order=criado_em&select=acao,codigo_ml,criado_em" \
  | jq -r '.[] | "  \(.criado_em) \(.acao)" + (if .codigo_ml then " [\(.codigo_ml)]" else "" end)'

titulo "Resumo"
if [ "${#RESUMO[@]}" -gt 0 ]; then for r in "${RESUMO[@]}"; do echo "  $r"; done; fi
echo "Log: $LOG"
