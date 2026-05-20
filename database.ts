export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string; name: string; slug: string; plan: string
          max_users: number; max_subsidiaries: number; is_active: boolean
          settings: Json; created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      hierarchy_levels: {
        Row: {
          id: string; tenant_id: string; name: string; rank: number
          can_approve: boolean; can_endorse: boolean; can_set_targets: boolean
          can_assign_tasks: boolean; can_see_budgets: boolean; can_see_hierarchy: boolean
          petty_cash_limit: number; dual_approval_threshold: number
          is_accounting: boolean; is_hr: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['hierarchy_levels']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['hierarchy_levels']['Insert']>
      }
      entities: {
        Row: {
          id: string; tenant_id: string; name: string; short_name: string | null
          entity_type: 'holding' | 'subsidiary' | 'branch' | 'department'
          parent_id: string | null; brand_color: string | null
          is_active: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['entities']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['entities']['Insert']>
      }
      posts: {
        Row: {
          id: string; tenant_id: string; title: string; level_id: string
          entity_id: string; branch_entity_id: string | null
          dept_manager_post_id: string | null; is_active: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['posts']['Insert']>
      }
      user_profiles: {
        Row: {
          id: string; tenant_id: string; post_id: string | null
          entity_id: string | null; full_name: string; phone: string | null
          avatar_url: string | null; is_active: boolean
          last_login: string | null; created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      funding_requests: {
        Row: {
          id: string; tenant_id: string; ref: string; requester_id: string
          entity_id: string; amount: number; category: string
          description: string; justification: string
          breakdown: Json; attachments: Json; vendor_id: string | null
          recurring: string | null; is_petty_cash: boolean; requires_dual: boolean
          status: 'pending' | 'endorsed' | 'approved' | 'rejected' | 'revision' | 'funded' | 'reserved' | 'expired'
          endorsed_by: string | null; endorsed_at: string | null
          approved_by: string | null; approved_at: string | null
          funded_by: string | null; funded_at: string | null
          rejection_reason: string | null; revision_note: string | null
          partial_amount: number | null; partial_note: string | null
          created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['funding_requests']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['funding_requests']['Insert']>
      }
      request_approvals: {
        Row: { id: string; tenant_id: string; request_id: string; approver_id: string; approved_at: string }
        Insert: Omit<Database['public']['Tables']['request_approvals']['Row'], 'id' | 'approved_at'>
        Update: never
      }
      request_comments: {
        Row: { id: string; tenant_id: string; request_id: string; author_id: string; body: string; created_at: string }
        Insert: Omit<Database['public']['Tables']['request_comments']['Row'], 'id' | 'created_at'>
        Update: never
      }
      audit_log: {
        Row: {
          id: string; tenant_id: string; actor_id: string | null
          entity_type: string; entity_id: string; action: string
          previous_state: Json | null; new_state: Json | null
          notes: string | null; ip_address: string | null; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: never
      }
      tasks: {
        Row: {
          id: string; tenant_id: string; assigned_by: string; assigned_to: string
          title: string; description: string | null; due_date: string
          priority: 'Normal' | 'High' | 'Urgent'
          status: 'open' | 'inprogress' | 'done' | 'confirmed'
          progress: number; manager_confirmed: boolean; entity_id: string
          created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      targets: {
        Row: {
          id: string; tenant_id: string; set_by: string; assigned_to: string
          title: string; description: string | null; target_type: string
          deadline: string; progress: number; manager_confirmed: boolean
          entity_id: string; created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['targets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['targets']['Insert']>
      }
      leave_requests: {
        Row: {
          id: string; tenant_id: string; requester_id: string
          start_date: string; end_date: string; leave_type: string
          acting_user_id: string | null; handover_notes: string | null
          reason: string | null; status: 'pending' | 'approved' | 'rejected'
          created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['leave_requests']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leave_requests']['Insert']>
      }
      leave_approvals: {
        Row: { id: string; tenant_id: string; leave_request_id: string; approver_id: string; approved_at: string }
        Insert: Omit<Database['public']['Tables']['leave_approvals']['Row'], 'id' | 'approved_at'>
        Update: never
      }
      complaints: {
        Row: {
          id: string; tenant_id: string; category: string; entity_id: string
          description: string; status: string; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['complaints']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['complaints']['Insert']>
      }
      vendors: {
        Row: {
          id: string; tenant_id: string; name: string; category: string
          contact: string | null; notes: string | null; is_verified: boolean
          verified_by: string | null; verified_at: string | null
          created_by: string | null; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['vendors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['vendors']['Insert']>
      }
      budget_pools: {
        Row: {
          id: string; tenant_id: string; entity_id: string; department: string
          total_amount: number; used_amount: number; period: string
          period_start: string; set_by: string | null
          created_at: string; updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['budget_pools']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['budget_pools']['Insert']>
      }
      notifications: {
        Row: {
          id: string; tenant_id: string; recipient_id: string
          title: string; body: string; type: string
          entity_type: string | null; entity_id: string | null
          is_read: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      acting_authority: {
        Row: {
          id: string; tenant_id: string; absent_user_id: string
          acting_user_id: string; start_date: string; end_date: string
          granted_by: string | null; is_active: boolean; created_at: string
        }
        Insert: Omit<Database['public']['Tables']['acting_authority']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['acting_authority']['Insert']>
      }
    }
  }
}
