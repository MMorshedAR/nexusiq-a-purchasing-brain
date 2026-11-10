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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          summary: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          summary?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_branch_company_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_members: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["branch_access_role"]
          user_id: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["branch_access_role"]
          user_id: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["branch_access_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_members_branch_id_company_id_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "branch_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          branch_code: string
          company_id: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          name: string
          opening_date: string | null
          phone: string | null
          status: string
        }
        Insert: {
          address?: string | null
          branch_code: string
          company_id: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name: string
          opening_date?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          address?: string | null
          branch_code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          opening_date?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          client_message_id: string | null
          company_id: string
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          client_message_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          client_message_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          company_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          business_type: string | null
          city: string | null
          company_email: string | null
          country: string
          created_at: string
          created_by: string
          currency: string
          id: string
          logo_path: string | null
          monthly_budget: number | null
          name: string
          phone: string | null
          registration_number: string | null
          slug: string
          tax_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          company_email?: string | null
          country?: string
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          logo_path?: string | null
          monthly_budget?: number | null
          name: string
          phone?: string | null
          registration_number?: string | null
          slug: string
          tax_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          company_email?: string | null
          country?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          logo_path?: string | null
          monthly_budget?: number | null
          name?: string
          phone?: string | null
          registration_number?: string | null
          slug?: string
          tax_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          branch_scoped: boolean
          company_id: string
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          branch_scoped?: boolean
          company_id: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          branch_scoped?: boolean
          company_id?: string
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_compensation: {
        Row: {
          allowances: number
          basic_salary: number
          bonuses: number
          branch_id: string
          company_id: string
          created_at: string
          deductions: number
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
        }
        Insert: {
          allowances?: number
          basic_salary?: number
          bonuses?: number
          branch_id: string
          company_id: string
          created_at?: string
          deductions?: number
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
        }
        Update: {
          allowances?: number
          basic_salary?: number
          bonuses?: number
          branch_id?: string
          company_id?: string
          created_at?: string
          deductions?: number
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_compensation_employee_id_company_id_branch_id_fkey"
            columns: ["employee_id", "company_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "company_id", "branch_id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          branch_id: string
          company_id: string
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          employee_code: string
          employment_status: string
          employment_type: string
          full_name: string
          gender: string | null
          id: string
          joining_date: string | null
          phone: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          branch_id: string
          company_id: string
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_code?: string
          employment_status?: string
          employment_type?: string
          full_name: string
          gender?: string | null
          id?: string
          joining_date?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          branch_id?: string
          company_id?: string
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          employee_code?: string
          employment_status?: string
          employment_type?: string
          full_name?: string
          gender?: string | null
          id?: string
          joining_date?: string | null
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_company_id_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          company_id: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_product_company_fkey"
            columns: ["product_id", "company_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_company_fkey"
            columns: ["warehouse_id", "company_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          allowances: number
          basic_salary: number
          bonuses: number
          branch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          deductions: number
          employee_id: string
          id: string
          manually_recorded: boolean
          net_salary: number | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string
          salary_period: string
          transaction_reference: string | null
        }
        Insert: {
          allowances?: number
          basic_salary: number
          bonuses?: number
          branch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deductions?: number
          employee_id: string
          id?: string
          manually_recorded?: boolean
          net_salary?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          salary_period: string
          transaction_reference?: string | null
        }
        Update: {
          allowances?: number
          basic_salary?: number
          bonuses?: number
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deductions?: number
          employee_id?: string
          id?: string
          manually_recorded?: boolean
          net_salary?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          salary_period?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_company_id_branch_id_fkey"
            columns: ["employee_id", "company_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id", "company_id", "branch_id"]
          },
        ]
      }
      po_items: {
        Row: {
          company_id: string
          id: string
          po_id: string
          product_id: string
          quantity: number
          unit_cost: number
        }
        Insert: {
          company_id: string
          id?: string
          po_id: string
          product_id: string
          quantity: number
          unit_cost?: number
        }
        Update: {
          company_id?: string
          id?: string
          po_id?: string
          product_id?: string
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_order_company_fkey"
            columns: ["po_id", "company_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_product_company_fkey"
            columns: ["product_id", "company_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "po_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          id: string
          lead_time_days: number
          name: string
          reorder_point: number
          safety_stock: number
          sell_price: number
          sku: string
          supplier_id: string | null
          unit: string
          unit_cost: number
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          id?: string
          lead_time_days?: number
          name: string
          reorder_point?: number
          safety_stock?: number
          sell_price?: number
          sku: string
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          id?: string
          lead_time_days?: number
          name?: string
          reorder_point?: number
          safety_stock?: number
          sell_price?: number
          sku?: string
          supplier_id?: string | null
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_company_fkey"
            columns: ["supplier_id", "company_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          received_at: string | null
          status: Database["public"]["Enums"]["po_status"]
          supplier_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          supplier_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_company_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_company_fkey"
            columns: ["supplier_id", "company_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_company_fkey"
            columns: ["warehouse_id", "company_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_history: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          sale_date: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          sale_date: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          sale_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_history_branch_company_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "sales_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_history_product_company_fkey"
            columns: ["product_id", "company_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "sales_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_transaction_items: {
        Row: {
          branch_id: string
          company_id: string
          id: string
          line_total: number | null
          product_id: string
          quantity: number
          transaction_id: string
          unit_cost: number
          unit_price: number
          warehouse_id: string
        }
        Insert: {
          branch_id: string
          company_id: string
          id?: string
          line_total?: number | null
          product_id: string
          quantity: number
          transaction_id: string
          unit_cost: number
          unit_price: number
          warehouse_id: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          id?: string
          line_total?: number | null
          product_id?: string
          quantity?: number
          transaction_id?: string
          unit_cost?: number
          unit_price?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_transaction_items_branch_id_company_id_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "sales_transaction_items_product_company_fkey"
            columns: ["product_id", "company_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "sales_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transaction_items_transaction_company_branch_fkey"
            columns: ["transaction_id", "company_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id", "company_id", "branch_id"]
          },
          {
            foreignKeyName: "sales_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "sales_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transaction_items_warehouse_company_fkey"
            columns: ["warehouse_id", "company_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "sales_transaction_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_transactions: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          total_amount: number
          transaction_date: string
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          total_amount?: number
          transaction_date?: string
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          total_amount?: number
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_branch_id_company_id_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "sales_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          company_id: string
          contact_name: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          lead_time_days: number
          name: string
          payment_terms: string | null
          phone: string | null
        }
        Insert: {
          company_id: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_time_days?: number
          name: string
          payment_terms?: string | null
          phone?: string | null
        }
        Update: {
          company_id?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_time_days?: number
          name?: string
          payment_terms?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          branch_id: string | null
          branch_role: Database["public"]["Enums"]["branch_access_role"] | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["company_role"]
          status: string
          token: string
        }
        Insert: {
          branch_id?: string | null
          branch_role?: Database["public"]["Enums"]["branch_access_role"] | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["company_role"]
          status?: string
          token?: string
        }
        Update: {
          branch_id?: string | null
          branch_role?: Database["public"]["Enums"]["branch_access_role"] | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["company_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_branch_company_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "team_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          branch_id: string | null
          capacity_units: number | null
          company_id: string
          created_at: string
          id: string
          location: string | null
          name: string
        }
        Insert: {
          branch_id?: string | null
          capacity_units?: number | null
          company_id: string
          created_at?: string
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          branch_id?: string | null
          capacity_units?: number | null
          company_id?: string
          created_at?: string
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_branch_company_fkey"
            columns: ["branch_id", "company_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      branch_invite_preview: {
        Args: { _token: string }
        Returns: {
          branch_name: string
          company_name: string
          expires_at: string
          invited_branch_role: Database["public"]["Enums"]["branch_access_role"]
          invited_email: string
        }[]
      }
      can_edit_branch: {
        Args: { _branch: string; _company: string }
        Returns: boolean
      }
      can_edit_company: { Args: { _company: string }; Returns: boolean }
      claim_invite: {
        Args: { _email: string; _token: string }
        Returns: string
      }
      count_owners: { Args: { _company: string }; Returns: number }
      create_company: {
        Args: {
          _budget: number
          _business_type: string
          _country: string
          _currency: string
          _full_name: string
          _name: string
          _slug: string
        }
        Returns: string
      }
      generate_branch_payroll: {
        Args: { _branch: string; _period: string }
        Returns: number
      }
      invite_preview: {
        Args: { _token: string }
        Returns: {
          company_name: string
          expires_at: string
          invited_email: string
          invited_role: Database["public"]["Enums"]["company_role"]
        }[]
      }
      is_branch_admin: {
        Args: { _branch: string; _company: string }
        Returns: boolean
      }
      is_branch_member: {
        Args: { _branch: string; _company: string }
        Returns: boolean
      }
      is_company_admin: { Args: { _company: string }; Returns: boolean }
      is_company_member: { Args: { _company: string }; Returns: boolean }
      is_company_owner: {
        Args: { _company: string; _user: string }
        Returns: boolean
      }
      manage_branch_member: {
        Args: {
          _branch: string
          _role: Database["public"]["Enums"]["branch_access_role"]
          _user: string
        }
        Returns: string
      }
      receive_purchase_order: { Args: { _po: string }; Returns: undefined }
      record_branch_sale: {
        Args: { _branch: string; _items: Json; _transaction_date?: string }
        Returns: string
      }
      remove_branch_member: {
        Args: { _assignment: string }
        Returns: undefined
      }
      set_employee_compensation: {
        Args: {
          _allowances: number
          _basic: number
          _bonuses: number
          _deductions: number
          _effective_from: string
          _employee: string
        }
        Returns: string
      }
      slug_available: { Args: { _slug: string }; Returns: boolean }
    }
    Enums: {
      branch_access_role: "admin" | "manager" | "employee"
      company_role: "owner" | "admin" | "manager" | "analyst" | "viewer"
      po_status: "draft" | "approved" | "received" | "cancelled"
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
      branch_access_role: ["admin", "manager", "employee"],
      company_role: ["owner", "admin", "manager", "analyst", "viewer"],
      po_status: ["draft", "approved", "received", "cancelled"],
    },
  },
} as const
