import { http } from '../../api/client'

export interface SchoolProfile {
  foundation_name: string
  address: string | null
  phone: string | null
  email: string | null
  headmasters: { TK: string; SD: string; SMP: string }
}

export async function getSchoolProfile(): Promise<SchoolProfile> {
  const { data } = await http.get<{ data: SchoolProfile }>('/school-profile')
  return data.data
}

export async function saveSchoolProfile(payload: SchoolProfile): Promise<SchoolProfile> {
  const { data } = await http.put<{ data: SchoolProfile }>('/school-profile', payload)
  return data.data
}
