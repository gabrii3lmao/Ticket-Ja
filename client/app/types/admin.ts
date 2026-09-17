import type { Order } from './api'

export interface AdminEvent {
  id: string
  name: string
  description?: string | null
  artists: string[]
  startDate: string
  endDate?: string | null
  imageUrl?: string | null
  status: string
  createdAt: string
  venue?: { id: string; name: string; city?: string | null } | null
  organizerProfile?: { id: string; legalName: string } | null
  categories?: { id: string; name: string; price: string; quantity: number }[]
}

export interface AdminEventFilters {
  page?: number
  limit?: number
  name?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface AdminVenue {
  id: string
  name: string
  street?: string | null
  number?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  capacity: number
  createdAt: string
  organizerProfile?: { id: string; legalName: string } | null
}

export interface AdminVenueFilters {
  page?: number
  limit?: number
  name?: string
  city?: string
  state?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaymentFilters {
  page?: number
  limit?: number
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaymentDetail extends Order {
  user: {
    id: string
    name: string
    email: string
    taxId?: string | null
    phone?: string | null
  }
}
