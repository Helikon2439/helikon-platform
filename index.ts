import type { Database } from './database'

export type Tenant = Database['public']['Tables']['tenants']['Row']
export type HierarchyLevel = Database['public']['Tables']['hierarchy_levels']['Row']
export type Entity = Database['public']['Tables']['entities']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type FundingRequest = Database['public']['Tables']['funding_requests']['Row']
export type RequestApproval = Database['public']['Tables']['request_approvals']['Row']
export type RequestComment = Database['public']['Tables']['request_comments']['Row']
export type AuditEntry = Database['public']['Tables']['audit_log']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Target = Database['public']['Tables']['targets']['Row']
export type LeaveRequest = Database['public']['Tables']['leave_requests']['Row']
export type LeaveApproval = Database['public']['Tables']['leave_approvals']['Row']
export type Complaint = Database['public']['Tables']['complaints']['Row']
export type Vendor = Database['public']['Tables']['vendors']['Row']
export type BudgetPool = Database['public']['Tables']['budget_pools']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type ActingAuthority = Database['public']['Tables']['acting_authority']['Row']

// Enriched types with joined data
export interface EnrichedUser extends UserProfile {
  post?: Post & { level?: HierarchyLevel }
  entity?: Entity
}

export interface EnrichedRequest extends FundingRequest {
  requester?: EnrichedUser
  entity?: Entity
  vendor?: Vendor | null
  approvals?: RequestApproval[]
  comments?: RequestComment[]
  audit?: AuditEntry[]
}

export interface EnrichedTask extends Task {
  assignedByUser?: EnrichedUser
  assignedToUser?: EnrichedUser
}

export interface EnrichedTarget extends Target {
  setByUser?: EnrichedUser
  assignedToUser?: EnrichedUser
}

export interface BreakdownItem {
  item: string
  qty: number
  unit_price: number
}

export interface AttachmentItem {
  name: string
  url: string
  size: number
}

export type RequestStatus = FundingRequest['status']
export type TaskStatus = Task['status']
export type LeaveStatus = LeaveRequest['status']
