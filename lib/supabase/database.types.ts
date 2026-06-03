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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
