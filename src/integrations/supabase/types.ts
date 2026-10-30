export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerta_inatividade_ciente: {
        Row: {
          ciente_em: string
          destinatario_id: string
          id: string
          ultimo_acesso: string | null
          usuario_inativo_id: string
        }
        Insert: {
          ciente_em?: string
          destinatario_id: string
          id?: string
          ultimo_acesso?: string | null
          usuario_inativo_id: string
        }
        Update: {
          ciente_em?: string
          destinatario_id?: string
          id?: string
          ultimo_acesso?: string | null
          usuario_inativo_id?: string
        }
        Relationships: []
      }
      alerta_inatividade_destinatarios: {
        Row: {
          email_prefixo: string
        }
        Insert: {
          email_prefixo: string
        }
        Update: {
          email_prefixo?: string
        }
        Relationships: []
      }
      benchmark_uplift_full: {
        Row: {
          base_amostra: string
          conversao_pct: number | null
          created_at: string
          data_fonte: string
          fonte: string
          modal_origem: string
          observacao: string | null
          rotulos_origem: string[]
          uplift_vendas: number
          uplift_visitas: number | null
          usar_em_estimativa: boolean
        }
        Insert: {
          base_amostra: string
          conversao_pct?: number | null
          created_at?: string
          data_fonte: string
          fonte: string
          modal_origem: string
          observacao?: string | null
          rotulos_origem?: string[]
          uplift_vendas: number
          uplift_visitas?: number | null
          usar_em_estimativa?: boolean
        }
        Update: {
          base_amostra?: string
          conversao_pct?: number | null
          created_at?: string
          data_fonte?: string
          fonte?: string
          modal_origem?: string
          observacao?: string | null
          rotulos_origem?: string[]
          uplift_vendas?: number
          uplift_visitas?: number | null
          usar_em_estimativa?: boolean
        }
        Relationships: []
      }
      cart_base_vendedores: {
        Row: {
          created_at: string
          cus_nickname: string | null
          cus_state: string | null
          cust_id: number
          fecha_in: string | null
          fecha_out: string | null
          id: string
          nivel_solucion: string | null
          source_file: string | null
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id: number
          fecha_in?: string | null
          fecha_out?: string | null
          id?: string
          nivel_solucion?: string | null
          source_file?: string | null
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id?: number
          fecha_in?: string | null
          fecha_out?: string | null
          id?: string
          nivel_solucion?: string | null
          source_file?: string | null
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      cart_cdp_diarizado: {
        Row: {
          cp_investiments_seller_lc: number | null
          cp_investments_lc: number | null
          created_at: string
          cus_nickname: string | null
          cust_id: number
          data: string | null
          date_id: number | null
          id: string
          source_file: string | null
          total_investiments_lc: number | null
          total_rebates_lc: number | null
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          cp_investiments_seller_lc?: number | null
          cp_investments_lc?: number | null
          created_at?: string
          cus_nickname?: string | null
          cust_id: number
          data?: string | null
          date_id?: number | null
          id?: string
          source_file?: string | null
          total_investiments_lc?: number | null
          total_rebates_lc?: number | null
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          cp_investiments_seller_lc?: number | null
          cp_investments_lc?: number | null
          created_at?: string
          cus_nickname?: string | null
          cust_id?: number
          data?: string | null
          date_id?: number | null
          id?: string
          source_file?: string | null
          total_investiments_lc?: number | null
          total_rebates_lc?: number | null
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      cart_cdp_mensal: {
        Row: {
          cp_investiments_seller_lc: number | null
          cp_investments_lc: number | null
          created_at: string
          cus_nickname: string | null
          cust_id: number
          id: string
          source_file: string | null
          tim_month_id: number | null
          total_investiments_lc: number | null
          total_rebates_lc: number | null
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          cp_investiments_seller_lc?: number | null
          cp_investments_lc?: number | null
          created_at?: string
          cus_nickname?: string | null
          cust_id: number
          id?: string
          source_file?: string | null
          tim_month_id?: number | null
          total_investiments_lc?: number | null
          total_rebates_lc?: number | null
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          cp_investiments_seller_lc?: number | null
          cp_investments_lc?: number | null
          created_at?: string
          cus_nickname?: string | null
          cust_id?: number
          id?: string
          source_file?: string | null
          tim_month_id?: number | null
          total_investiments_lc?: number | null
          total_rebates_lc?: number | null
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      cart_cpp_diarizado: {
        Row: {
          created_at: string
          cus_nickname: string | null
          cust_id: number
          data: string | null
          date_id: number | null
          f_gmv: number | null
          f_tsi: number | null
          gmv: number | null
          id: string
          localidade: string | null
          nivel_solucion: string | null
          source_file: string | null
          sub_cluster_seller: string | null
          total_livelistings: number | null
          tsi: number | null
          updated_at: string
          uploaded_at: string
          visitas: number | null
        }
        Insert: {
          created_at?: string
          cus_nickname?: string | null
          cust_id: number
          data?: string | null
          date_id?: number | null
          f_gmv?: number | null
          f_tsi?: number | null
          gmv?: number | null
          id?: string
          localidade?: string | null
          nivel_solucion?: string | null
          source_file?: string | null
          sub_cluster_seller?: string | null
          total_livelistings?: number | null
          tsi?: number | null
          updated_at?: string
          uploaded_at?: string
          visitas?: number | null
        }
        Update: {
          created_at?: string
          cus_nickname?: string | null
          cust_id?: number
          data?: string | null
          date_id?: number | null
          f_gmv?: number | null
          f_tsi?: number | null
          gmv?: number | null
          id?: string
          localidade?: string | null
          nivel_solucion?: string | null
          source_file?: string | null
          sub_cluster_seller?: string | null
          total_livelistings?: number | null
          tsi?: number | null
          updated_at?: string
          uploaded_at?: string
          visitas?: number | null
        }
        Relationships: []
      }
      cart_cpp_mensal: {
        Row: {
          bpc: number | null
          created_at: string
          cus_nickname: string | null
          cus_state: string | null
          cust_id: number
          id: string
          inv_pads: number | null
          nivel_solucion: string | null
          rep_claims_rate: number | null
          rep_current_level: string | null
          rep_disputes_rate: number | null
          score_final_bbf: number | null
          score_final_full: number | null
          sellers_invest_pads: number | null
          source_file: string | null
          sub_cluster_seller: string | null
          tgmv_lc: number | null
          tgmv_lc_fbm: number | null
          tgmv_lc_flex: number | null
          tgmv_lc_full: number | null
          tgmv_lc_pads: number | null
          tim_month_id: number | null
          tsi: number | null
          tsi_pads: number | null
          updated_at: string
          uploaded_at: string
          visitas: number | null
        }
        Insert: {
          bpc?: number | null
          created_at?: string
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id: number
          id?: string
          inv_pads?: number | null
          nivel_solucion?: string | null
          rep_claims_rate?: number | null
          rep_current_level?: string | null
          rep_disputes_rate?: number | null
          score_final_bbf?: number | null
          score_final_full?: number | null
          sellers_invest_pads?: number | null
          source_file?: string | null
          sub_cluster_seller?: string | null
          tgmv_lc?: number | null
          tgmv_lc_fbm?: number | null
          tgmv_lc_flex?: number | null
          tgmv_lc_full?: number | null
          tgmv_lc_pads?: number | null
          tim_month_id?: number | null
          tsi?: number | null
          tsi_pads?: number | null
          updated_at?: string
          uploaded_at?: string
          visitas?: number | null
        }
        Update: {
          bpc?: number | null
          created_at?: string
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id?: number
          id?: string
          inv_pads?: number | null
          nivel_solucion?: string | null
          rep_claims_rate?: number | null
          rep_current_level?: string | null
          rep_disputes_rate?: number | null
          score_final_bbf?: number | null
          score_final_full?: number | null
          sellers_invest_pads?: number | null
          source_file?: string | null
          sub_cluster_seller?: string | null
          tgmv_lc?: number | null
          tgmv_lc_fbm?: number | null
          tgmv_lc_flex?: number | null
          tgmv_lc_full?: number | null
          tgmv_lc_pads?: number | null
          tim_month_id?: number | null
          tsi?: number | null
          tsi_pads?: number | null
          updated_at?: string
          uploaded_at?: string
          visitas?: number | null
        }
        Relationships: []
      }
      cart_elegibilidade: {
        Row: {
          acao_recomendada: string | null
          campaign_id: string | null
          campaign_id_best: string | null
          campaign_type: string | null
          created_at: string
          cus_nickname: string | null
          cust_id: number
          data_atualizacao: string | null
          discount_best: number | null
          discount_seller_percentage: number | null
          discount_total: number | null
          flag_best_promo: boolean | null
          flag_item_s_optin: boolean | null
          flag_seller_s_optin: boolean | null
          id: string
          item_id: string | null
          item_name: string | null
          media_tsi_diario_7d: number | null
          pedidos_7d: number | null
          source_file: string | null
          updated_at: string
          uploaded_at: string
          vertical: string | null
        }
        Insert: {
          acao_recomendada?: string | null
          campaign_id?: string | null
          campaign_id_best?: string | null
          campaign_type?: string | null
          created_at?: string
          cus_nickname?: string | null
          cust_id: number
          data_atualizacao?: string | null
          discount_best?: number | null
          discount_seller_percentage?: number | null
          discount_total?: number | null
          flag_best_promo?: boolean | null
          flag_item_s_optin?: boolean | null
          flag_seller_s_optin?: boolean | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          media_tsi_diario_7d?: number | null
          pedidos_7d?: number | null
          source_file?: string | null
          updated_at?: string
          uploaded_at?: string
          vertical?: string | null
        }
        Update: {
          acao_recomendada?: string | null
          campaign_id?: string | null
          campaign_id_best?: string | null
          campaign_type?: string | null
          created_at?: string
          cus_nickname?: string | null
          cust_id?: number
          data_atualizacao?: string | null
          discount_best?: number | null
          discount_seller_percentage?: number | null
          discount_total?: number | null
          flag_best_promo?: boolean | null
          flag_item_s_optin?: boolean | null
          flag_seller_s_optin?: boolean | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          media_tsi_diario_7d?: number | null
          pedidos_7d?: number | null
          source_file?: string | null
          updated_at?: string
          uploaded_at?: string
          vertical?: string | null
        }
        Relationships: []
      }
      cart_livelistings: {
        Row: {
          categoria: string | null
          created_at: string
          cus_nickname: string | null
          cus_state: string | null
          cust_id: number
          dom_domain_agg1: string | null
          dom_domain_agg2: string | null
          dom_domain_agg3: string | null
          id: string
          item_id: string | null
          item_name: string | null
          itens: number | null
          source_file: string | null
          sub_cluster_seller: string | null
          tim_month_id: number | null
          updated_at: string
          uploaded_at: string
          vertical: string | null
          vertical_item: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id: number
          dom_domain_agg1?: string | null
          dom_domain_agg2?: string | null
          dom_domain_agg3?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          itens?: number | null
          source_file?: string | null
          sub_cluster_seller?: string | null
          tim_month_id?: number | null
          updated_at?: string
          uploaded_at?: string
          vertical?: string | null
          vertical_item?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id?: number
          dom_domain_agg1?: string | null
          dom_domain_agg2?: string | null
          dom_domain_agg3?: string | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          itens?: number | null
          source_file?: string | null
          sub_cluster_seller?: string | null
          tim_month_id?: number | null
          updated_at?: string
          uploaded_at?: string
          vertical?: string | null
          vertical_item?: string | null
        }
        Relationships: []
      }
      cdp_mensal: {
        Row: {
          cp_investiments_seller_lc: number | null
          cp_investments_lc: number | null
          created_at: string
          cus_cust_id_sel: number
          cust_id_text: string | null
          dt_atualizacao: string | null
          f_tgmv_lc: number | null
          f_tgmv_lc_automatic: number | null
          f_tgmv_lc_cdp: number | null
          f_tgmv_lc_cupom: number | null
          f_tgmv_lc_custom_seller: number | null
          f_tgmv_lc_dod: number | null
          f_tgmv_lc_dxb: number | null
          f_tgmv_lc_lightning: number | null
          f_tgmv_lc_pre_acordo: number | null
          f_tgmv_lc_regular: number | null
          f_tgmv_lc_tiers: number | null
          meses_no_programa: number | null
          nombre_solucion: string | null
          programa: string
          safra: string | null
          seller_id: string | null
          tim_month_id: number
          total_investiments_lc: number | null
          total_rebates_lc: number | null
        }
        Insert: {
          cp_investiments_seller_lc?: number | null
          cp_investments_lc?: number | null
          created_at?: string
          cus_cust_id_sel: number
          cust_id_text?: string | null
          dt_atualizacao?: string | null
          f_tgmv_lc?: number | null
          f_tgmv_lc_automatic?: number | null
          f_tgmv_lc_cdp?: number | null
          f_tgmv_lc_cupom?: number | null
          f_tgmv_lc_custom_seller?: number | null
          f_tgmv_lc_dod?: number | null
          f_tgmv_lc_dxb?: number | null
          f_tgmv_lc_lightning?: number | null
          f_tgmv_lc_pre_acordo?: number | null
          f_tgmv_lc_regular?: number | null
          f_tgmv_lc_tiers?: number | null
          meses_no_programa?: number | null
          nombre_solucion?: string | null
          programa?: string
          safra?: string | null
          seller_id?: string | null
          tim_month_id: number
          total_investiments_lc?: number | null
          total_rebates_lc?: number | null
        }
        Update: {
          cp_investiments_seller_lc?: number | null
          cp_investments_lc?: number | null
          created_at?: string
          cus_cust_id_sel?: number
          cust_id_text?: string | null
          dt_atualizacao?: string | null
          f_tgmv_lc?: number | null
          f_tgmv_lc_automatic?: number | null
          f_tgmv_lc_cdp?: number | null
          f_tgmv_lc_cupom?: number | null
          f_tgmv_lc_custom_seller?: number | null
          f_tgmv_lc_dod?: number | null
          f_tgmv_lc_dxb?: number | null
          f_tgmv_lc_lightning?: number | null
          f_tgmv_lc_pre_acordo?: number | null
          f_tgmv_lc_regular?: number | null
          f_tgmv_lc_tiers?: number | null
          meses_no_programa?: number | null
          nombre_solucion?: string | null
          programa?: string
          safra?: string | null
          seller_id?: string | null
          tim_month_id?: number
          total_investiments_lc?: number | null
          total_rebates_lc?: number | null
        }
        Relationships: []
      }
      config_estimativa: {
        Row: {
          atualizado_em: string
          chave: string
          descricao: string
          valor: number
        }
        Insert: {
          atualizado_em?: string
          chave: string
          descricao: string
          valor: number
        }
        Update: {
          atualizado_em?: string
          chave?: string
          descricao?: string
          valor?: number
        }
        Relationships: []
      }
      cpp_mensal: {
        Row: {
          cdp_tgmv_lc: number | null
          cdp_tsi: number | null
          cluster_seller: string | null
          comparativo: string | null
          created_at: string
          cus_cust_id_sel: number
          cus_nickname: string | null
          cus_state: string | null
          cust_id_text: string | null
          f_tgmv_lc: number | null
          f_tsi: number | null
          fecha_in: string | null
          fecha_out: string | null
          h_l: string | null
          iniciativa: string | null
          inv_pads: number | null
          mes_ref: string | null
          meses_no_programa: number | null
          nivel_solucion: string | null
          nombre_solucion: string | null
          pontuacao_acos: number | null
          pontuacao_hi: number | null
          pontuacao_ipi: number | null
          pontuacao_itens_com_ads: number | null
          pontuacao_pct_dias_com_pads: number | null
          pontuacao_sow: number | null
          pontuacao_tacos: number | null
          programa: string | null
          rep_claims_rate: number | null
          rep_current_level: string | null
          score_final_bbf: number | null
          score_final_cdp: number | null
          score_final_full: number | null
          score_final_pads: number | null
          score_final_servicos: number | null
          seller_id: string | null
          sub_cluster_seller: string | null
          tgmv_lc: number | null
          tgmv_lc_fbm: number | null
          tgmv_lc_flex: number | null
          tgmv_lc_me2: number | null
          tgmv_lc_pads: number | null
          tim_month_id: number
          total_livelistings: number | null
          tsi: number | null
          tsi_flex: number | null
          tsi_full: number | null
          tsi_me2: number | null
          tsi_pads: number | null
          visitas: number | null
        }
        Insert: {
          cdp_tgmv_lc?: number | null
          cdp_tsi?: number | null
          cluster_seller?: string | null
          comparativo?: string | null
          created_at?: string
          cus_cust_id_sel: number
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id_text?: string | null
          f_tgmv_lc?: number | null
          f_tsi?: number | null
          fecha_in?: string | null
          fecha_out?: string | null
          h_l?: string | null
          iniciativa?: string | null
          inv_pads?: number | null
          mes_ref?: string | null
          meses_no_programa?: number | null
          nivel_solucion?: string | null
          nombre_solucion?: string | null
          pontuacao_acos?: number | null
          pontuacao_hi?: number | null
          pontuacao_ipi?: number | null
          pontuacao_itens_com_ads?: number | null
          pontuacao_pct_dias_com_pads?: number | null
          pontuacao_sow?: number | null
          pontuacao_tacos?: number | null
          programa?: string | null
          rep_claims_rate?: number | null
          rep_current_level?: string | null
          score_final_bbf?: number | null
          score_final_cdp?: number | null
          score_final_full?: number | null
          score_final_pads?: number | null
          score_final_servicos?: number | null
          seller_id?: string | null
          sub_cluster_seller?: string | null
          tgmv_lc?: number | null
          tgmv_lc_fbm?: number | null
          tgmv_lc_flex?: number | null
          tgmv_lc_me2?: number | null
          tgmv_lc_pads?: number | null
          tim_month_id: number
          total_livelistings?: number | null
          tsi?: number | null
          tsi_flex?: number | null
          tsi_full?: number | null
          tsi_me2?: number | null
          tsi_pads?: number | null
          visitas?: number | null
        }
        Update: {
          cdp_tgmv_lc?: number | null
          cdp_tsi?: number | null
          cluster_seller?: string | null
          comparativo?: string | null
          created_at?: string
          cus_cust_id_sel?: number
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id_text?: string | null
          f_tgmv_lc?: number | null
          f_tsi?: number | null
          fecha_in?: string | null
          fecha_out?: string | null
          h_l?: string | null
          iniciativa?: string | null
          inv_pads?: number | null
          mes_ref?: string | null
          meses_no_programa?: number | null
          nivel_solucion?: string | null
          nombre_solucion?: string | null
          pontuacao_acos?: number | null
          pontuacao_hi?: number | null
          pontuacao_ipi?: number | null
          pontuacao_itens_com_ads?: number | null
          pontuacao_pct_dias_com_pads?: number | null
          pontuacao_sow?: number | null
          pontuacao_tacos?: number | null
          programa?: string | null
          rep_claims_rate?: number | null
          rep_current_level?: string | null
          score_final_bbf?: number | null
          score_final_cdp?: number | null
          score_final_full?: number | null
          score_final_pads?: number | null
          score_final_servicos?: number | null
          seller_id?: string | null
          sub_cluster_seller?: string | null
          tgmv_lc?: number | null
          tgmv_lc_fbm?: number | null
          tgmv_lc_flex?: number | null
          tgmv_lc_me2?: number | null
          tgmv_lc_pads?: number | null
          tim_month_id?: number
          total_livelistings?: number | null
          tsi?: number | null
          tsi_flex?: number | null
          tsi_full?: number | null
          tsi_me2?: number | null
          tsi_pads?: number | null
          visitas?: number | null
        }
        Relationships: []
      }
      developer_alerts: {
        Row: {
          categoria: string
          codigo: string
          criado_em: string
          duracao_ms: number | null
          id: string
          mensagem: string
          origem: string
          reconhecido_em: string | null
        }
        Insert: {
          categoria: string
          codigo: string
          criado_em?: string
          duracao_ms?: number | null
          id?: string
          mensagem: string
          origem: string
          reconhecido_em?: string | null
        }
        Update: {
          categoria?: string
          codigo?: string
          criado_em?: string
          duracao_ms?: number | null
          id?: string
          mensagem?: string
          origem?: string
          reconhecido_em?: string | null
        }
        Relationships: []
      }
      drive_ingest_log: {
        Row: {
          chunks_processed: number | null
          created_at: string
          error_message: string | null
          file_id: string
          file_name: string
          file_size: number | null
          finished_at: string | null
          id: string
          import_type: string
          modified_time: string
          rows_imported: number | null
          started_at: string
          status: string
        }
        Insert: {
          chunks_processed?: number | null
          created_at?: string
          error_message?: string | null
          file_id: string
          file_name: string
          file_size?: number | null
          finished_at?: string | null
          id?: string
          import_type: string
          modified_time: string
          rows_imported?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          chunks_processed?: number | null
          created_at?: string
          error_message?: string | null
          file_id?: string
          file_name?: string
          file_size?: number | null
          finished_at?: string | null
          id?: string
          import_type?: string
          modified_time?: string
          rows_imported?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      fin_costs: {
        Row: {
          account_id: string
          concept_type: string | null
          cost_operation_id: string | null
          currency_id: string | null
          detail_type: string | null
          gross_amount: number | null
          id: number
          ml_cost_id: string | null
          net_cost: number | null
          operation_pk: number
          order_percentage_fee: number | null
          remaining: number | null
          tipo: string | null
          total_discount: number | null
        }
        Insert: {
          account_id: string
          concept_type?: string | null
          cost_operation_id?: string | null
          currency_id?: string | null
          detail_type?: string | null
          gross_amount?: number | null
          id?: number
          ml_cost_id?: string | null
          net_cost?: number | null
          operation_pk: number
          order_percentage_fee?: number | null
          remaining?: number | null
          tipo?: string | null
          total_discount?: number | null
        }
        Update: {
          account_id?: string
          concept_type?: string | null
          cost_operation_id?: string | null
          currency_id?: string | null
          detail_type?: string | null
          gross_amount?: number | null
          id?: number
          ml_cost_id?: string | null
          net_cost?: number | null
          operation_pk?: number
          order_percentage_fee?: number | null
          remaining?: number | null
          tipo?: string | null
          total_discount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_costs_account_fk"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_costs_operation_pk_fkey"
            columns: ["operation_pk"]
            isOneToOne: false
            referencedRelation: "fin_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_operations: {
        Row: {
          account_id: string
          buyer_shipping_charge: number | null
          data_competencia: string | null
          gross_price: number | null
          id: number
          ingested_at: string | null
          meli_rebate: number | null
          ml_item_id: string | null
          net_costs: number | null
          operation_date: string
          operation_id: string
          operation_type: string
          pack_id: string | null
          pending_costs: number | null
          quantidade: number | null
          raw_id: number | null
          sale_price: number | null
          seller_gross_income: number | null
          seller_net_income: number | null
          shipment_id: string | null
          shipping_cost: number | null
          shipping_logistic_type: string | null
          shipping_type: string | null
          sku: string | null
          status: string | null
          tax_withholding_amount: number | null
          titulo: string | null
          total_discount: number | null
          total_income: number | null
          total_meli_discount: number | null
          total_order_amount: number | null
          total_price: number | null
          total_seller_discount: number | null
          transparent_meli_discount: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          buyer_shipping_charge?: number | null
          data_competencia?: string | null
          gross_price?: number | null
          id?: number
          ingested_at?: string | null
          meli_rebate?: number | null
          ml_item_id?: string | null
          net_costs?: number | null
          operation_date: string
          operation_id: string
          operation_type: string
          pack_id?: string | null
          pending_costs?: number | null
          quantidade?: number | null
          raw_id?: number | null
          sale_price?: number | null
          seller_gross_income?: number | null
          seller_net_income?: number | null
          shipment_id?: string | null
          shipping_cost?: number | null
          shipping_logistic_type?: string | null
          shipping_type?: string | null
          sku?: string | null
          status?: string | null
          tax_withholding_amount?: number | null
          titulo?: string | null
          total_discount?: number | null
          total_income?: number | null
          total_meli_discount?: number | null
          total_order_amount?: number | null
          total_price?: number | null
          total_seller_discount?: number | null
          transparent_meli_discount?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          buyer_shipping_charge?: number | null
          data_competencia?: string | null
          gross_price?: number | null
          id?: number
          ingested_at?: string | null
          meli_rebate?: number | null
          ml_item_id?: string | null
          net_costs?: number | null
          operation_date?: string
          operation_id?: string
          operation_type?: string
          pack_id?: string | null
          pending_costs?: number | null
          quantidade?: number | null
          raw_id?: number | null
          sale_price?: number | null
          seller_gross_income?: number | null
          seller_net_income?: number | null
          shipment_id?: string | null
          shipping_cost?: number | null
          shipping_logistic_type?: string | null
          shipping_type?: string | null
          sku?: string | null
          status?: string | null
          tax_withholding_amount?: number | null
          titulo?: string | null
          total_discount?: number | null
          total_income?: number | null
          total_meli_discount?: number | null
          total_order_amount?: number | null
          total_price?: number | null
          total_seller_discount?: number | null
          transparent_meli_discount?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_operations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_operations_raw_id_fkey"
            columns: ["raw_id"]
            isOneToOne: false
            referencedRelation: "stg_ml_daily_raw"
            referencedColumns: ["id"]
          },
        ]
      }
      gm_concessionarias: {
        Row: {
          cidade: string | null
          created_at: string
          cust_id: string
          divisao: string
          id: string
          nome: string
          responsavel: string | null
          status: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          cust_id: string
          divisao: string
          id?: string
          nome: string
          responsavel?: string | null
          status: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          created_at?: string
          cust_id?: string
          divisao?: string
          id?: string
          nome?: string
          responsavel?: string | null
          status?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gm_elegibilidade: {
        Row: {
          acao_recomendada: string | null
          campaign_created_dt: string | null
          campaign_finished_dt: string | null
          campaign_id: string | null
          campaign_type: string | null
          created_at: string
          cus_cust_id_sel: number | null
          cus_nickname: string | null
          cust_id_text: string | null
          data_atualizacao: string | null
          discount_seller_percentage: number | null
          discount_total: number | null
          estoque_medio_7d: number | null
          estoque_medio_full_7d: number | null
          flag_best_promo: boolean | null
          flag_item_optin: boolean | null
          flag_seller_optin: boolean | null
          id: string
          item_id: number | null
          item_name: string | null
          media_tsi_diario_7d: number | null
          meses_no_programa: number | null
          nombre_solucion: string | null
          pedidos_7d: number | null
          programa: string | null
          safra: string | null
          seller_id: string | null
          vertical_item: string | null
        }
        Insert: {
          acao_recomendada?: string | null
          campaign_created_dt?: string | null
          campaign_finished_dt?: string | null
          campaign_id?: string | null
          campaign_type?: string | null
          created_at?: string
          cus_cust_id_sel?: number | null
          cus_nickname?: string | null
          cust_id_text?: string | null
          data_atualizacao?: string | null
          discount_seller_percentage?: number | null
          discount_total?: number | null
          estoque_medio_7d?: number | null
          estoque_medio_full_7d?: number | null
          flag_best_promo?: boolean | null
          flag_item_optin?: boolean | null
          flag_seller_optin?: boolean | null
          id?: string
          item_id?: number | null
          item_name?: string | null
          media_tsi_diario_7d?: number | null
          meses_no_programa?: number | null
          nombre_solucion?: string | null
          pedidos_7d?: number | null
          programa?: string | null
          safra?: string | null
          seller_id?: string | null
          vertical_item?: string | null
        }
        Update: {
          acao_recomendada?: string | null
          campaign_created_dt?: string | null
          campaign_finished_dt?: string | null
          campaign_id?: string | null
          campaign_type?: string | null
          created_at?: string
          cus_cust_id_sel?: number | null
          cus_nickname?: string | null
          cust_id_text?: string | null
          data_atualizacao?: string | null
          discount_seller_percentage?: number | null
          discount_total?: number | null
          estoque_medio_7d?: number | null
          estoque_medio_full_7d?: number | null
          flag_best_promo?: boolean | null
          flag_item_optin?: boolean | null
          flag_seller_optin?: boolean | null
          id?: string
          item_id?: number | null
          item_name?: string | null
          media_tsi_diario_7d?: number | null
          meses_no_programa?: number | null
          nombre_solucion?: string | null
          pedidos_7d?: number | null
          programa?: string | null
          safra?: string | null
          seller_id?: string | null
          vertical_item?: string | null
        }
        Relationships: []
      }
      gm_live_listings: {
        Row: {
          categoria: string | null
          cluster_seller: string | null
          created_at: string
          cus_cust_id_sel: number | null
          cus_nickname: string | null
          cus_state: string | null
          cust_id_text: string | null
          data: string | null
          dom_domain_agg1: string | null
          dom_domain_agg2: string | null
          dom_domain_agg3: string | null
          h_l: string | null
          id: string
          iniciativa: string | null
          itens: number | null
          nivel_solucion: string | null
          programa: string | null
          seller_id: string | null
          sub_cluster_seller: string | null
          tim_month_id: number | null
          vertical: string | null
        }
        Insert: {
          categoria?: string | null
          cluster_seller?: string | null
          created_at?: string
          cus_cust_id_sel?: number | null
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id_text?: string | null
          data?: string | null
          dom_domain_agg1?: string | null
          dom_domain_agg2?: string | null
          dom_domain_agg3?: string | null
          h_l?: string | null
          id?: string
          iniciativa?: string | null
          itens?: number | null
          nivel_solucion?: string | null
          programa?: string | null
          seller_id?: string | null
          sub_cluster_seller?: string | null
          tim_month_id?: number | null
          vertical?: string | null
        }
        Update: {
          categoria?: string | null
          cluster_seller?: string | null
          created_at?: string
          cus_cust_id_sel?: number | null
          cus_nickname?: string | null
          cus_state?: string | null
          cust_id_text?: string | null
          data?: string | null
          dom_domain_agg1?: string | null
          dom_domain_agg2?: string | null
          dom_domain_agg3?: string | null
          h_l?: string | null
          id?: string
          iniciativa?: string | null
          itens?: number | null
          nivel_solucion?: string | null
          programa?: string | null
          seller_id?: string | null
          sub_cluster_seller?: string | null
          tim_month_id?: number | null
          vertical?: string | null
        }
        Relationships: []
      }
      grupos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          dono_user_id: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dono_user_id?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dono_user_id?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingest_log: {
        Row: {
          errors_json: Json | null
          file: string
          id: string
          rows_in: number | null
          rows_upserted: number | null
          run_at: string
          uploaded_by: string | null
        }
        Insert: {
          errors_json?: Json | null
          file: string
          id?: string
          rows_in?: number | null
          rows_upserted?: number | null
          run_at?: string
          uploaded_by?: string | null
        }
        Update: {
          errors_json?: Json | null
          file?: string
          id?: string
          rows_in?: number | null
          rows_upserted?: number | null
          run_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      ingestao_execucoes: {
        Row: {
          arquivo: string
          erro: string | null
          feed: string
          finalizado_em: string | null
          id: string
          iniciado_em: string
          linhas_gravadas: number | null
          linhas_lidas: number | null
          status: string
        }
        Insert: {
          arquivo: string
          erro?: string | null
          feed: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          linhas_gravadas?: number | null
          linhas_lidas?: number | null
          status: string
        }
        Update: {
          arquivo?: string
          erro?: string | null
          feed?: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          linhas_gravadas?: number | null
          linhas_lidas?: number | null
          status?: string
        }
        Relationships: []
      }
      live_listings: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          dom_domain_agg1: string | null
          id: string
          itens: number | null
          seller_id: string
          vertical: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data: string
          dom_domain_agg1?: string | null
          id?: string
          itens?: number | null
          seller_id: string
          vertical?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          dom_domain_agg1?: string | null
          id?: string
          itens?: number | null
          seller_id?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_bridge"
            referencedColumns: ["seller_uuid"]
          },
        ]
      }
      live_listings_backup_20260113_ghost: {
        Row: {
          backed_up_at: string
          categoria: string | null
          created_at: string | null
          data: string | null
          dom_domain_agg1: string | null
          id: string | null
          itens: number | null
          seller_id: string | null
          vertical: string | null
        }
        Insert: {
          backed_up_at?: string
          categoria?: string | null
          created_at?: string | null
          data?: string | null
          dom_domain_agg1?: string | null
          id?: string | null
          itens?: number | null
          seller_id?: string | null
          vertical?: string | null
        }
        Update: {
          backed_up_at?: string
          categoria?: string | null
          created_at?: string | null
          data?: string | null
          dom_domain_agg1?: string | null
          id?: string | null
          itens?: number | null
          seller_id?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      meli_campaigns: {
        Row: {
          created_at: string
          cust_id: string
          data: string
          efect_rta_vertical: number | null
          id: string
          seller_id: string
          taxa_conversao_vertical: number | null
          vertical_principal: string | null
        }
        Insert: {
          created_at?: string
          cust_id: string
          data: string
          efect_rta_vertical?: number | null
          id?: string
          seller_id: string
          taxa_conversao_vertical?: number | null
          vertical_principal?: string | null
        }
        Update: {
          created_at?: string
          cust_id?: string
          data?: string
          efect_rta_vertical?: number | null
          id?: string
          seller_id?: string
          taxa_conversao_vertical?: number | null
          vertical_principal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meli_campaigns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meli_campaigns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_bridge"
            referencedColumns: ["seller_uuid"]
          },
        ]
      }
      metas_loja: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mes: string
          meta_clips: number | null
          meta_faturamento: number | null
          meta_reposicao: number | null
          observacao: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mes: string
          meta_clips?: number | null
          meta_faturamento?: number | null
          meta_reposicao?: number | null
          observacao?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mes?: string
          meta_clips?: number | null
          meta_faturamento?: number | null
          meta_reposicao?: number | null
          observacao?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_loja_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_loja_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_bridge"
            referencedColumns: ["seller_uuid"]
          },
        ]
      }
      ml_accounts: {
        Row: {
          conectado_por: string | null
          created_at: string | null
          id: string
          last_sync_daily_at: string | null
          ml_user_id: number
          nickname: string | null
          site_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          conectado_por?: string | null
          created_at?: string | null
          id?: string
          last_sync_daily_at?: string | null
          ml_user_id: number
          nickname?: string | null
          site_id?: string
          status?: string
          tenant_id: string
        }
        Update: {
          conectado_por?: string | null
          created_at?: string | null
          id?: string
          last_sync_daily_at?: string | null
          ml_user_id?: number
          nickname?: string | null
          site_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_action_requests: {
        Row: {
          acao: string
          account_id: string
          antes: Json | null
          atualizado_em: string
          codigo_ml: string | null
          criado_em: string
          depois: Json | null
          erro: string | null
          estado_ml_hash: string | null
          id: string
          idempotency_key: string
          payload: Json | null
          resposta_ml: Json | null
          status: string
          usuario_id: string
        }
        Insert: {
          acao: string
          account_id: string
          antes?: Json | null
          atualizado_em?: string
          codigo_ml?: string | null
          criado_em?: string
          depois?: Json | null
          erro?: string | null
          estado_ml_hash?: string | null
          id?: string
          idempotency_key: string
          payload?: Json | null
          resposta_ml?: Json | null
          status: string
          usuario_id: string
        }
        Update: {
          acao?: string
          account_id?: string
          antes?: Json | null
          atualizado_em?: string
          codigo_ml?: string | null
          criado_em?: string
          depois?: Json | null
          erro?: string | null
          estado_ml_hash?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json | null
          resposta_ml?: Json | null
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_action_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_ads_ads: {
        Row: {
          account_id: string
          ad_group_id: number
          ad_group_type: string | null
          advertiser_id: number
          campaign_id: number | null
          catalog_listing: boolean | null
          channel: string | null
          external_id: string | null
          site_id: string
          status: string | null
          synced_at: string
          title: string | null
        }
        Insert: {
          account_id: string
          ad_group_id: number
          ad_group_type?: string | null
          advertiser_id: number
          campaign_id?: number | null
          catalog_listing?: boolean | null
          channel?: string | null
          external_id?: string | null
          site_id: string
          status?: string | null
          synced_at?: string
          title?: string | null
        }
        Update: {
          account_id?: string
          ad_group_id?: number
          ad_group_type?: string | null
          advertiser_id?: number
          campaign_id?: number | null
          catalog_listing?: boolean | null
          channel?: string | null
          external_id?: string | null
          site_id?: string
          status?: string | null
          synced_at?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_ads_ads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_ads_advertisers: {
        Row: {
          account_id: string
          account_name: string | null
          advertiser_id: number
          advertiser_name: string | null
          site_id: string
          synced_at: string
        }
        Insert: {
          account_id: string
          account_name?: string | null
          advertiser_id: number
          advertiser_name?: string | null
          site_id: string
          synced_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string | null
          advertiser_id?: number
          advertiser_name?: string | null
          site_id?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_ads_advertisers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_ads_campaigns: {
        Row: {
          account_id: string
          acos_target: number | null
          advertiser_id: number
          automatic_budget: boolean | null
          budget: number | null
          campaign_id: number
          channel: string | null
          currency_id: string | null
          daily_budget: number | null
          date_created: string | null
          last_updated: string | null
          name: string | null
          roas_target: number | null
          site_id: string
          status: string | null
          strategy: string | null
          synced_at: string
        }
        Insert: {
          account_id: string
          acos_target?: number | null
          advertiser_id: number
          automatic_budget?: boolean | null
          budget?: number | null
          campaign_id: number
          channel?: string | null
          currency_id?: string | null
          daily_budget?: number | null
          date_created?: string | null
          last_updated?: string | null
          name?: string | null
          roas_target?: number | null
          site_id: string
          status?: string | null
          strategy?: string | null
          synced_at?: string
        }
        Update: {
          account_id?: string
          acos_target?: number | null
          advertiser_id?: number
          automatic_budget?: boolean | null
          budget?: number | null
          campaign_id?: number
          channel?: string | null
          currency_id?: string | null
          daily_budget?: number | null
          date_created?: string | null
          last_updated?: string | null
          name?: string | null
          roas_target?: number | null
          site_id?: string
          status?: string | null
          strategy?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_ads_campaigns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_ads_dias_sync: {
        Row: {
          account_id: string
          campaign_id: number
          dia: string
          synced_at: string
        }
        Insert: {
          account_id: string
          campaign_id: number
          dia: string
          synced_at?: string
        }
        Update: {
          account_id?: string
          campaign_id?: number
          dia?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_ads_dias_sync_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_ads_estado: {
        Row: {
          account_id: string
          metricas_campanha_em: string | null
          status: string
          synced_at: string
        }
        Insert: {
          account_id: string
          metricas_campanha_em?: string | null
          status: string
          synced_at?: string
        }
        Update: {
          account_id?: string
          metricas_campanha_em?: string | null
          status?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_ads_estado_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_ads_metrics_daily: {
        Row: {
          account_id: string
          acos: number | null
          ad_group_id: number
          campaign_id: number
          clicks: number | null
          cost: number | null
          cpc: number | null
          ctr: number | null
          cvr: number | null
          dia: string
          direct_amount: number | null
          indirect_amount: number | null
          nivel: string
          prints: number | null
          roas: number | null
          synced_at: string
          total_amount: number | null
          units_quantity: number | null
        }
        Insert: {
          account_id: string
          acos?: number | null
          ad_group_id?: number
          campaign_id: number
          clicks?: number | null
          cost?: number | null
          cpc?: number | null
          ctr?: number | null
          cvr?: number | null
          dia: string
          direct_amount?: number | null
          indirect_amount?: number | null
          nivel: string
          prints?: number | null
          roas?: number | null
          synced_at?: string
          total_amount?: number | null
          units_quantity?: number | null
        }
        Update: {
          account_id?: string
          acos?: number | null
          ad_group_id?: number
          campaign_id?: number
          clicks?: number | null
          cost?: number | null
          cpc?: number | null
          ctr?: number | null
          cvr?: number | null
          dia?: string
          direct_amount?: number | null
          indirect_amount?: number | null
          nivel?: string
          prints?: number | null
          roas?: number | null
          synced_at?: string
          total_amount?: number | null
          units_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_ads_metrics_daily_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_anuncios: {
        Row: {
          atualizado_em: string
          cust_id: string
          estoque: number | null
          foto: string | null
          frete_gratis: boolean | null
          is_full: boolean | null
          item_id: string
          link: string | null
          preco: number | null
          preco_original: number | null
          status: string | null
          titulo: string | null
          vendidos: number | null
        }
        Insert: {
          atualizado_em?: string
          cust_id: string
          estoque?: number | null
          foto?: string | null
          frete_gratis?: boolean | null
          is_full?: boolean | null
          item_id: string
          link?: string | null
          preco?: number | null
          preco_original?: number | null
          status?: string | null
          titulo?: string | null
          vendidos?: number | null
        }
        Update: {
          atualizado_em?: string
          cust_id?: string
          estoque?: number | null
          foto?: string | null
          frete_gratis?: boolean | null
          is_full?: boolean | null
          item_id?: string
          link?: string | null
          preco?: number | null
          preco_original?: number | null
          status?: string | null
          titulo?: string | null
          vendidos?: number | null
        }
        Relationships: []
      }
      ml_audit_log: {
        Row: {
          acao: string
          account_id: string | null
          codigo_ml: string | null
          criado_em: string
          id: string
          payload: Json | null
          resposta_ml: Json | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          account_id?: string | null
          codigo_ml?: string | null
          criado_em?: string
          id?: string
          payload?: Json | null
          resposta_ml?: Json | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          account_id?: string | null
          codigo_ml?: string | null
          criado_em?: string
          id?: string
          payload?: Json | null
          resposta_ml?: Json | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_audit_log_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_convites: {
        Row: {
          created_at: string
          criado_por: string
          expires_at: string
          ml_user_id: number | null
          rotulo: string | null
          tenant_id: string
          token: string
          usado_em: string | null
        }
        Insert: {
          created_at?: string
          criado_por: string
          expires_at?: string
          ml_user_id?: number | null
          rotulo?: string | null
          tenant_id: string
          token: string
          usado_em?: string | null
        }
        Update: {
          created_at?: string
          criado_por?: string
          expires_at?: string
          ml_user_id?: number | null
          rotulo?: string | null
          tenant_id?: string
          token?: string
          usado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_convites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_listing_improvements: {
        Row: {
          account_id: string
          achados_altos: number
          achados_total: number
          diagnostico: Json
          entrada_hash: string
          erro_ia: string | null
          gerado_em: string
          gerado_por: string | null
          ia: Json | null
          item_id: string
          modelo: string | null
          origem: string
          qualidade_score: number | null
          titulo: string | null
          verificado_em: string
        }
        Insert: {
          account_id: string
          achados_altos?: number
          achados_total?: number
          diagnostico: Json
          entrada_hash: string
          erro_ia?: string | null
          gerado_em?: string
          gerado_por?: string | null
          ia?: Json | null
          item_id: string
          modelo?: string | null
          origem: string
          qualidade_score?: number | null
          titulo?: string | null
          verificado_em?: string
        }
        Update: {
          account_id?: string
          achados_altos?: number
          achados_total?: number
          diagnostico?: Json
          entrada_hash?: string
          erro_ia?: string | null
          gerado_em?: string
          gerado_por?: string | null
          ia?: Json | null
          item_id?: string
          modelo?: string | null
          origem?: string
          qualidade_score?: number | null
          titulo?: string | null
          verificado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_listing_improvements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_listings: {
        Row: {
          account_id: string
          catalog_product_id: string | null
          catalogo: boolean | null
          categoria_id: string | null
          estoque: number | null
          family_id: string | null
          frete_gratis: boolean | null
          item_id: string
          link: string | null
          logistica: string | null
          moeda: string | null
          preco: number | null
          preco_original: number | null
          saude: number | null
          sku: string | null
          skus: string[]
          status: string | null
          sub_status: string[]
          synced_at: string
          thumbnail: string | null
          tipo_anuncio: string | null
          titulo: string | null
          variacoes: Json
          vendidos: number | null
        }
        Insert: {
          account_id: string
          catalog_product_id?: string | null
          catalogo?: boolean | null
          categoria_id?: string | null
          estoque?: number | null
          family_id?: string | null
          frete_gratis?: boolean | null
          item_id: string
          link?: string | null
          logistica?: string | null
          moeda?: string | null
          preco?: number | null
          preco_original?: number | null
          saude?: number | null
          sku?: string | null
          skus?: string[]
          status?: string | null
          sub_status?: string[]
          synced_at?: string
          thumbnail?: string | null
          tipo_anuncio?: string | null
          titulo?: string | null
          variacoes?: Json
          vendidos?: number | null
        }
        Update: {
          account_id?: string
          catalog_product_id?: string | null
          catalogo?: boolean | null
          categoria_id?: string | null
          estoque?: number | null
          family_id?: string | null
          frete_gratis?: boolean | null
          item_id?: string
          link?: string | null
          logistica?: string | null
          moeda?: string | null
          preco?: number | null
          preco_original?: number | null
          saude?: number | null
          sku?: string | null
          skus?: string[]
          status?: string | null
          sub_status?: string[]
          synced_at?: string
          thumbnail?: string | null
          tipo_anuncio?: string | null
          titulo?: string | null
          variacoes?: Json
          vendidos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_listings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_listings_estado: {
        Row: {
          account_id: string
          completo_em: string | null
          lidos: number | null
          pendentes: number | null
          synced_at: string
          total_ml: number | null
        }
        Insert: {
          account_id: string
          completo_em?: string | null
          lidos?: number | null
          pendentes?: number | null
          synced_at?: string
          total_ml?: number | null
        }
        Update: {
          account_id?: string
          completo_em?: string | null
          lidos?: number | null
          pendentes?: number | null
          synced_at?: string
          total_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_listings_estado_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_market_studies: {
        Row: {
          account_id: string
          categoria_id: string | null
          categoria_nome: string | null
          criado_em: string
          criado_por: string | null
          custo: number | null
          erro_ia: string | null
          frete: number | null
          ia: Json | null
          id: string
          item_id: string
          modelo: string | null
          resultado: Json
          sinais_amarelos: number
          sinais_verdes: number
          sinais_vermelhos: number
          titulo: string | null
        }
        Insert: {
          account_id: string
          categoria_id?: string | null
          categoria_nome?: string | null
          criado_em?: string
          criado_por?: string | null
          custo?: number | null
          erro_ia?: string | null
          frete?: number | null
          ia?: Json | null
          id?: string
          item_id: string
          modelo?: string | null
          resultado: Json
          sinais_amarelos?: number
          sinais_verdes?: number
          sinais_vermelhos?: number
          titulo?: string | null
        }
        Update: {
          account_id?: string
          categoria_id?: string | null
          categoria_nome?: string | null
          criado_em?: string
          criado_por?: string | null
          custo?: number | null
          erro_ia?: string | null
          frete?: number | null
          ia?: Json | null
          id?: string
          item_id?: string
          modelo?: string | null
          resultado?: Json
          sinais_amarelos?: number
          sinais_verdes?: number
          sinais_vermelhos?: number
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_market_studies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_notificacoes: {
        Row: {
          application_id: number | null
          attempts: number | null
          enviado_em: string | null
          id: string
          ml_user_id: number | null
          payload: Json | null
          processado: boolean
          recebido_em: string
          resource: string
          topic: string
        }
        Insert: {
          application_id?: number | null
          attempts?: number | null
          enviado_em?: string | null
          id?: string
          ml_user_id?: number | null
          payload?: Json | null
          processado?: boolean
          recebido_em?: string
          resource: string
          topic: string
        }
        Update: {
          application_id?: number | null
          attempts?: number | null
          enviado_em?: string | null
          id?: string
          ml_user_id?: number | null
          payload?: Json | null
          processado?: boolean
          recebido_em?: string
          resource?: string
          topic?: string
        }
        Relationships: []
      }
      ml_oauth_states: {
        Row: {
          consumed_at: string | null
          convite_token: string | null
          created_at: string
          expires_at: string
          seller_id: string | null
          state: string
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          consumed_at?: string | null
          convite_token?: string | null
          created_at?: string
          expires_at?: string
          seller_id?: string | null
          state: string
          tenant_id: string
          usuario_id: string
        }
        Update: {
          consumed_at?: string | null
          convite_token?: string | null
          created_at?: string
          expires_at?: string
          seller_id?: string | null
          state?: string
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_oauth_states_convite_token_fkey"
            columns: ["convite_token"]
            isOneToOne: false
            referencedRelation: "ml_convites"
            referencedColumns: ["token"]
          },
          {
            foreignKeyName: "ml_oauth_states_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_promotion_items: {
        Row: {
          account_id: string
          estoque_max: number | null
          estoque_min: number | null
          fim: string | null
          inicio: string | null
          item_id: string
          meli_pct: number | null
          offer_id: string | null
          preco: number | null
          preco_max: number | null
          preco_min: number | null
          preco_original: number | null
          preco_sugerido: number | null
          promotion_id: string
          status: string
          status_item: string | null
          synced_at: string
          tipo: string
          vendedor_pct: number | null
        }
        Insert: {
          account_id: string
          estoque_max?: number | null
          estoque_min?: number | null
          fim?: string | null
          inicio?: string | null
          item_id: string
          meli_pct?: number | null
          offer_id?: string | null
          preco?: number | null
          preco_max?: number | null
          preco_min?: number | null
          preco_original?: number | null
          preco_sugerido?: number | null
          promotion_id: string
          status: string
          status_item?: string | null
          synced_at?: string
          tipo: string
          vendedor_pct?: number | null
        }
        Update: {
          account_id?: string
          estoque_max?: number | null
          estoque_min?: number | null
          fim?: string | null
          inicio?: string | null
          item_id?: string
          meli_pct?: number | null
          offer_id?: string | null
          preco?: number | null
          preco_max?: number | null
          preco_min?: number | null
          preco_original?: number | null
          preco_sugerido?: number | null
          promotion_id?: string
          status?: string
          status_item?: string | null
          synced_at?: string
          tipo?: string
          vendedor_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_promotion_items_account_id_promotion_id_fkey"
            columns: ["account_id", "promotion_id"]
            isOneToOne: false
            referencedRelation: "ml_promotions"
            referencedColumns: ["account_id", "promotion_id"]
          },
        ]
      }
      ml_promotions: {
        Row: {
          account_id: string
          beneficios: Json | null
          candidatos: number | null
          extras: Json
          fim: string | null
          inicio: string | null
          itens_completo: boolean
          itens_sync_em: string | null
          nome: string | null
          participando: number | null
          prazo: string | null
          promotion_id: string
          status: string | null
          sub_tipo: string | null
          synced_at: string
          tipo: string
        }
        Insert: {
          account_id: string
          beneficios?: Json | null
          candidatos?: number | null
          extras?: Json
          fim?: string | null
          inicio?: string | null
          itens_completo?: boolean
          itens_sync_em?: string | null
          nome?: string | null
          participando?: number | null
          prazo?: string | null
          promotion_id: string
          status?: string | null
          sub_tipo?: string | null
          synced_at?: string
          tipo: string
        }
        Update: {
          account_id?: string
          beneficios?: Json | null
          candidatos?: number | null
          extras?: Json
          fim?: string | null
          inicio?: string | null
          itens_completo?: boolean
          itens_sync_em?: string | null
          nome?: string | null
          participando?: number | null
          prazo?: string | null
          promotion_id?: string
          status?: string | null
          sub_tipo?: string | null
          synced_at?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_promotions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_questions: {
        Row: {
          account_id: string
          data_criacao: string | null
          from_id: number | null
          item_id: string | null
          item_link: string | null
          item_thumbnail: string | null
          item_titulo: string | null
          question_id: number
          respondida_por: string | null
          resposta_data: string | null
          resposta_status: string | null
          resposta_texto: string | null
          status: string
          synced_at: string
          texto: string | null
        }
        Insert: {
          account_id: string
          data_criacao?: string | null
          from_id?: number | null
          item_id?: string | null
          item_link?: string | null
          item_thumbnail?: string | null
          item_titulo?: string | null
          question_id: number
          respondida_por?: string | null
          resposta_data?: string | null
          resposta_status?: string | null
          resposta_texto?: string | null
          status: string
          synced_at?: string
          texto?: string | null
        }
        Update: {
          account_id?: string
          data_criacao?: string | null
          from_id?: number | null
          item_id?: string | null
          item_link?: string | null
          item_thumbnail?: string | null
          item_titulo?: string | null
          question_id?: number
          respondida_por?: string | null
          resposta_data?: string | null
          resposta_status?: string | null
          resposta_texto?: string | null
          status?: string
          synced_at?: string
          texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_questions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_refresh_locks: {
        Row: {
          account_id: string
          locked_at: string
        }
        Insert: {
          account_id: string
          locked_at?: string
        }
        Update: {
          account_id?: string
          locked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_refresh_locks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_settings: {
        Row: {
          account_id: string
          acos_alvo: number | null
          alerta_acos: number
          alerta_cpc: number
          alerta_ctr: number
          alerta_roas: number
          alerta_tacos: number
          atualizado_em: string
          atualizado_por: string | null
          margem_minima: number | null
          meta_investimento_ads: number
        }
        Insert: {
          account_id: string
          acos_alvo?: number | null
          alerta_acos?: number
          alerta_cpc?: number
          alerta_ctr?: number
          alerta_roas?: number
          alerta_tacos?: number
          atualizado_em?: string
          atualizado_por?: string | null
          margem_minima?: number | null
          meta_investimento_ads?: number
        }
        Update: {
          account_id?: string
          acos_alvo?: number | null
          alerta_acos?: number
          alerta_cpc?: number
          alerta_ctr?: number
          alerta_roas?: number
          alerta_tacos?: number
          atualizado_em?: string
          atualizado_por?: string | null
          margem_minima?: number | null
          meta_investimento_ads?: number
        }
        Relationships: [
          {
            foreignKeyName: "ml_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_sync_tema: {
        Row: {
          account_id: string
          atualizado_em: string
          cust_id: string
          dados: Json | null
          erro: string | null
          tema: string
        }
        Insert: {
          account_id: string
          atualizado_em?: string
          cust_id: string
          dados?: Json | null
          erro?: string | null
          tema: string
        }
        Update: {
          account_id?: string
          atualizado_em?: string
          cust_id?: string
          dados?: Json | null
          erro?: string | null
          tema?: string
        }
        Relationships: []
      }
      ml_tokens: {
        Row: {
          access_token: string
          account_id: string
          created_at: string | null
          expires_at: string
          id: number
          is_current: boolean
          refresh_token: string
          scope: string | null
        }
        Insert: {
          access_token: string
          account_id: string
          created_at?: string | null
          expires_at: string
          id?: number
          is_current?: boolean
          refresh_token: string
          scope?: string | null
        }
        Update: {
          access_token?: string
          account_id?: string
          created_at?: string | null
          expires_at?: string
          id?: number
          is_current?: boolean
          refresh_token?: string
          scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_trend_categorias: {
        Row: {
          category_id: string
          escopo_id: string | null
          escopo_nome: string | null
          nome: string | null
          verificado_em: string
        }
        Insert: {
          category_id: string
          escopo_id?: string | null
          escopo_nome?: string | null
          nome?: string | null
          verificado_em?: string
        }
        Update: {
          category_id?: string
          escopo_id?: string | null
          escopo_nome?: string | null
          nome?: string | null
          verificado_em?: string
        }
        Relationships: []
      }
      ml_trends_coletas: {
        Row: {
          coletado_em: string
          escopo: string
          nome: string | null
          semana: string
          termos: number
        }
        Insert: {
          coletado_em?: string
          escopo: string
          nome?: string | null
          semana: string
          termos?: number
        }
        Update: {
          coletado_em?: string
          escopo?: string
          nome?: string | null
          semana?: string
          termos?: number
        }
        Relationships: []
      }
      ml_trends_weekly: {
        Row: {
          coletado_em: string
          escopo: string
          grupo: string
          palavra: string
          posicao: number
          semana: string
          url: string | null
        }
        Insert: {
          coletado_em?: string
          escopo: string
          grupo: string
          palavra: string
          posicao: number
          semana: string
          url?: string | null
        }
        Update: {
          coletado_em?: string
          escopo?: string
          grupo?: string
          palavra?: string
          posicao?: number
          semana?: string
          url?: string | null
        }
        Relationships: []
      }
      ml_webhook_events: {
        Row: {
          account_id: string | null
          application_id: string | null
          codigo_ml: string | null
          dedupe_key: string
          erro: string | null
          id: string
          ml_user_id: number | null
          payload: Json
          processado_em: string | null
          recebido_em: string
          recurso: Json | null
          resource: string
          status: string
          topic: string
        }
        Insert: {
          account_id?: string | null
          application_id?: string | null
          codigo_ml?: string | null
          dedupe_key: string
          erro?: string | null
          id?: string
          ml_user_id?: number | null
          payload: Json
          processado_em?: string | null
          recebido_em?: string
          recurso?: Json | null
          resource: string
          status?: string
          topic: string
        }
        Update: {
          account_id?: string | null
          application_id?: string | null
          codigo_ml?: string | null
          dedupe_key?: string
          erro?: string | null
          id?: string
          ml_user_id?: number | null
          payload?: Json
          processado_em?: string | null
          recebido_em?: string
          recurso?: Json | null
          resource?: string
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_webhook_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      multilojas_carga: {
        Row: {
          arquivo: string
          ativa: boolean
          bytes: number | null
          created_at: string
          diagnostico: Json | null
          enviado_por: string | null
          fonte_id: string
          gmv: number | null
          hash: string
          id: string
          linhas: number | null
          periodo_fim: string | null
          periodo_ini: string | null
          responsavel: string | null
          validas: number | null
        }
        Insert: {
          arquivo: string
          ativa?: boolean
          bytes?: number | null
          created_at?: string
          diagnostico?: Json | null
          enviado_por?: string | null
          fonte_id: string
          gmv?: number | null
          hash: string
          id?: string
          linhas?: number | null
          periodo_fim?: string | null
          periodo_ini?: string | null
          responsavel?: string | null
          validas?: number | null
        }
        Update: {
          arquivo?: string
          ativa?: boolean
          bytes?: number | null
          created_at?: string
          diagnostico?: Json | null
          enviado_por?: string | null
          fonte_id?: string
          gmv?: number | null
          hash?: string
          id?: string
          linhas?: number | null
          periodo_fim?: string | null
          periodo_ini?: string | null
          responsavel?: string | null
          validas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "multilojas_carga_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "multilojas_fonte"
            referencedColumns: ["id"]
          },
        ]
      }
      multilojas_conta: {
        Row: {
          atualizado_em: string
          cluster: string | null
          created_at: string
          cust_id: string
          meses_programa: number | null
          nickname: string | null
          nivel: string | null
          programa: string | null
          safra: string | null
          sub_cluster: string | null
          uf: string | null
        }
        Insert: {
          atualizado_em?: string
          cluster?: string | null
          created_at?: string
          cust_id: string
          meses_programa?: number | null
          nickname?: string | null
          nivel?: string | null
          programa?: string | null
          safra?: string | null
          sub_cluster?: string | null
          uf?: string | null
        }
        Update: {
          atualizado_em?: string
          cluster?: string | null
          created_at?: string
          cust_id?: string
          meses_programa?: number | null
          nickname?: string | null
          nivel?: string | null
          programa?: string | null
          safra?: string | null
          sub_cluster?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      multilojas_fonte: {
        Row: {
          cor: string | null
          created_at: string
          descricao: string | null
          granularidade: string | null
          id: string
          rotulo: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          granularidade?: string | null
          id: string
          rotulo: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          granularidade?: string | null
          id?: string
          rotulo?: string
        }
        Relationships: []
      }
      multilojas_loja: {
        Row: {
          ativo: boolean
          chave_tecnica: string
          conta_id: string | null
          created_at: string
          gestor_user_id: string | null
          id: string
          marca: string | null
          nome_publico: string
          segmento: string | null
          updated_at: string
          vinculo: string | null
          vinculo_score: number | null
        }
        Insert: {
          ativo?: boolean
          chave_tecnica: string
          conta_id?: string | null
          created_at?: string
          gestor_user_id?: string | null
          id?: string
          marca?: string | null
          nome_publico: string
          segmento?: string | null
          updated_at?: string
          vinculo?: string | null
          vinculo_score?: number | null
        }
        Update: {
          ativo?: boolean
          chave_tecnica?: string
          conta_id?: string | null
          created_at?: string
          gestor_user_id?: string | null
          id?: string
          marca?: string | null
          nome_publico?: string
          segmento?: string | null
          updated_at?: string
          vinculo?: string | null
          vinculo_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "multilojas_loja_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "multilojas_conta"
            referencedColumns: ["cust_id"]
          },
        ]
      }
      multilojas_pedido: {
        Row: {
          acre: number | null
          ads: boolean | null
          b2b: boolean | null
          canal: string | null
          cancelado: boolean | null
          carga_id: string
          cidade: string | null
          created_at: string
          desconto: number | null
          devolvido: boolean | null
          doc_hash: string | null
          dt: string
          estorno: number | null
          frete_custo: number | null
          frete_rec: number | null
          gmv: number | null
          liquido: number | null
          logistica: string | null
          loja_chave: string | null
          loja_id: string | null
          mediacao: boolean | null
          mlb: string
          nfe_ok: boolean | null
          nfe_status: string | null
          pedido_id: string
          preco: number | null
          reclamacao: boolean | null
          sku: string | null
          status: string | null
          tarifa: number | null
          tipo_anuncio: string | null
          titulo: string | null
          uf: string | null
          un: number | null
        }
        Insert: {
          acre?: number | null
          ads?: boolean | null
          b2b?: boolean | null
          canal?: string | null
          cancelado?: boolean | null
          carga_id: string
          cidade?: string | null
          created_at?: string
          desconto?: number | null
          devolvido?: boolean | null
          doc_hash?: string | null
          dt: string
          estorno?: number | null
          frete_custo?: number | null
          frete_rec?: number | null
          gmv?: number | null
          liquido?: number | null
          logistica?: string | null
          loja_chave?: string | null
          loja_id?: string | null
          mediacao?: boolean | null
          mlb?: string
          nfe_ok?: boolean | null
          nfe_status?: string | null
          pedido_id: string
          preco?: number | null
          reclamacao?: boolean | null
          sku?: string | null
          status?: string | null
          tarifa?: number | null
          tipo_anuncio?: string | null
          titulo?: string | null
          uf?: string | null
          un?: number | null
        }
        Update: {
          acre?: number | null
          ads?: boolean | null
          b2b?: boolean | null
          canal?: string | null
          cancelado?: boolean | null
          carga_id?: string
          cidade?: string | null
          created_at?: string
          desconto?: number | null
          devolvido?: boolean | null
          doc_hash?: string | null
          dt?: string
          estorno?: number | null
          frete_custo?: number | null
          frete_rec?: number | null
          gmv?: number | null
          liquido?: number | null
          logistica?: string | null
          loja_chave?: string | null
          loja_id?: string | null
          mediacao?: boolean | null
          mlb?: string
          nfe_ok?: boolean | null
          nfe_status?: string | null
          pedido_id?: string
          preco?: number | null
          reclamacao?: boolean | null
          sku?: string | null
          status?: string | null
          tarifa?: number | null
          tipo_anuncio?: string | null
          titulo?: string | null
          uf?: string | null
          un?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "multilojas_pedido_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "multilojas_carga"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multilojas_pedido_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "multilojas_carga_publica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multilojas_pedido_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "multilojas_loja"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          account_id: string | null
          corpo: string
          criado_em: string
          id: string
          lida_em: string | null
          payload: Json | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          corpo: string
          criado_em?: string
          id?: string
          lida_em?: string | null
          payload?: Json | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          corpo?: string
          criado_em?: string
          id?: string
          lida_em?: string | null
          payload?: Json | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_notifications: {
        Row: {
          added_cust_ids: string[]
          created_at: string
          id: string
          message: string
          portfolio_id: string | null
          portfolio_name: string
          read: boolean
          user_id: string
        }
        Insert: {
          added_cust_ids?: string[]
          created_at?: string
          id?: string
          message: string
          portfolio_id?: string | null
          portfolio_name: string
          read?: boolean
          user_id: string
        }
        Update: {
          added_cust_ids?: string[]
          created_at?: string
          id?: string
          message?: string
          portfolio_id?: string | null
          portfolio_name?: string
          read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          cust_ids: string[]
          id: string
          name: string
          seller_aliases: Json
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          cust_ids?: string[]
          id?: string
          name: string
          seller_aliases?: Json
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          cust_ids?: string[]
          id?: string
          name?: string
          seller_aliases?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      raw_cdp_mensal: {
        Row: {
          arquivo_origem: string
          cus_cust_id_sel: string
          dados: Json
          importado_em: string
          tim_month_id: string
        }
        Insert: {
          arquivo_origem: string
          cus_cust_id_sel: string
          dados: Json
          importado_em?: string
          tim_month_id: string
        }
        Update: {
          arquivo_origem?: string
          cus_cust_id_sel?: string
          dados?: Json
          importado_em?: string
          tim_month_id?: string
        }
        Relationships: []
      }
      raw_cpp_mensal: {
        Row: {
          arquivo_origem: string
          cus_cust_id_sel: string
          dados: Json
          importado_em: string
          tim_month_id: string
        }
        Insert: {
          arquivo_origem: string
          cus_cust_id_sel: string
          dados: Json
          importado_em?: string
          tim_month_id: string
        }
        Update: {
          arquivo_origem?: string
          cus_cust_id_sel?: string
          dados?: Json
          importado_em?: string
          tim_month_id?: string
        }
        Relationships: []
      }
      seller_eligibility: {
        Row: {
          acao_recomendada: string | null
          campaign_id_best: string | null
          campaign_type: string | null
          created_at: string
          data: string
          discount_best: number | null
          discount_seller_percentage: number | null
          discount_total: number | null
          dom_domain_agg1: string | null
          estoque_medio_7d: number | null
          estoque_medio_full_7d: number | null
          flag_best_promo: boolean | null
          flag_item_s_optin: boolean | null
          id: string
          item_id: string
          item_name: string
          media_tsi_diario_7d: number | null
          pedidos_7d: number | null
          seller_id: string
          vertical_item: string | null
        }
        Insert: {
          acao_recomendada?: string | null
          campaign_id_best?: string | null
          campaign_type?: string | null
          created_at?: string
          data: string
          discount_best?: number | null
          discount_seller_percentage?: number | null
          discount_total?: number | null
          dom_domain_agg1?: string | null
          estoque_medio_7d?: number | null
          estoque_medio_full_7d?: number | null
          flag_best_promo?: boolean | null
          flag_item_s_optin?: boolean | null
          id?: string
          item_id: string
          item_name?: string
          media_tsi_diario_7d?: number | null
          pedidos_7d?: number | null
          seller_id: string
          vertical_item?: string | null
        }
        Update: {
          acao_recomendada?: string | null
          campaign_id_best?: string | null
          campaign_type?: string | null
          created_at?: string
          data?: string
          discount_best?: number | null
          discount_seller_percentage?: number | null
          discount_total?: number | null
          dom_domain_agg1?: string | null
          estoque_medio_7d?: number | null
          estoque_medio_full_7d?: number | null
          flag_best_promo?: boolean | null
          flag_item_s_optin?: boolean | null
          id?: string
          item_id?: string
          item_name?: string
          media_tsi_diario_7d?: number | null
          pedidos_7d?: number | null
          seller_id?: string
          vertical_item?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_eligibility_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_eligibility_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_bridge"
            referencedColumns: ["seller_uuid"]
          },
        ]
      }
      seller_grants: {
        Row: {
          created_at: string
          cust_id: string
          days_to_expire: number
          expiration_date: string
          id: string
          salesforce_url: string | null
          seller_id: string
        }
        Insert: {
          created_at?: string
          cust_id: string
          days_to_expire?: number
          expiration_date: string
          id?: string
          salesforce_url?: string | null
          seller_id: string
        }
        Update: {
          created_at?: string
          cust_id?: string
          days_to_expire?: number
          expiration_date?: string
          id?: string
          salesforce_url?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_grants_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_grants_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_bridge"
            referencedColumns: ["seller_uuid"]
          },
        ]
      }
      seller_listings_quality: {
        Row: {
          created_at: string
          data: string
          id: string
          item_id: string
          ll_description_score: number | null
          ll_free_shipping_score: number | null
          ll_pictures_score: number | null
          ll_price_score: number | null
          ll_promotions_score: number | null
          ll_stock_availability_score: number | null
          ll_tech_specs_score: number | null
          ll_title_score: number | null
          orders_clips: number | null
          score_caracteristica_final: number | null
          score_oferta_final: number | null
          score_photo: number | null
          score_qualidade_final: number | null
          score_title: number | null
          seller_id: string
          sellers_clips_publi: number | null
          si_clips: number | null
          tgmv_lc_clips: number | null
          visitas_clips: number | null
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          item_id: string
          ll_description_score?: number | null
          ll_free_shipping_score?: number | null
          ll_pictures_score?: number | null
          ll_price_score?: number | null
          ll_promotions_score?: number | null
          ll_stock_availability_score?: number | null
          ll_tech_specs_score?: number | null
          ll_title_score?: number | null
          orders_clips?: number | null
          score_caracteristica_final?: number | null
          score_oferta_final?: number | null
          score_photo?: number | null
          score_qualidade_final?: number | null
          score_title?: number | null
          seller_id: string
          sellers_clips_publi?: number | null
          si_clips?: number | null
          tgmv_lc_clips?: number | null
          visitas_clips?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          item_id?: string
          ll_description_score?: number | null
          ll_free_shipping_score?: number | null
          ll_pictures_score?: number | null
          ll_price_score?: number | null
          ll_promotions_score?: number | null
          ll_stock_availability_score?: number | null
          ll_tech_specs_score?: number | null
          ll_title_score?: number | null
          orders_clips?: number | null
          score_caracteristica_final?: number | null
          score_oferta_final?: number | null
          score_photo?: number | null
          score_qualidade_final?: number | null
          score_title?: number | null
          seller_id?: string
          sellers_clips_publi?: number | null
          si_clips?: number | null
          tgmv_lc_clips?: number | null
          visitas_clips?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_listings_quality_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_listings_quality_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_bridge"
            referencedColumns: ["seller_uuid"]
          },
        ]
      }
      sellers: {
        Row: {
          cluster_seller: string | null
          created_at: string
          cus_state: string | null
          cust_id: string
          fecha_in: string | null
          fecha_out: string | null
          grupo_id: string | null
          id: string
          nickname: string
          sub_cluster_seller: string | null
          vertical_dominant: string | null
        }
        Insert: {
          cluster_seller?: string | null
          created_at?: string
          cus_state?: string | null
          cust_id: string
          fecha_in?: string | null
          fecha_out?: string | null
          grupo_id?: string | null
          id?: string
          nickname: string
          sub_cluster_seller?: string | null
          vertical_dominant?: string | null
        }
        Update: {
          cluster_seller?: string | null
          created_at?: string
          cus_state?: string | null
          cust_id?: string
          fecha_in?: string | null
          fecha_out?: string | null
          grupo_id?: string | null
          id?: string
          nickname?: string
          sub_cluster_seller?: string | null
          vertical_dominant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers_kpi: {
        Row: {
          bpc: number | null
          cdp_tgmv_lc: number | null
          cdp_tsi: number | null
          created_at: string
          data: string
          f_tgmv_lc: number | null
          f_tsi: number | null
          gmv_lc: number | null
          gmv_lc_m1: number | null
          id: string
          inv_pads: number | null
          ll_description_score: number | null
          ll_free_shipping_score: number | null
          ll_pictures_score: number | null
          ll_price_score: number | null
          ll_promotions_score: number | null
          ll_stock_availability_score: number | null
          ll_tech_specs_score: number | null
          ll_title_score: number | null
          min_price_rival: number | null
          orders_clips: number | null
          pontuacao_ipi: number | null
          pontuacao_ll_gtin: number | null
          rep_cancellations_rate: number | null
          rep_claims_rate: number | null
          rep_current_level: string | null
          rep_delayed_ht_rate: number | null
          score_caracteristica_final: number | null
          score_final_full: number | null
          score_final_pads: number | null
          score_oferta_final: number | null
          score_photo: number | null
          score_qualidade_final: number | null
          score_title: number | null
          seller_id: string
          sellers_clips_publi: number | null
          si_clips: number | null
          tgmv_lc: number | null
          tgmv_lc_clips: number | null
          tgmv_lc_flex: number | null
          tgmv_lc_full: number | null
          tgmv_lc_pads: number | null
          tgmv_orders: number | null
          tim_month_id: number | null
          tsi: number | null
          tsi_flex: number | null
          tsi_pads: number | null
          uplift_gmv_lc_m1: number | null
          visitas_clips: number | null
          visits: number | null
          visits_cheaper: number | null
          visits_expensive: number | null
          visits_match: number | null
        }
        Insert: {
          bpc?: number | null
          cdp_tgmv_lc?: number | null
          cdp_tsi?: number | null
          created_at?: string
          data: string
          f_tgmv_lc?: number | null
          f_tsi?: number | null
          gmv_lc?: number | null
          gmv_lc_m1?: number | null
          id?: string
          inv_pads?: number | null
          ll_description_score?: number | null
          ll_free_shipping_score?: number | null
          ll_pictures_score?: number | null
          ll_price_score?: number | null
          ll_promotions_score?: number | null
          ll_stock_availability_score?: number | null
          ll_tech_specs_score?: number | null
          ll_title_score?: number | null
          min_price_rival?: number | null
          orders_clips?: number | null
          pontuacao_ipi?: number | null
          pontuacao_ll_gtin?: number | null
          rep_cancellations_rate?: number | null
          rep_claims_rate?: number | null
          rep_current_level?: string | null
          rep_delayed_ht_rate?: number | null
          score_caracteristica_final?: number | null
          score_final_full?: number | null
          score_final_pads?: number | null
          score_oferta_final?: number | null
          score_photo?: number | null
          score_qualidade_final?: number | null
          score_title?: number | null
          seller_id: string
          sellers_clips_publi?: number | null
          si_clips?: number | null
          tgmv_lc?: number | null
          tgmv_lc_clips?: number | null
          tgmv_lc_flex?: number | null
          tgmv_lc_full?: number | null
          tgmv_lc_pads?: number | null
          tgmv_orders?: number | null
          tim_month_id?: number | null
          tsi?: number | null
          tsi_flex?: number | null
          tsi_pads?: number | null
          uplift_gmv_lc_m1?: number | null
          visitas_clips?: number | null
          visits?: number | null
          visits_cheaper?: number | null
          visits_expensive?: number | null
          visits_match?: number | null
        }
        Update: {
          bpc?: number | null
          cdp_tgmv_lc?: number | null
          cdp_tsi?: number | null
          created_at?: string
          data?: string
          f_tgmv_lc?: number | null
          f_tsi?: number | null
          gmv_lc?: number | null
          gmv_lc_m1?: number | null
          id?: string
          inv_pads?: number | null
          ll_description_score?: number | null
          ll_free_shipping_score?: number | null
          ll_pictures_score?: number | null
          ll_price_score?: number | null
          ll_promotions_score?: number | null
          ll_stock_availability_score?: number | null
          ll_tech_specs_score?: number | null
          ll_title_score?: number | null
          min_price_rival?: number | null
          orders_clips?: number | null
          pontuacao_ipi?: number | null
          pontuacao_ll_gtin?: number | null
          rep_cancellations_rate?: number | null
          rep_claims_rate?: number | null
          rep_current_level?: string | null
          rep_delayed_ht_rate?: number | null
          score_caracteristica_final?: number | null
          score_final_full?: number | null
          score_final_pads?: number | null
          score_oferta_final?: number | null
          score_photo?: number | null
          score_qualidade_final?: number | null
          score_title?: number | null
          seller_id?: string
          sellers_clips_publi?: number | null
          si_clips?: number | null
          tgmv_lc?: number | null
          tgmv_lc_clips?: number | null
          tgmv_lc_flex?: number | null
          tgmv_lc_full?: number | null
          tgmv_lc_pads?: number | null
          tgmv_orders?: number | null
          tim_month_id?: number | null
          tsi?: number | null
          tsi_flex?: number | null
          tsi_pads?: number | null
          uplift_gmv_lc_m1?: number | null
          visitas_clips?: number | null
          visits?: number | null
          visits_cheaper?: number | null
          visits_expensive?: number | null
          visits_match?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_kpi_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sellers_kpi_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_bridge"
            referencedColumns: ["seller_uuid"]
          },
        ]
      }
      sellers_kpi_daily: {
        Row: {
          cdp_tgmv_lc: number | null
          cdp_tsi: number | null
          created_at: string
          data: string
          f_tgmv_lc: number | null
          f_tsi: number | null
          gmv_lc: number | null
          gmv_lc_m1: number | null
          id: string
          inv_pads: number | null
          ll_description_score: number | null
          ll_free_shipping_score: number | null
          ll_pictures_score: number | null
          ll_price_score: number | null
          ll_promotions_score: number | null
          ll_stock_availability_score: number | null
          ll_tech_specs_score: number | null
          ll_title_score: number | null
          min_price_rival: number | null
          orders_clips: number | null
          pontuacao_ipi: number | null
          pontuacao_ll_gtin: number | null
          rep_cancellations_rate: number | null
          rep_claims_rate: number | null
          rep_current_level: string | null
          rep_delayed_ht_rate: number | null
          score_caracteristica_final: number | null
          score_final_full: number | null
          score_final_pads: number | null
          score_oferta_final: number | null
          score_photo: number | null
          score_qualidade_final: number | null
          score_title: number | null
          seller_id: string
          sellers_clips_publi: number | null
          si_clips: number | null
          tgmv_lc: number | null
          tgmv_lc_clips: number | null
          tgmv_lc_flex: number | null
          tgmv_lc_full: number | null
          tgmv_lc_pads: number | null
          tsi: number | null
          tsi_flex: number | null
          tsi_pads: number | null
          uplift_gmv_lc_m1: number | null
          visitas_clips: number | null
          visits: number | null
          visits_cheaper: number | null
          visits_expensive: number | null
          visits_match: number | null
        }
        Insert: {
          cdp_tgmv_lc?: number | null
          cdp_tsi?: number | null
          created_at?: string
          data: string
          f_tgmv_lc?: number | null
          f_tsi?: number | null
          gmv_lc?: number | null
          gmv_lc_m1?: number | null
          id?: string
          inv_pads?: number | null
          ll_description_score?: number | null
          ll_free_shipping_score?: number | null
          ll_pictures_score?: number | null
          ll_price_score?: number | null
          ll_promotions_score?: number | null
          ll_stock_availability_score?: number | null
          ll_tech_specs_score?: number | null
          ll_title_score?: number | null
          min_price_rival?: number | null
          orders_clips?: number | null
          pontuacao_ipi?: number | null
          pontuacao_ll_gtin?: number | null
          rep_cancellations_rate?: number | null
          rep_claims_rate?: number | null
          rep_current_level?: string | null
          rep_delayed_ht_rate?: number | null
          score_caracteristica_final?: number | null
          score_final_full?: number | null
          score_final_pads?: number | null
          score_oferta_final?: number | null
          score_photo?: number | null
          score_qualidade_final?: number | null
          score_title?: number | null
          seller_id: string
          sellers_clips_publi?: number | null
          si_clips?: number | null
          tgmv_lc?: number | null
          tgmv_lc_clips?: number | null
          tgmv_lc_flex?: number | null
          tgmv_lc_full?: number | null
          tgmv_lc_pads?: number | null
          tsi?: number | null
          tsi_flex?: number | null
          tsi_pads?: number | null
          uplift_gmv_lc_m1?: number | null
          visitas_clips?: number | null
          visits?: number | null
          visits_cheaper?: number | null
          visits_expensive?: number | null
          visits_match?: number | null
        }
        Update: {
          cdp_tgmv_lc?: number | null
          cdp_tsi?: number | null
          created_at?: string
          data?: string
          f_tgmv_lc?: number | null
          f_tsi?: number | null
          gmv_lc?: number | null
          gmv_lc_m1?: number | null
          id?: string
          inv_pads?: number | null
          ll_description_score?: number | null
          ll_free_shipping_score?: number | null
          ll_pictures_score?: number | null
          ll_price_score?: number | null
          ll_promotions_score?: number | null
          ll_stock_availability_score?: number | null
          ll_tech_specs_score?: number | null
          ll_title_score?: number | null
          min_price_rival?: number | null
          orders_clips?: number | null
          pontuacao_ipi?: number | null
          pontuacao_ll_gtin?: number | null
          rep_cancellations_rate?: number | null
          rep_claims_rate?: number | null
          rep_current_level?: string | null
          rep_delayed_ht_rate?: number | null
          score_caracteristica_final?: number | null
          score_final_full?: number | null
          score_final_pads?: number | null
          score_oferta_final?: number | null
          score_photo?: number | null
          score_qualidade_final?: number | null
          score_title?: number | null
          seller_id?: string
          sellers_clips_publi?: number | null
          si_clips?: number | null
          tgmv_lc?: number | null
          tgmv_lc_clips?: number | null
          tgmv_lc_flex?: number | null
          tgmv_lc_full?: number | null
          tgmv_lc_pads?: number | null
          tsi?: number | null
          tsi_flex?: number | null
          tsi_pads?: number | null
          uplift_gmv_lc_m1?: number | null
          visitas_clips?: number | null
          visits?: number | null
          visits_cheaper?: number | null
          visits_expensive?: number | null
          visits_match?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_kpi_daily_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sellers_kpi_daily_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_bridge"
            referencedColumns: ["seller_uuid"]
          },
        ]
      }
      sellers_pm: {
        Row: {
          created_at: string
          cust_id: number
          cust_id_text: string | null
          data_expiracao_concessao: string | null
          data_ultima_concessao: string | null
          dias_expiracao: number | null
          nmv_lc: number | null
          nmv_lc_1: number | null
          nmv_lc_2: number | null
          nmv_usd: number | null
          penetracao_3pgm_pct: number | null
          sb: number | null
          seller_id: string | null
          seller_url: string | null
          snapshot_date: string
          vs_pm_3pgm_pct: number | null
          vs_pm_pct: number | null
          vs_pm_status: string | null
        }
        Insert: {
          created_at?: string
          cust_id: number
          cust_id_text?: string | null
          data_expiracao_concessao?: string | null
          data_ultima_concessao?: string | null
          dias_expiracao?: number | null
          nmv_lc?: number | null
          nmv_lc_1?: number | null
          nmv_lc_2?: number | null
          nmv_usd?: number | null
          penetracao_3pgm_pct?: number | null
          sb?: number | null
          seller_id?: string | null
          seller_url?: string | null
          snapshot_date: string
          vs_pm_3pgm_pct?: number | null
          vs_pm_pct?: number | null
          vs_pm_status?: string | null
        }
        Update: {
          created_at?: string
          cust_id?: number
          cust_id_text?: string | null
          data_expiracao_concessao?: string | null
          data_ultima_concessao?: string | null
          dias_expiracao?: number | null
          nmv_lc?: number | null
          nmv_lc_1?: number | null
          nmv_lc_2?: number | null
          nmv_usd?: number | null
          penetracao_3pgm_pct?: number | null
          sb?: number | null
          seller_id?: string | null
          seller_url?: string | null
          snapshot_date?: string
          vs_pm_3pgm_pct?: number | null
          vs_pm_pct?: number | null
          vs_pm_status?: string | null
        }
        Relationships: []
      }
      stg_ml_daily_raw: {
        Row: {
          account_id: string
          fetched_at: string | null
          id: number
          operation_date: string
          operation_id: string
          operation_type: string
          payload: Json
          payload_hash: string
          sync_job_id: number | null
        }
        Insert: {
          account_id: string
          fetched_at?: string | null
          id?: number
          operation_date: string
          operation_id: string
          operation_type: string
          payload: Json
          payload_hash: string
          sync_job_id?: number | null
        }
        Update: {
          account_id?: string
          fetched_at?: string | null
          id?: number
          operation_date?: string
          operation_id?: string
          operation_type?: string
          payload?: Json
          payload_hash?: string
          sync_job_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stg_ml_daily_raw_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stg_ml_daily_raw_job_fk"
            columns: ["sync_job_id"]
            isOneToOne: false
            referencedRelation: "sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          account_id: string
          attempts: number | null
          end_date: string
          endpoint: string
          erro: string | null
          finished_at: string | null
          id: number
          offset_atual: number | null
          registros_gravados: number | null
          scheduled_at: string | null
          start_date: string
          started_at: string | null
          status: string
          total_registros: number | null
          trilha: string
        }
        Insert: {
          account_id: string
          attempts?: number | null
          end_date: string
          endpoint: string
          erro?: string | null
          finished_at?: string | null
          id?: number
          offset_atual?: number | null
          registros_gravados?: number | null
          scheduled_at?: string | null
          start_date: string
          started_at?: string | null
          status?: string
          total_registros?: number | null
          trilha: string
        }
        Update: {
          account_id?: string
          attempts?: number | null
          end_date?: string
          endpoint?: string
          erro?: string | null
          finished_at?: string | null
          id?: number
          offset_atual?: number | null
          registros_gravados?: number | null
          scheduled_at?: string | null
          start_date?: string
          started_at?: string | null
          status?: string
          total_registros?: number | null
          trilha?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ml_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      upload_logs: {
        Row: {
          id: string
          notes: string | null
          rows_imported: number
          status: string
          upload_type: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          id?: string
          notes?: string | null
          rows_imported?: number
          status?: string
          upload_type: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          id?: string
          notes?: string | null
          rows_imported?: number
          status?: string
          upload_type?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      user_access_control: {
        Row: {
          allowed_cust_ids: string[]
          cnpj: string | null
          created_at: string
          id: string
          must_change_password: boolean
          temp_password_expires_at: string | null
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          allowed_cust_ids?: string[]
          cnpj?: string | null
          created_at?: string
          id?: string
          must_change_password?: boolean
          temp_password_expires_at?: string | null
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          allowed_cust_ids?: string[]
          cnpj?: string | null
          created_at?: string
          id?: string
          must_change_password?: boolean
          temp_password_expires_at?: string | null
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          last_seen_at: string
          login_at: string
          logout_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          login_at?: string
          logout_at?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          login_at?: string
          logout_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      multilojas_carga_publica: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          enviado_por: string | null
          fonte_id: string | null
          gmv: number | null
          id: string | null
          linhas: number | null
          periodo_fim: string | null
          periodo_ini: string | null
          responsavel: string | null
          validas: number | null
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          enviado_por?: string | null
          fonte_id?: string | null
          gmv?: number | null
          id?: string | null
          linhas?: number | null
          periodo_fim?: string | null
          periodo_ini?: string | null
          responsavel?: string | null
          validas?: number | null
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          enviado_por?: string | null
          fonte_id?: string | null
          gmv?: number | null
          id?: string | null
          linhas?: number | null
          periodo_fim?: string | null
          periodo_ini?: string | null
          responsavel?: string | null
          validas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "multilojas_carga_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "multilojas_fonte"
            referencedColumns: ["id"]
          },
        ]
      }
      v_seller_bridge: {
        Row: {
          cust_id_bigint: number | null
          cust_id_text: string | null
          nickname: string | null
          seller_uuid: string | null
        }
        Insert: {
          cust_id_bigint?: never
          cust_id_text?: string | null
          nickname?: string | null
          seller_uuid?: string | null
        }
        Update: {
          cust_id_bigint?: never
          cust_id_text?: string | null
          nickname?: string | null
          seller_uuid?: string | null
        }
        Relationships: []
      }
      vw_reputacao_mensal: {
        Row: {
          atrasos_mediana: number | null
          atrasos_p90: number | null
          atrasos_pond_tgmv: number | null
          claims_mediana: number | null
          claims_p90: number | null
          claims_pond_tgmv: number | null
          mes_ref: string | null
          n_sellers_atrasos: number | null
          n_sellers_claims: number | null
          n_sellers_total: number | null
        }
        Relationships: []
      }
      vw_usuarios_sessoes: {
        Row: {
          email: string | null
          segundos_online: number | null
          sessoes_ativas: number | null
          total_sessoes: number | null
          ultimo_acesso: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      alertas_inatividade_pendentes: {
        Args: never
        Returns: {
          dias: number
          email: string
          ultimo_acesso: string
          user_id: string
        }[]
      }
      avisos_operacionais_existentes: {
        Args: never
        Returns: {
          categoria: string
          criado_em: string
          id: string
          mensagem: string
          origem: string
        }[]
      }
      get_allowed_cust_ids: { Args: never; Returns: string[] }
      get_data_coverage: {
        Args: never
        Returns: {
          period: string
          rows: number
          source: string
        }[]
      }
      get_meus_grupos: { Args: never; Returns: string[] }
      get_perfil: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      indicadores_carteira: {
        Args: { p_seller_ids: string[] }
        Returns: {
          data: string
          is_latest: boolean
          metrics: Json
          seller_id: string
        }[]
      }
      indicadores_classificacao: {
        Args: { p_seller_ids: string[] }
        Returns: {
          data: string
          gmv_lc: number
          inv_pads: number
          ll_stock_availability_score: number
          meses_total: number
          rep_cancellations_rate: number
          rep_current_level: string
          seller_id: string
          tgmv_lc: number
          tim_month_id: number
          tsi: number
          visits: number
        }[]
      }
      indicadores_tendencias: {
        Args: { p_seller_ids: string[] }
        Returns: {
          ads_trend: number
          seller_id: string
          tgmv_trend: number
          visits_trend: number
        }[]
      }
      indicadores_ultimos: {
        Args: { p_seller_ids: string[] }
        Returns: {
          bpc: number | null
          cdp_tgmv_lc: number | null
          cdp_tsi: number | null
          created_at: string
          data: string
          f_tgmv_lc: number | null
          f_tsi: number | null
          gmv_lc: number | null
          gmv_lc_m1: number | null
          id: string
          inv_pads: number | null
          ll_description_score: number | null
          ll_free_shipping_score: number | null
          ll_pictures_score: number | null
          ll_price_score: number | null
          ll_promotions_score: number | null
          ll_stock_availability_score: number | null
          ll_tech_specs_score: number | null
          ll_title_score: number | null
          min_price_rival: number | null
          orders_clips: number | null
          pontuacao_ipi: number | null
          pontuacao_ll_gtin: number | null
          rep_cancellations_rate: number | null
          rep_claims_rate: number | null
          rep_current_level: string | null
          rep_delayed_ht_rate: number | null
          score_caracteristica_final: number | null
          score_final_full: number | null
          score_final_pads: number | null
          score_oferta_final: number | null
          score_photo: number | null
          score_qualidade_final: number | null
          score_title: number | null
          seller_id: string
          sellers_clips_publi: number | null
          si_clips: number | null
          tgmv_lc: number | null
          tgmv_lc_clips: number | null
          tgmv_lc_flex: number | null
          tgmv_lc_full: number | null
          tgmv_lc_pads: number | null
          tgmv_orders: number | null
          tim_month_id: number | null
          tsi: number | null
          tsi_flex: number | null
          tsi_pads: number | null
          uplift_gmv_lc_m1: number | null
          visitas_clips: number | null
          visits: number | null
          visits_cheaper: number | null
          visits_expensive: number | null
          visits_match: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "sellers_kpi"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      indicadores_verticais: {
        Args: { p_seller_ids: string[] }
        Returns: {
          seller_id: string
          vertical: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      ml_ads_painel_grupos: {
        Args: { p_account_id: string; p_dias?: number }
        Returns: {
          achados_altos: number
          ad_group_id: number
          analisado_em: string
          anuncios: number
          anuncios_ativos: number
          campaign_id: number
          cliques: number
          cliques_ant: number
          custo: number
          custo_ant: number
          dias: number
          dias_ant: number
          estoque: number
          external_id: string
          ficha_obrigatorios: number
          fotos: number
          fotos_abaixo_minimo: number
          fotos_abaixo_recomendado: number
          frete_gratis: boolean
          impressoes: number
          impressoes_ant: number
          item_id: string
          link: string
          logistica: string
          preco: number
          qualidade_nivel: string
          qualidade_score: number
          receita: number
          receita_ant: number
          status: string
          thumbnail: string
          tipo: string
          titulo: string
          unidades: number
          unidades_ant: number
        }[]
      }
      ml_agendar_backfill: {
        Args: { p_account_id: string; p_meses?: number }
        Returns: number
      }
      ml_buscar_anuncios: {
        Args: { p_account_id: string; p_limite?: number; p_termo: string }
        Returns: {
          account_id: string
          catalog_product_id: string | null
          catalogo: boolean | null
          categoria_id: string | null
          estoque: number | null
          family_id: string | null
          frete_gratis: boolean | null
          item_id: string
          link: string | null
          logistica: string | null
          moeda: string | null
          preco: number | null
          preco_original: number | null
          saude: number | null
          sku: string | null
          skus: string[]
          status: string | null
          sub_status: string[]
          synced_at: string
          thumbnail: string | null
          tipo_anuncio: string | null
          titulo: string | null
          variacoes: Json
          vendidos: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "ml_listings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ml_claim_refresh: { Args: { p_account_id: string }; Returns: boolean }
      ml_contas_gerenciaveis: {
        Args: never
        Returns: {
          id: string
          ml_user_id: number
          nickname: string
          site_id: string
        }[]
      }
      ml_contas_status: {
        Args: never
        Returns: {
          account_id: string
          jobs_concluidos: number
          jobs_total: number
          ml_user_id: number
          nickname: string
          site_id: string
          status: string
          tem_token: boolean
          token_expira_em: string
        }[]
      }
      ml_cron_refresh_tokens: { Args: { p_url: string }; Returns: number }
      ml_destinatarios_conta: {
        Args: { p_account_id: string }
        Returns: {
          user_id: string
        }[]
      }
      ml_e_consultor: { Args: { p_user_id: string }; Returns: boolean }
      ml_lojas_do_usuario: { Args: never; Returns: string[] }
      ml_minhas_contas_status: {
        Args: never
        Returns: {
          account_id: string
          jobs_concluidos: number
          jobs_total: number
          ml_user_id: number
          nickname: string
          site_id: string
          status: string
          tem_token: boolean
          token_expira_em: string
        }[]
      }
      ml_notificacao_lida: { Args: { p_id: string }; Returns: undefined }
      ml_pode_carregar: { Args: never; Returns: boolean }
      ml_pode_gerir_conta: { Args: { p_account_id: string }; Returns: boolean }
      ml_pode_ver_rede: { Args: never; Returns: boolean }
      ml_release_refresh: { Args: { p_account_id: string }; Returns: undefined }
      ml_set_trigger_secret: { Args: { p_value: string }; Returns: undefined }
      ml_sou_consultor: { Args: never; Returns: boolean }
      ml_store_token: {
        Args: {
          p_access: string
          p_account_id: string
          p_expires_at: string
          p_refresh: string
          p_scope: string
        }
        Returns: undefined
      }
      ml_tendencias_cobertura: {
        Args: { p_account_id: string; p_termos: string[] }
        Returns: {
          anuncios: number
          termo: string
        }[]
      }
      ml_tendencias_escopos: {
        Args: { p_account_id: string }
        Returns: {
          anuncios: number
          escopo: string
          nome: string
          vendidos: number
        }[]
      }
      ml_token_rotacionar: {
        Args: {
          p_access: string
          p_account_id: string
          p_expires_at: string
          p_refresh: string
          p_scope: string
        }
        Returns: undefined
      }
      qualidade_divergencias: {
        Args: { _mes: string }
        Returns: {
          cust_id: string
          em_cdp: boolean
          em_cpp: boolean
          nickname: string
          vinculado: boolean
        }[]
      }
      qualidade_feeds_por_mes: {
        Args: never
        Returns: {
          ambos: number
          mes: string
          sem_vinculo: number
          so_cdp: number
          so_cpp: number
        }[]
      }
      qualidade_nulos_criticos: {
        Args: never
        Returns: {
          coluna: string
          feed: string
          nulos: number
          pct_nulo: number
          total: number
        }[]
      }
      qualidade_ultimo_import: {
        Args: never
        Returns: {
          arquivo: string
          feed: string
          importado_em: string
          linhas: number
          meses: number
          sellers: number
        }[]
      }
      reconhecer_aviso_desenvolvedor: {
        Args: { p_id: string }
        Returns: undefined
      }
      registrar_aviso_painel: {
        Args: { p_codigo: string; p_duracao_ms?: number; p_origem: string }
        Returns: undefined
      }
      sou_desenvolvedor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "gerente"
        | "gestor_loja"
        | "super_admin"
        | "desenvolvedor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "gerente",
        "gestor_loja",
        "super_admin",
        "desenvolvedor",
      ],
    },
  },
} as const
