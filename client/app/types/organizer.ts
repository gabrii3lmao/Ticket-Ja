export interface OrganizerApplication {
  id: string
  legalName: string
  tradeName?: string | null
  document: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectedReason?: string | null
  createdAt: string
  user: { id: string; email: string; name: string; createdAt: string }
}

export interface ApplicationFilters {
  page?: number
  limit?: number
  status?: string
  legalName?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
