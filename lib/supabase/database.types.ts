export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "lecteur" | "modification" | "admin";
          phone: string | null;
          is_active: boolean;
          daily_task_email_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: "lecteur" | "modification" | "admin";
          phone?: string | null;
          is_active?: boolean;
          daily_task_email_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      prospects: {
        Row: {
          id: string;
          commercial_id: string;
          segment_id: string;
          company_name: string;
          company_type: string | null;
          sub_segment: string | null;
          website: string | null;
          source: string;
          status: string;
          category: "favori" | "standard" | "a_ecarter";
          pipeline_stage: string;
          address_line1: string | null;
          address_line2: string | null;
          postal_code: string | null;
          city: string | null;
          country: string;
          latitude: number | null;
          longitude: number | null;
          interest_level: number | null;
          estimated_potential: number | null;
          priority_score: number;
          capacity_fit: number | null;
          recurrence_potential: number | null;
          need_maturity: number | null;
          project_timeline: string;
          last_interaction_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["prospects"]["Row"]> & {
          commercial_id: string;
          segment_id: string;
          company_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["prospects"]["Row"]>;
      };
      contacts: {
        Row: {
          id: string;
          prospect_id: string;
          commercial_id: string;
          first_name: string | null;
          last_name: string | null;
          job_title: string | null;
          email: string | null;
          phone: string | null;
          mobile_phone: string | null;
          linkedin_url: string | null;
          is_primary: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]> & {
          prospect_id: string;
          commercial_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
      };
      visites: {
        Row: {
          id: string;
          prospect_id: string;
          opportunite_id: string | null;
          contact_id: string | null;
          commercial_id: string;
          visite_date: string;
          type: string;
          statut: string;
          personnes_rencontrees: string | null;
          resume: string;
          besoins: string | null;
          freins: string | null;
          application_envisagee: string | null;
          matiere_procede: string | null;
          solutions_evoquees: string | null;
          budget_estime: number | null;
          delai_projet: string | null;
          niveau_interet: number | null;
          prochaine_etape: string | null;
          prochaine_relance_at: string | null;
          commentaire: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["visites"]["Row"]> & {
          prospect_id: string;
          commercial_id: string;
          visite_date: string;
          resume: string;
        };
        Update: Partial<Database["public"]["Tables"]["visites"]["Row"]>;
      };
      opportunites: {
        Row: {
          id: string;
          prospect_id: string;
          contact_id: string | null;
          commercial_id: string;
          segment_id: string;
          title: string;
          description: string | null;
          stage: string;
          estimated_value: number | null;
          probability: number;
          expected_close_date: string | null;
          won_at: string | null;
          lost_at: string | null;
          loss_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["opportunites"]["Row"]> & {
          prospect_id: string;
          commercial_id: string;
          segment_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["opportunites"]["Row"]>;
      };
      segments: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["segments"]["Row"]> & {
          code: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["segments"]["Row"]>;
      };
      prospect_segments: {
        Row: {
          prospect_id: string;
          segment_id: string;
          created_at: string;
        };
        Insert: {
          prospect_id: string;
          segment_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["prospect_segments"]["Insert"]>;
      };
      prospect_assignments: {
        Row: {
          prospect_id: string;
          user_id: string;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          prospect_id: string;
          user_id: string;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["prospect_assignments"]["Insert"]>;
      };
      prospect_images: {
        Row: {
          id: string;
          prospect_id: string;
          commercial_id: string;
          created_by: string;
          bucket_id: string;
          storage_path: string;
          file_name: string;
          original_file_name: string | null;
          content_type: string;
          file_size: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["prospect_images"]["Row"]> & {
          prospect_id: string;
          commercial_id: string;
          created_by: string;
          storage_path: string;
          file_name: string;
          content_type: string;
          file_size: number;
        };
        Update: Partial<Database["public"]["Tables"]["prospect_images"]["Row"]>;
      };
      commercial_action_threads: {
        Row: {
          id: string;
          prospect_id: string;
          contact_id: string | null;
          owner_user_id: string;
          current_action_type: string;
          current_due_date: string;
          current_priority: string;
          current_status: string;
          prospect_status: string;
          current_comment: string | null;
          last_completed_action_at: string | null;
          closed_at: string | null;
          closed_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["commercial_action_threads"]["Row"]> & {
          prospect_id: string;
          owner_user_id: string;
          current_action_type: string;
          current_due_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["commercial_action_threads"]["Row"]>;
      };
      commercial_action_events: {
        Row: {
          id: string;
          action_thread_id: string;
          completed_at: string;
          action_type: string;
          result: string | null;
          report: string | null;
          prospect_status_after_action: string;
          next_action_type: string | null;
          next_due_date: string | null;
          priority_after_action: string | null;
          created_by_user_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["commercial_action_events"]["Row"]> & {
          action_thread_id: string;
          completed_at: string;
          action_type: string;
          prospect_status_after_action: string;
          created_by_user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["commercial_action_events"]["Row"]>;
      };
      visite_assignments: {
        Row: {
          visite_id: string;
          user_id: string;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          visite_id: string;
          user_id: string;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["visite_assignments"]["Insert"]>;
      };
      actions_suivantes: {
        Row: {
          id: string;
          prospect_id: string;
          opportunite_id: string | null;
          visite_id: string | null;
          commercial_id: string;
          type: string;
          title: string;
          description: string | null;
          due_at: string;
          status: string;
          priority: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["actions_suivantes"]["Row"]> & {
          prospect_id: string;
          commercial_id: string;
          title: string;
          due_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["actions_suivantes"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_prospect_with_contact: {
        Args: {
          prospect_payload: Json;
          contact_payload: Json;
        };
        Returns: string;
      };
      complete_commercial_action_thread: {
        Args: {
          target_thread_id: string;
          completed_at_value: string;
          action_type_value: string;
          result_value: string | null;
          report_value: string | null;
          prospect_status_after_action_value: string;
          next_action_type_value: string | null;
          next_due_date_value: string | null;
          priority_after_action_value: string | null;
          comment_value: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
