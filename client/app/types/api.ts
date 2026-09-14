export type UserRole = 'BUYER' | 'ORGANIZER' | 'ADMIN'

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'FINISHED' | 'CANCELED'
export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELED'
export type TicketStatus = 'VALID' | 'USED' | 'CANCELED'
export type PaymentStatus = 'APPROVED' | 'PENDING' | 'REJECTED'
export type DiscountType = 'PERCENTAGE' | 'FIXED'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  taxId?: string | null
  phone?: string | null
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface Venue {
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
}

export interface OrganizerProfile {
  id: string
  legalName: string
  tradeName?: string | null
  document: string
}

export interface Category {
  id: string
  name: string
  description?: string | null
  price: string
  quantity: number
  salesStart?: string | null
  salesEnd?: string | null
  createdAt: string
}

export interface Event {
  id: string
  name: string
  description?: string | null
  artists: string[]
  startDate: string
  endDate?: string | null
  imageUrl?: string | null
  minimumAge?: number | null
  status: EventStatus
  venue?: Venue
  categories?: Category[]
  organizerProfile?: OrganizerProfile
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  amount: string
  status: PaymentStatus
  confirmedAt?: string | null
  rejectedAt?: string | null
  createdAt: string
}

export interface Ticket {
  id: string
  code: string
  qrCode: string
  status: TicketStatus
  usedAt?: string | null
  createdAt: string
  event?: Event
  orderItem?: OrderItem
}

export interface OrderItem {
  id: string
  quantity: number
  unitPrice: string
  total: string
  tickets: Ticket[]
  category?: Category
}

export interface Order {
  id: string
  subtotal: string
  discount: string
  fee: string
  total: string
  status: OrderStatus
  reservedUntil?: string | null
  orderItems: OrderItem[]
  payment?: Payment
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface EventFilters {
  page?: number
  limit?: number
  name?: string
  city?: string
  state?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateOrderInput {
  items: { categoryId: string; quantity: number }[]
  couponCode?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  role?: UserRole
}
