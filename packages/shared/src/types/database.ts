export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type JsonRecord = { [key: string]: Json | undefined };

export interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          key_hash: string;
          key_prefix: string;
          name: string;
          permissions: string;
          monthly_limit: number;
          requests_this_month: number;
          month_reset_at: string;
          tier: string;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key_hash: string;
          key_prefix: string;
          name: string;
          permissions?: string;
          monthly_limit?: number;
          requests_this_month?: number;
          month_reset_at?: string;
          tier?: string;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          key_hash?: string;
          key_prefix?: string;
          name?: string;
          permissions?: string;
          monthly_limit?: number;
          requests_this_month?: number;
          month_reset_at?: string;
          tier?: string;
          last_used_at?: string | null;
          created_at?: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          cash_reward: number;
          payout_status: string;
          payout_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          cash_reward?: number;
          payout_status?: string;
          payout_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          cash_reward?: number;
          payout_status?: string;
          payout_date?: string | null;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          slug: string;
          phone: string | null;
          telegram_id: number | null;
          telegram_username: string | null;
          avatar_url: string | null;
          bio: string | null;
          qualification: string | null;
          city: string | null;
          alumni_of: string | null;
          works_for: string | null;
          knows_about: string[] | null;
          years_experience: number | null;
          consultation_price: number | null;
          consultation_url: string | null;
          niche_id: string | null;
          sub_niche: string | null;
          subscription_tier: string;
          subscription_expires_at: string | null;
          trust_score: number;
          is_verified: boolean;
          is_published: boolean;
          onboarding_completed: boolean;
          voice_profile: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          slug: string;
          phone?: string | null;
          telegram_id?: number | null;
          telegram_username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          qualification?: string | null;
          city?: string | null;
          alumni_of?: string | null;
          works_for?: string | null;
          knows_about?: string[] | null;
          years_experience?: number | null;
          consultation_price?: number | null;
          consultation_url?: string | null;
          niche_id?: string | null;
          sub_niche?: string | null;
          subscription_tier?: string;
          subscription_expires_at?: string | null;
          trust_score?: number;
          is_verified?: boolean;
          is_published?: boolean;
          onboarding_completed?: boolean;
          voice_profile?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          slug?: string;
          phone?: string | null;
          telegram_id?: number | null;
          telegram_username?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          qualification?: string | null;
          city?: string | null;
          alumni_of?: string | null;
          works_for?: string | null;
          knows_about?: string[] | null;
          years_experience?: number | null;
          consultation_price?: number | null;
          consultation_url?: string | null;
          niche_id?: string | null;
          sub_niche?: string | null;
          subscription_tier?: string;
          subscription_expires_at?: string | null;
          trust_score?: number;
          is_verified?: boolean;
          is_published?: boolean;
          onboarding_completed?: boolean;
          voice_profile?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      niches: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          is_focus: boolean;
          is_active: boolean;
          seed_keywords: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          is_focus?: boolean;
          is_active?: boolean;
          seed_keywords?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          is_focus?: boolean;
          is_active?: boolean;
          seed_keywords?: string[];
          created_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          niche_id: string;
          question_text: string;
          slug: string;
          source: string;
          monthly_volume: number | null;
          competition: string | null;
          gap_score: number | null;
          ai_response_chatgpt: string | null;
          ai_response_perplexity: string | null;
          ai_response_yandexgpt: string | null;
          has_expert_name: boolean | null;
          has_specific_examples: boolean | null;
          has_source_link: boolean | null;
          gap_analyzed_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          niche_id: string;
          question_text: string;
          slug: string;
          source: string;
          monthly_volume?: number | null;
          competition?: string | null;
          gap_score?: number | null;
          ai_response_chatgpt?: string | null;
          ai_response_perplexity?: string | null;
          ai_response_yandexgpt?: string | null;
          has_expert_name?: boolean | null;
          has_specific_examples?: boolean | null;
          has_source_link?: boolean | null;
          gap_analyzed_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          niche_id?: string;
          question_text?: string;
          slug?: string;
          source?: string;
          monthly_volume?: number | null;
          competition?: string | null;
          gap_score?: number | null;
          ai_response_chatgpt?: string | null;
          ai_response_perplexity?: string | null;
          ai_response_yandexgpt?: string | null;
          has_expert_name?: boolean | null;
          has_specific_examples?: boolean | null;
          has_source_link?: boolean | null;
          gap_analyzed_at?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          expert_id: string;
          question_id: string;
          status: string;
          week_number: number;
          recommendation: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          expert_id: string;
          question_id: string;
          status?: string;
          week_number: number;
          recommendation?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          expert_id?: string;
          question_id?: string;
          status?: string;
          week_number?: number;
          recommendation?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      voice_recordings: {
        Row: {
          id: string;
          expert_id: string;
          order_id: string | null;
          file_path: string;
          file_size: number | null;
          duration_seconds: number | null;
          source: string;
          mime_type: string;
          transcript: string | null;
          transcription_provider: string | null;
          transcription_status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          expert_id: string;
          order_id?: string | null;
          file_path: string;
          file_size?: number | null;
          duration_seconds?: number | null;
          source: string;
          mime_type: string;
          transcript?: string | null;
          transcription_provider?: string | null;
          transcription_status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          expert_id?: string;
          order_id?: string | null;
          file_path?: string;
          file_size?: number | null;
          duration_seconds?: number | null;
          source?: string;
          mime_type?: string;
          transcript?: string | null;
          transcription_provider?: string | null;
          transcription_status?: string;
          created_at?: string;
        };
      };
      content_packages: {
        Row: {
          id: string;
          expert_id: string;
          order_id: string | null;
          voice_id: string | null;
          question_id: string | null;
          status: string;
          title: string | null;
          format_telegram_post: string | null;
          format_seo_article: string | null;
          format_cards: Json | null;
          format_reels_script: string | null;
          format_faq: Json | null;
          meta_title: string | null;
          meta_description: string | null;
          slug: string | null;
          keywords: string[] | null;
          expert_quotes: string[] | null;
          word_count: number | null;
          has_tldr: boolean;
          has_table: boolean;
          passage_count: number | null;
          published_at: string | null;
          published_url: string | null;
          last_refreshed_at: string | null;
          refresh_status: string;
          llm_provider: string | null;
          llm_model: string | null;
          generation_cost: number | null;
          generation_framework: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          expert_id: string;
          order_id?: string | null;
          voice_id?: string | null;
          question_id?: string | null;
          status?: string;
          title?: string | null;
          format_telegram_post?: string | null;
          format_seo_article?: string | null;
          format_cards?: Json | null;
          format_reels_script?: string | null;
          format_faq?: Json | null;
          meta_title?: string | null;
          meta_description?: string | null;
          slug?: string | null;
          keywords?: string[] | null;
          expert_quotes?: string[] | null;
          word_count?: number | null;
          has_tldr?: boolean;
          has_table?: boolean;
          passage_count?: number | null;
          published_at?: string | null;
          published_url?: string | null;
          last_refreshed_at?: string | null;
          refresh_status?: string;
          llm_provider?: string | null;
          llm_model?: string | null;
          generation_cost?: number | null;
          generation_framework?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          expert_id?: string;
          order_id?: string | null;
          voice_id?: string | null;
          question_id?: string | null;
          status?: string;
          title?: string | null;
          format_telegram_post?: string | null;
          format_seo_article?: string | null;
          format_cards?: Json | null;
          format_reels_script?: string | null;
          format_faq?: Json | null;
          meta_title?: string | null;
          meta_description?: string | null;
          slug?: string | null;
          keywords?: string[] | null;
          expert_quotes?: string[] | null;
          word_count?: number | null;
          has_tldr?: boolean;
          has_table?: boolean;
          passage_count?: number | null;
          published_at?: string | null;
          published_url?: string | null;
          last_refreshed_at?: string | null;
          refresh_status?: string;
          llm_provider?: string | null;
          llm_model?: string | null;
          generation_cost?: number | null;
          generation_framework?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      citation_checks: {
        Row: {
          id: string;
          content_id: string;
          expert_id: string;
          ai_platform: string;
          question_text: string;
          ai_response: string | null;
          is_cited: boolean;
          citation_type: string | null;
          similarity_score: number | null;
          checked_at: string;
        };
        Insert: {
          id?: string;
          content_id: string;
          expert_id: string;
          ai_platform: string;
          question_text: string;
          ai_response?: string | null;
          is_cited?: boolean;
          citation_type?: string | null;
          similarity_score?: number | null;
          checked_at?: string;
        };
        Update: {
          id?: string;
          content_id?: string;
          expert_id?: string;
          ai_platform?: string;
          question_text?: string;
          ai_response?: string | null;
          is_cited?: boolean;
          citation_type?: string | null;
          similarity_score?: number | null;
          checked_at?: string;
        };
      };
      serp_positions: {
        Row: {
          id: string;
          content_id: string;
          search_engine: string;
          query: string;
          position: number | null;
          url: string | null;
          checked_at: string;
        };
        Insert: {
          id?: string;
          content_id: string;
          search_engine: string;
          query: string;
          position?: number | null;
          url?: string | null;
          checked_at?: string;
        };
        Update: {
          id?: string;
          content_id?: string;
          search_engine?: string;
          query?: string;
          position?: number | null;
          url?: string | null;
          checked_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          expert_id: string;
          content_id: string | null;
          client_name: string;
          client_contact: string;
          client_message: string | null;
          source: string;
          referrer: string | null;
          status: string;
          notified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expert_id: string;
          content_id?: string | null;
          client_name: string;
          client_contact: string;
          client_message?: string | null;
          source: string;
          referrer?: string | null;
          status?: string;
          notified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          expert_id?: string;
          content_id?: string | null;
          client_name?: string;
          client_contact?: string;
          client_message?: string | null;
          source?: string;
          referrer?: string | null;
          status?: string;
          notified_at?: string | null;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          expert_id: string;
          type: string;
          amount: number;
          currency: string;
          status: string;
          yukassa_payment_id: string | null;
          yukassa_subscription_id: string | null;
          description: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          expert_id: string;
          type: string;
          amount: number;
          currency?: string;
          status?: string;
          yukassa_payment_id?: string | null;
          yukassa_subscription_id?: string | null;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          expert_id?: string;
          type?: string;
          amount?: number;
          currency?: string;
          status?: string;
          yukassa_payment_id?: string | null;
          yukassa_subscription_id?: string | null;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      email_subscribers: {
        Row: {
          id: string;
          expert_id: string;
          email: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          expert_id: string;
          email: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          expert_id?: string;
          email?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          type: string;
          status: string;
          payload: Json;
          result: Json | null;
          error: string | null;
          attempts: number;
          max_attempts: number;
          priority: number;
          scheduled_at: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          status?: string;
          payload?: Json;
          result?: Json | null;
          error?: string | null;
          attempts?: number;
          max_attempts?: number;
          priority?: number;
          scheduled_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          status?: string;
          payload?: Json;
          result?: Json | null;
          error?: string | null;
          attempts?: number;
          max_attempts?: number;
          priority?: number;
          scheduled_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      sub_queries: {
        Row: {
          id: string;
          parent_question_id: string;
          sub_query_text: string;
          ai_response: string | null;
          gap_score: number | null;
          aeo_cluster: string | null;
          user_intent: string | null;
          desired_answer: string | null;
          next_cta: string | null;
          analyzed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_question_id: string;
          sub_query_text: string;
          ai_response?: string | null;
          gap_score?: number | null;
          aeo_cluster?: string | null;
          user_intent?: string | null;
          desired_answer?: string | null;
          next_cta?: string | null;
          analyzed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          parent_question_id?: string;
          sub_query_text?: string;
          ai_response?: string | null;
          gap_score?: number | null;
          aeo_cluster?: string | null;
          user_intent?: string | null;
          desired_answer?: string | null;
          next_cta?: string | null;
          analyzed_at?: string | null;
          created_at?: string;
        };
      };
      marketing_workflow_runs: {
        Row: {
          id: string;
          owner_id: string | null;
          workflow_key: string;
          agent_role: string | null;
          entity_type: string | null;
          entity_id: string | null;
          status: string;
          input: Json;
          output: Json;
          evidence: Json;
          human_review_required: boolean;
          source: string;
          error: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          workflow_key: string;
          agent_role?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          status?: string;
          input?: Json;
          output?: Json;
          evidence?: Json;
          human_review_required?: boolean;
          source?: string;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          workflow_key?: string;
          agent_role?: string | null;
          entity_type?: string | null;
          entity_id?: string | null;
          status?: string;
          input?: Json;
          output?: Json;
          evidence?: Json;
          human_review_required?: boolean;
          source?: string;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      page_quality_checks: {
        Row: {
          id: string;
          content_id: string | null;
          expert_id: string | null;
          page_url: string | null;
          check_type: string;
          scores: Json;
          critical_issues: Json;
          hypotheses: Json;
          ice_score: number | null;
          status: string;
          source: string;
          confidence: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content_id?: string | null;
          expert_id?: string | null;
          page_url?: string | null;
          check_type?: string;
          scores?: Json;
          critical_issues?: Json;
          hypotheses?: Json;
          ice_score?: number | null;
          status?: string;
          source?: string;
          confidence?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content_id?: string | null;
          expert_id?: string | null;
          page_url?: string | null;
          check_type?: string;
          scores?: Json;
          critical_issues?: Json;
          hypotheses?: Json;
          ice_score?: number | null;
          status?: string;
          source?: string;
          confidence?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_crawler_logs: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      proof_of_human_assets: {
        Row: {
          id: string;
          profile_id: string;
          asset_type: string;
          title: string;
          issuer: string | null;
          evidence_url: string | null;
          status: string;
          source: string;
          collected_at: string;
          confidence: number;
          created_at: string;
          updated_at: string;
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          expires_at: string | null;
          limitations: Json;
        };
        Insert: {
          id?: string;
          profile_id: string;
          asset_type: string;
          title: string;
          issuer?: string | null;
          evidence_url?: string | null;
          status?: string;
          source?: string;
          collected_at?: string;
          confidence?: number;
          created_at?: string;
          updated_at?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          expires_at?: string | null;
          limitations?: Json;
        };
        Update: {
          id?: string;
          profile_id?: string;
          asset_type?: string;
          title?: string;
          issuer?: string | null;
          evidence_url?: string | null;
          status?: string;
          source?: string;
          collected_at?: string;
          confidence?: number;
          created_at?: string;
          updated_at?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          expires_at?: string | null;
          limitations?: Json;
        };
      };
      demand_signals: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      business_accounts: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string | null;
          legal_name: string | null;
          niche: string | null;
          city: string | null;
          website: string | null;
          avg_check: number | null;
          current_leads_month: number | null;
          machine_profile: Json;
          proof_of_business: Json;
          local_sales_index: number;
          status: string;
          source: string;
          target_channels: Json;
          unit_economics: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug?: string | null;
          legal_name?: string | null;
          niche?: string | null;
          city?: string | null;
          website?: string | null;
          avg_check?: number | null;
          current_leads_month?: number | null;
          machine_profile?: Json;
          proof_of_business?: Json;
          local_sales_index?: number;
          status?: string;
          source?: string;
          target_channels?: Json;
          unit_economics?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string | null;
          legal_name?: string | null;
          niche?: string | null;
          city?: string | null;
          website?: string | null;
          avg_check?: number | null;
          current_leads_month?: number | null;
          machine_profile?: Json;
          proof_of_business?: Json;
          local_sales_index?: number;
          status?: string;
          source?: string;
          target_channels?: Json;
          unit_economics?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      business_members: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      business_locations: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_profiles: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_competitors: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_queries: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_visibility_checks: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_reviews: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      lost_leads: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      lead_outcomes: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      growth_tasks: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_weekly_reports: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      behavior_events: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      behavior_signals: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      agency_reports: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      result_loop_events: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      revenue_attribution: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_generated_pages: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_page_sections: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      local_page_result_reviews: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      marketing_playbooks: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      marketing_playbook_versions: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      marketing_review_queue: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      channel_unit_economics: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      agency_clients: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      agency_report_exports: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      api_usage_events: {
        Row: JsonRecord;
        Insert: JsonRecord;
        Update: JsonRecord;
      };
      cwv_metrics: {
        Row: {
          id: string;
          content_id: string | null;
          page_url: string;
          lcp_ms: number | null;
          fid_ms: number | null;
          cls_score: number | null;
          fcp_ms: number | null;
          performance_score: number | null;
          is_passing: boolean;
          checked_at: string;
        };
        Insert: {
          id?: string;
          content_id?: string | null;
          page_url: string;
          lcp_ms?: number | null;
          fid_ms?: number | null;
          cls_score?: number | null;
          fcp_ms?: number | null;
          performance_score?: number | null;
          is_passing?: boolean;
          checked_at?: string;
        };
        Update: {
          id?: string;
          content_id?: string | null;
          page_url?: string;
          lcp_ms?: number | null;
          fid_ms?: number | null;
          cls_score?: number | null;
          fcp_ms?: number | null;
          performance_score?: number | null;
          is_passing?: boolean;
          checked_at?: string;
        };
      };
    };
  };
}

// Convenient type aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type Niche = Database["public"]["Tables"]["niches"]["Row"];
export type NicheInsert = Database["public"]["Tables"]["niches"]["Insert"];
export type NicheUpdate = Database["public"]["Tables"]["niches"]["Update"];

export type Question = Database["public"]["Tables"]["questions"]["Row"];
export type QuestionInsert = Database["public"]["Tables"]["questions"]["Insert"];
export type QuestionUpdate = Database["public"]["Tables"]["questions"]["Update"];

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

export type VoiceRecording = Database["public"]["Tables"]["voice_recordings"]["Row"];
export type VoiceRecordingInsert = Database["public"]["Tables"]["voice_recordings"]["Insert"];
export type VoiceRecordingUpdate = Database["public"]["Tables"]["voice_recordings"]["Update"];

export type ContentPackage = Database["public"]["Tables"]["content_packages"]["Row"];
export type ContentPackageInsert = Database["public"]["Tables"]["content_packages"]["Insert"];
export type ContentPackageUpdate = Database["public"]["Tables"]["content_packages"]["Update"];

export type CitationCheck = Database["public"]["Tables"]["citation_checks"]["Row"];
export type CitationCheckInsert = Database["public"]["Tables"]["citation_checks"]["Insert"];
export type CitationCheckUpdate = Database["public"]["Tables"]["citation_checks"]["Update"];

export type SerpPosition = Database["public"]["Tables"]["serp_positions"]["Row"];
export type SerpPositionInsert = Database["public"]["Tables"]["serp_positions"]["Insert"];
export type SerpPositionUpdate = Database["public"]["Tables"]["serp_positions"]["Update"];

export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];

export type EmailSubscriber = Database["public"]["Tables"]["email_subscribers"]["Row"];
export type EmailSubscriberInsert = Database["public"]["Tables"]["email_subscribers"]["Insert"];
export type EmailSubscriberUpdate = Database["public"]["Tables"]["email_subscribers"]["Update"];

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
export type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];

export type MarketingWorkflowRun = Database["public"]["Tables"]["marketing_workflow_runs"]["Row"];
export type MarketingWorkflowRunInsert = Database["public"]["Tables"]["marketing_workflow_runs"]["Insert"];
export type MarketingWorkflowRunUpdate = Database["public"]["Tables"]["marketing_workflow_runs"]["Update"];

export type PageQualityCheck = Database["public"]["Tables"]["page_quality_checks"]["Row"];
export type PageQualityCheckInsert = Database["public"]["Tables"]["page_quality_checks"]["Insert"];
export type PageQualityCheckUpdate = Database["public"]["Tables"]["page_quality_checks"]["Update"];

export type SubQuery = Database["public"]["Tables"]["sub_queries"]["Row"];
export type SubQueryInsert = Database["public"]["Tables"]["sub_queries"]["Insert"];
export type SubQueryUpdate = Database["public"]["Tables"]["sub_queries"]["Update"];

export type CwvMetric = Database["public"]["Tables"]["cwv_metrics"]["Row"];
export type CwvMetricInsert = Database["public"]["Tables"]["cwv_metrics"]["Insert"];
export type CwvMetricUpdate = Database["public"]["Tables"]["cwv_metrics"]["Update"];

export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"];
export type ApiKeyInsert = Database["public"]["Tables"]["api_keys"]["Insert"];
export type ApiKeyUpdate = Database["public"]["Tables"]["api_keys"]["Update"];

export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type ReferralInsert = Database["public"]["Tables"]["referrals"]["Insert"];
export type ReferralUpdate = Database["public"]["Tables"]["referrals"]["Update"];

export type Setting = Database["public"]["Tables"]["settings"]["Row"];
export type SettingInsert = Database["public"]["Tables"]["settings"]["Insert"];
export type SettingUpdate = Database["public"]["Tables"]["settings"]["Update"];
