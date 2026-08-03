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
          id?: string
          nickname?: string
          sub_cluster_seller?: string | null
          vertical_dominant?: string | null
        }
        Relationships: []
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
      get_allowed_cust_ids: { Args: never; Returns: string[] }
      get_data_coverage: {
        Args: never
        Returns: {
          period: string
          rows: number
          source: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "gerente" | "gestor_loja"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user", "gerente", "gestor_loja"],
    },
  },
} as const
