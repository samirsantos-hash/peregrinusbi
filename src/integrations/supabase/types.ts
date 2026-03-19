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
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          created_by: string
          cust_ids: string[]
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          cust_ids?: string[]
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          cust_ids?: string[]
          id?: string
          name?: string
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
          created_at: string
          data: string
          discount_best: number | null
          discount_total: number | null
          dom_domain_agg1: string | null
          estoque_medio_7d: number | null
          estoque_medio_full_7d: number | null
          flag_best_promo: boolean | null
          flag_item_s_optin: boolean | null
          id: string
          item_id: string
          item_name: string
          pedidos_7d: number | null
          seller_id: string
          vertical_item: string | null
        }
        Insert: {
          acao_recomendada?: string | null
          campaign_id_best?: string | null
          created_at?: string
          data: string
          discount_best?: number | null
          discount_total?: number | null
          dom_domain_agg1?: string | null
          estoque_medio_7d?: number | null
          estoque_medio_full_7d?: number | null
          flag_best_promo?: boolean | null
          flag_item_s_optin?: boolean | null
          id?: string
          item_id: string
          item_name?: string
          pedidos_7d?: number | null
          seller_id: string
          vertical_item?: string | null
        }
        Update: {
          acao_recomendada?: string | null
          campaign_id_best?: string | null
          created_at?: string
          data?: string
          discount_best?: number | null
          discount_total?: number | null
          dom_domain_agg1?: string | null
          estoque_medio_7d?: number | null
          estoque_medio_full_7d?: number | null
          flag_best_promo?: boolean | null
          flag_item_s_optin?: boolean | null
          id?: string
          item_id?: string
          item_name?: string
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
        }
        Insert: {
          cluster_seller?: string | null
          created_at?: string
          cus_state?: string | null
          cust_id: string
          id?: string
          nickname: string
          sub_cluster_seller?: string | null
        }
        Update: {
          cluster_seller?: string | null
          created_at?: string
          cus_state?: string | null
          cust_id?: string
          id?: string
          nickname?: string
          sub_cluster_seller?: string | null
        }
        Relationships: []
      }
      sellers_kpi: {
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
        ]
      }
      upload_logs: {
        Row: {
          id: string
          rows_imported: number
          upload_type: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          id?: string
          rows_imported?: number
          upload_type: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          id?: string
          rows_imported?: number
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
          temp_password: string | null
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
          temp_password?: string | null
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
          temp_password?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_allowed_cust_ids: { Args: never; Returns: string[] }
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
      app_role: "admin" | "user" | "gerente"
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
      app_role: ["admin", "user", "gerente"],
    },
  },
} as const
