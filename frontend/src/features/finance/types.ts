export type FeeCategory = 'monthly' | 'one_time' | 'annual' | 'other'

export interface FeeType {
  id: number
  code: string
  name: string
  category: FeeCategory
  is_active: boolean
}

export interface FeeTypePayload {
  code?: string
  name: string
  category: FeeCategory
}

export interface FeeRate {
  id: number
  amount: number
  fee_type: {
    id: number
    code: string
    name: string
    category: FeeCategory
    is_active: boolean
  }
  unit: {
    id: number
    code: string
    name: string
  }
  grade_level: {
    id: number
    code: string
    name: string
  } | null
  academic_year: {
    id: number
    name: string
  }
}

export interface FeeRatePayload {
  fee_type_id: number
  unit_id: number
  grade_level_id?: number | null
  academic_year_id: number
  amount: number
}

export type DiscountType = 'fixed' | 'percent'

export interface StudentDiscount {
  id: number
  type: DiscountType
  value: number
  reason: string | null
  is_active: boolean
  student: {
    id: number
    name: string
    nis: string | null
  }
  fee_type: {
    id: number
    code: string
    name: string
  } | null
  academic_year: {
    id: number
    name: string
  }
}

export interface StudentDiscountPayload {
  student_id?: number
  fee_type_id?: number | null
  academic_year_id?: number
  type: DiscountType
  value: number
  reason?: string | null
}

export interface StudentDiscountParams {
  page?: number
  per_page?: number
  q?: string
  academic_year_id?: number
  fee_type_id?: number
  is_active?: boolean | number
}
