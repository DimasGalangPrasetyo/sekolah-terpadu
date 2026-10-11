import type { FormInstance } from 'antd'
import { getFieldErrors } from '../api/errors'

/** Menampilkan galat validasi server (422) pada kolom formulir yang bersangkutan. */
export function applyFieldErrors(form: FormInstance, error: unknown): boolean {
  const errors = getFieldErrors(error)
  if (!errors) return false

  form.setFields(Object.entries(errors).map(([name, messages]) => ({ name, errors: messages })))
  return true
}
