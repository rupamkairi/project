import { createAuthenticatedClient, useAuthStore } from '@projectx/plugin-auth-web'

const SERVER_ROOT =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ||
  'http://localhost:10050'
const BASE = `${SERVER_ROOT}/hospitality`

const transport = createAuthenticatedClient({
  baseUrl: BASE,
  getToken: () => useAuthStore.getState().token,
  refresh: () => useAuthStore.getState().refresh(),
  onSessionExpired: () => useAuthStore.getState().clearAuth(),
})

interface RequestOptions {
  method?: string
  body?: unknown
  params?: Record<string, string> | undefined
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const body = options.body === undefined ? undefined : JSON.stringify(options.body)
  return transport.request<T>(`${path}${url.search}`, {
    method: options.method ?? 'GET',
    ...(body === undefined ? {} : { body }),
  })
}

export const hospitalityApi = {
  // Properties
  getProperties: (params?: Record<string, string>) => request('/properties', { params }),
  getProperty: (id: string) => request(`/properties/${id}`),
  createProperty: (body: any) => request('/properties', { method: 'POST', body }),
  updateProperty: (id: string, body: any) =>
    request(`/properties/${id}`, { method: 'PATCH', body }),
  deleteProperty: (id: string) => request(`/properties/${id}`, { method: 'DELETE' }),

  // Rooms
  getRooms: (params?: Record<string, string>) => request('/rooms', { params }),
  getRoom: (id: string) => request(`/rooms/${id}`),
  createRoom: (body: any) => request('/rooms', { method: 'POST', body }),
  updateRoom: (id: string, body: any) => request(`/rooms/${id}`, { method: 'PATCH', body }),
  deleteRoom: (id: string) => request(`/rooms/${id}`, { method: 'DELETE' }),
  updateRoomStatus: (id: string, body: any) =>
    request(`/rooms/${id}/status`, { method: 'PATCH', body }),

  // Reservations
  getReservations: (params?: Record<string, string>) => request('/reservations', { params }),
  getReservation: (id: string) => request(`/reservations/${id}`),
  createReservation: (body: any) => request('/reservations', { method: 'POST', body }),
  updateReservation: (id: string, body: any) =>
    request(`/reservations/${id}`, { method: 'PATCH', body }),
  cancelReservation: (id: string, reason?: string) =>
    request(`/reservations/${id}/cancel`, { method: 'POST', body: { reason } }),
  checkin: (id: string) => request(`/reservations/${id}/checkin`, { method: 'POST' }),
  checkout: (id: string) => request(`/reservations/${id}/checkout`, { method: 'POST' }),
  assignRoom: (reservationId: string, body: any) =>
    request(`/reservations/${reservationId}/assign-room`, { method: 'POST', body }),
  extendStay: (id: string, body: any) =>
    request(`/reservations/${id}/extend`, { method: 'POST', body }),
  earlyDeparture: (id: string) =>
    request(`/reservations/${id}/early-departure`, { method: 'POST' }),
  noShow: (id: string) => request(`/reservations/${id}/no-show`, { method: 'POST' }),
  getAvailability: (params: Record<string, string>) =>
    request('/reservations/availability', { params }),

  // Guests
  getGuests: (params?: Record<string, string>) => request('/guests', { params }),
  getGuest: (id: string) => request(`/guests/${id}`),
  createGuest: (body: any) => request('/guests', { method: 'POST', body }),
  updateGuest: (id: string, body: any) => request(`/guests/${id}`, { method: 'PATCH', body }),
  deleteGuest: (id: string) => request(`/guests/${id}`, { method: 'DELETE' }),
  getGuestStays: (id: string) => request(`/guests/${id}/stays`),

  // Folios
  getFolios: (params?: Record<string, string>) => request('/folios', { params }),
  getFolio: (id: string) => request(`/folios/${id}`),
  createFolio: (body: any) => request('/folios', { method: 'POST', body }),
  addFolioLine: (id: string, body: any) => request(`/folios/${id}/lines`, { method: 'POST', body }),
  finalizeFolio: (id: string) => request(`/folios/${id}/finalize`, { method: 'POST' }),
  refundFolio: (id: string, body: any) => request(`/folios/${id}/refund`, { method: 'POST', body }),
  getReservationFolios: (reservationId: string) => request(`/folios/reservation/${reservationId}`),

  // Rate Plans
  getRatePlans: (params?: Record<string, string>) => request('/rates/plans', { params }),
  createRatePlan: (body: any) => request('/rates/plans', { method: 'POST', body }),
  updateRatePlan: (id: string, body: any) =>
    request(`/rates/plans/${id}`, { method: 'PATCH', body }),
  deleteRatePlan: (id: string) => request(`/rates/plans/${id}`, { method: 'DELETE' }),
  getRateOverrides: (params?: Record<string, string>) => request('/rates/overrides', { params }),
  createRateOverride: (body: any) => request('/rates/overrides', { method: 'POST', body }),
  updateRateOverride: (id: string, body: any) =>
    request(`/rates/overrides/${id}`, { method: 'PATCH', body }),
  deleteRateOverride: (id: string) => request(`/rates/overrides/${id}`, { method: 'DELETE' }),

  // Housekeeping
  getHousekeeping: (params?: Record<string, string>) => request('/housekeeping', { params }),
  getHousekeepingTask: (id: string) => request(`/housekeeping/${id}`),
  assignHousekeeping: (id: string, body: any) =>
    request(`/housekeeping/${id}/assign`, { method: 'POST', body }),
  startHousekeeping: (id: string) => request(`/housekeeping/${id}/start`, { method: 'POST' }),
  completeHousekeeping: (id: string, body: any) =>
    request(`/housekeeping/${id}/complete`, { method: 'POST', body }),
  inspectHousekeeping: (id: string, body: any) =>
    request(`/housekeeping/${id}/inspect`, { method: 'POST', body }),
  getDirtyRooms: (params?: Record<string, string>) =>
    request('/housekeeping/rooms/dirty', { params }),

  // Services
  getServiceCatalog: (params?: Record<string, string>) => request('/services/catalog', { params }),
  createServiceCatalogItem: (body: any) => request('/services/catalog', { method: 'POST', body }),
  updateServiceCatalogItem: (id: string, body: any) =>
    request(`/services/catalog/${id}`, { method: 'PATCH', body }),
  deleteServiceCatalogItem: (id: string) =>
    request(`/services/catalog/${id}`, { method: 'DELETE' }),
  getServiceRequests: (params?: Record<string, string>) =>
    request('/services/requests', { params }),
  getServiceRequest: (id: string) => request(`/services/requests/${id}`),
  createServiceRequest: (body: any) => request('/services/requests', { method: 'POST', body }),
  assignServiceRequest: (id: string, body: any) =>
    request(`/services/requests/${id}/assign`, { method: 'POST', body }),
  completeServiceRequest: (id: string, body: any) =>
    request(`/services/requests/${id}/complete`, { method: 'POST', body }),

  // Parking
  getParking: (params?: Record<string, string>) => request('/parking', { params }),
  getParkingRecord: (id: string) => request(`/parking/${id}`),
  createParking: (body: any) => request('/parking', { method: 'POST', body }),
  updateParking: (id: string, body: any) => request(`/parking/${id}`, { method: 'PATCH', body }),
  checkoutParking: (id: string) => request(`/parking/${id}/checkout`, { method: 'POST' }),

  // Partners
  getPartners: (params?: Record<string, string>) => request('/partners', { params }),
  getPartner: (id: string) => request(`/partners/${id}`),
  createPartner: (body: any) => request('/partners', { method: 'POST', body }),
  updatePartner: (id: string, body: any) => request(`/partners/${id}`, { method: 'PATCH', body }),
  deletePartner: (id: string) => request(`/partners/${id}`, { method: 'DELETE' }),

  // Venues
  getVenues: (params?: Record<string, string>) => request('/venues', { params }),
  getVenue: (id: string) => request(`/venues/${id}`),
  createVenue: (body: any) => request('/venues', { method: 'POST', body }),
  updateVenue: (id: string, body: any) => request(`/venues/${id}`, { method: 'PATCH', body }),
  getVenueReservations: (params?: Record<string, string>) =>
    request('/venues/reservations', { params }),
  getVenueReservation: (id: string) => request(`/venues/reservations/${id}`),
  createVenueReservation: (body: any) => request('/venues/reservations', { method: 'POST', body }),
  updateVenueReservation: (id: string, body: any) =>
    request(`/venues/reservations/${id}`, { method: 'PATCH', body }),
  cancelVenueReservation: (id: string, reason?: string) =>
    request(`/venues/reservations/${id}/cancel`, { method: 'POST', body: { reason } }),

  // Reports
  getOccupancyReport: (params: Record<string, string>) => request('/reports/occupancy', { params }),
  getRevenueReport: (params: Record<string, string>) => request('/reports/revenue', { params }),
  getCancellationsReport: (params: Record<string, string>) =>
    request('/reports/cancellations', { params }),
  getArrivalsDeparturesReport: (params: Record<string, string>) =>
    request('/reports/arrivals-departures', { params }),
  getOutstandingFoliosReport: () => request('/reports/outstanding-folios'),
  getHousekeepingReport: () => request('/reports/housekeeping-turnaround'),
  getChannelPerformanceReport: () => request('/reports/channel-performance'),
}
