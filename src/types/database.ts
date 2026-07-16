export type UserRole =
  | 'super_admin'
  | 'it_admin'
  | 'facilities_admin'
  | 'hr'
  | 'employee'
  | 'inventory_admin'
export type AssetType = 'permanent' | 'disposable'
export type CategoryDomain = 'it' | 'facilities'
export type AssetStatus =
  | 'available'
  | 'assigned'
  | 'under_maintenance'
  | 'lost'
  | 'damaged'
  | 'retired'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled'
export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type TransactionType =
  | 'purchase'
  | 'assignment'
  | 'return'
  | 'disposal'
  | 'adjustment'
  | 'stock_in'
  | 'stock_out'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          is_active: boolean
          location_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          is_active?: boolean
          location_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          is_active?: boolean
          location_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'departments_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      distributions: {
        Row: {
          id: string
          asset_id: string
          employee_id: string | null
          department_id: string | null
          quantity: number
          notes: string | null
          distributed_by: string | null
          distributed_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          employee_id?: string | null
          department_id?: string | null
          quantity: number
          notes?: string | null
          distributed_by?: string | null
          distributed_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          employee_id?: string | null
          department_id?: string | null
          quantity?: number
          notes?: string | null
          distributed_by?: string | null
          distributed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'distributions_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'distributions_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'distributions_distributed_by_fkey'
            columns: ['distributed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'distributions_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          role_id: string
          department_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          role_id: string
          department_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          role_id?: string
          department_id?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'users_role_id_fkey'
            columns: ['role_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      employees: {
        Row: {
          id: string
          user_id: string
          employee_number: string
          job_title: string | null
          department_id: string | null
          joining_date: string | null
          status: string
          created_at: string
          is_active: boolean
          work_location_id: string | null
          end_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          employee_number: string
          job_title?: string | null
          department_id?: string | null
          joining_date?: string | null
          status?: string
          created_at?: string
          is_active?: boolean
          work_location_id?: string | null
          end_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          employee_number?: string
          job_title?: string | null
          department_id?: string | null
          joining_date?: string | null
          status?: string
          created_at?: string
          is_active?: boolean
          work_location_id?: string | null
          end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'employees_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employees_work_location_id_fkey'
            columns: ['work_location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      locations: {
        Row: {
          id: string
          building: string
          floor: number
          room: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building: string
          floor?: number
          room?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building?: string
          floor?: number
          room?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          asset_type: string
          domain: string
          is_active: boolean
          icon_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          asset_type: string
          domain?: string
          is_active?: boolean
          icon_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          asset_type?: string
          domain?: string
          is_active?: boolean
          icon_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      asset_subcategories: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'asset_subcategories_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'asset_categories'
            referencedColumns: ['id']
          },
        ]
      }
      assets: {
        Row: {
          id: string
          asset_code: string
          name: string
          description: string | null
          category_id: string | null
          subcategory_id: string | null
          asset_type: string
          serial_number: string | null
          barcode: string | null
          manufacturer: string | null
          model: string | null
          operating_system: string | null
          purpose: string | null
          purchase_date: string | null
          purchase_price: number | null
          useful_life_years: number | null
          salvage_value: number | null
          warranty_expiry: string | null
          supplier: string | null
          status: string
          condition: string
          location: string | null
          quantity: number
          minimum_stock_level: number
          image_path: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          asset_code: string
          name: string
          description?: string | null
          category_id?: string | null
          subcategory_id?: string | null
          asset_type: string
          serial_number?: string | null
          barcode?: string | null
          manufacturer?: string | null
          model?: string | null
          operating_system?: string | null
          purpose?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          useful_life_years?: number | null
          salvage_value?: number | null
          warranty_expiry?: string | null
          supplier?: string | null
          status?: string
          condition?: string
          location?: string | null
          quantity?: number
          minimum_stock_level?: number
          image_path?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          asset_code?: string
          name?: string
          description?: string | null
          category_id?: string | null
          subcategory_id?: string | null
          asset_type?: string
          serial_number?: string | null
          barcode?: string | null
          manufacturer?: string | null
          model?: string | null
          operating_system?: string | null
          purpose?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          useful_life_years?: number | null
          salvage_value?: number | null
          warranty_expiry?: string | null
          supplier?: string | null
          status?: string
          condition?: string
          location?: string | null
          quantity?: number
          minimum_stock_level?: number
          image_path?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'assets_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'asset_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'assets_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      asset_assignments: {
        Row: {
          id: string
          asset_id: string
          employee_id: string
          assigned_date: string
          returned_date: string | null
          assigned_by: string | null
          condition_before: string | null
          condition_after: string | null
          notes: string | null
          created_at: string
          location_id: string | null
          expected_return_date: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          asset_id: string
          employee_id: string
          assigned_date?: string
          returned_date?: string | null
          assigned_by?: string | null
          condition_before?: string | null
          condition_after?: string | null
          notes?: string | null
          created_at?: string
          location_id?: string | null
          expected_return_date?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          asset_id?: string
          employee_id?: string
          assigned_date?: string
          returned_date?: string | null
          assigned_by?: string | null
          condition_before?: string | null
          condition_after?: string | null
          notes?: string | null
          created_at?: string
          location_id?: string | null
          expected_return_date?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'asset_assignments_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asset_assignments_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asset_assignments_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asset_assignments_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      asset_transactions: {
        Row: {
          id: string
          asset_id: string
          transaction_type: string
          quantity: number
          from_location: string | null
          to_location: string | null
          performed_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          transaction_type: string
          quantity?: number
          from_location?: string | null
          to_location?: string | null
          performed_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          transaction_type?: string
          quantity?: number
          from_location?: string | null
          to_location?: string | null
          performed_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'asset_transactions_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'asset_transactions_performed_by_fkey'
            columns: ['performed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_records: {
        Row: {
          id: string
          asset_id: string
          issue_description: string
          status: string
          maintenance_date: string | null
          cost: number | null
          notes: string | null
          reported_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          issue_description: string
          status?: string
          maintenance_date?: string | null
          cost?: number | null
          notes?: string | null
          reported_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          issue_description?: string
          status?: string
          maintenance_date?: string | null
          cost?: number | null
          notes?: string | null
          reported_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_records_asset_id_fkey'
            columns: ['asset_id']
            isOneToOne: false
            referencedRelation: 'assets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_records_reported_by_fkey'
            columns: ['reported_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      requests: {
        Row: {
          id: string
          employee_id: string
          asset_category_id: string | null
          quantity: number
          reason: string
          status: string
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          asset_category_id?: string | null
          quantity?: number
          reason: string
          status?: string
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          asset_category_id?: string | null
          quantity?: number
          reason?: string
          status?: string
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'requests_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'requests_asset_category_id_fkey'
            columns: ['asset_category_id']
            isOneToOne: false
            referencedRelation: 'asset_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'requests_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_employee: {
        Args: { p_employee_id: string }
        Returns: undefined
      }
      admin_create_user: {
        Args: {
          p_email: string
          p_password: string
          p_full_name: string
          p_role_name: string
          p_phone?: string | null
          p_department_id?: string | null
          p_employee_number?: string | null
          p_job_title?: string | null
        }
        Returns: string
      }
      admin_update_user: {
        Args: {
          p_user_id: string
          p_role_id?: string | null
          p_status?: string | null
          p_full_name?: string | null
          p_email?: string | null
          p_phone?: string | null
        }
        Returns: Database['public']['Tables']['users']['Row']
      }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      deactivate_employee: {
        Args: { p_employee_id: string }
        Returns: undefined
      }
      get_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      next_employee_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type UserProfile = Tables<'users'> & {
  role?: Tables<'roles'> | null
  department?: Tables<'departments'> | null
  employee?: Tables<'employees'> | null
}

export type DashboardStats = {
  total_assets: number
  permanent_assets: number
  disposable_stock: number
  assigned_assets: number
  available_assets: number
  low_stock_count: number
  open_maintenance: number
  pending_requests: number
  overdue_assignments: number
  warranty_expiring_30: number
  active_employees: number
  coverage_rate: number
}
