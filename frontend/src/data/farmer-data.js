export const FARMER_PROFILE = {
  name: 'Rahul Kumar',
  farmerId: 'FK123456',
  mobile: '+91 9876543210',
  village: 'ABC Village',
  district: 'XYZ District',
  state: 'Uttar Pradesh',
  initials: 'RK',
  verified: true,
}

export const DASHBOARD_METRICS = {
  upcomingBookings: 2,
  totalProcurements: 5,
  totalEarnings: '₹27,300',
}

export const UPCOMING_BOOKING = {
  id: 'UB-101',
  produce: 'Wheat',
  center: 'Procurement Center A',
  fullCenter: 'Agricultural Procurement Center A, XYZ Village',
  date: '12 Sep 2025',
  time: '10:00 AM - 11:00 AM',
  token: 'A-042',
  status: 'Confirmed',
}

export const ALL_BOOKINGS = [
  {
    id: 'UB-101',
    produce: 'Wheat',
    center: 'Procurement Center A',
    fullCenter: 'Agricultural Procurement Center A, XYZ Village',
    date: '12 Sep 2025',
    time: '10:00 AM - 11:00 AM',
    token: 'A-042',
    status: 'Confirmed',
  },
  {
    id: 'UB-102',
    produce: 'Rice',
    center: 'Procurement Center B',
    fullCenter: 'Procurement Center B, ABC Town',
    date: '18 Sep 2025',
    time: '01:00 PM - 02:00 PM',
    token: 'B-018',
    status: 'Confirmed',
  },
]

export const PROCUREMENT_CENTERS = [
  {
    id: 'center-a',
    name: 'Agricultural Procurement Center A',
    location: '5 km • XYZ Village',
    address: 'XYZ Village, District Name',
    crops: 'Wheat, Rice, Maize',
    availableSlots: 32,
    image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'center-b',
    name: 'Procurement Center B',
    location: '9 km • ABC Town',
    address: 'ABC Town, District Name',
    crops: 'Wheat, Rice',
    availableSlots: 18,
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'center-c',
    name: 'Procurement Center C',
    location: '12 km • DEF City',
    address: 'DEF City, District Name',
    crops: 'Wheat, Maize, Pulses',
    availableSlots: 25,
    image: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=400&q=80',
  },
]

export const TIME_SLOTS = [
  { id: 'slot-1', time: '09:00 - 10:00 AM', available: 8, status: 'available' },
  { id: 'slot-2', time: '10:00 - 11:00 AM', available: 5, status: 'available' },
  { id: 'slot-3', time: '11:00 - 12:00 PM', available: 0, status: 'full' },
  { id: 'slot-4', time: '12:00 - 01:00 PM', available: 12, status: 'available' },
  { id: 'slot-5', time: '01:00 - 02:00 PM', available: 10, status: 'available' },
]

export const LIVE_QUEUE_DATA = {
  center: 'Center A',
  lastUpdated: '10:24 AM',
  nowServing: 'A-036',
  yourToken: 'A-042',
  farmersAhead: 6,
  estimatedWait: '18 minutes',
  queue: [
    { token: 'A-037', status: 'Completed' },
    { token: 'A-038', status: 'Completed' },
    { token: 'A-039', status: 'Completed' },
    { token: 'A-040', status: 'Completed' },
    { token: 'A-041', status: 'Waiting' },
    { token: 'A-042', status: 'You', isCurrent: true },
  ],
}

export const PROCUREMENT_HISTORY = [
  { id: 'PH-1', date: '12 Aug 2025', center: 'Center A', produce: 'Wheat', quantity: '1,200 kg', amount: '₹27,300', status: 'Completed' },
  { id: 'PH-2', date: '12 Jul 2025', center: 'Center A', produce: 'Wheat', quantity: '1,000 kg', amount: '₹22,750', status: 'Completed' },
  { id: 'PH-3', date: '05 Jul 2025', center: 'Center B', produce: 'Rice', quantity: '950 kg', amount: '₹18,050', status: 'Completed' },
  { id: 'PH-4', date: '18 May 2025', center: 'Center A', produce: 'Wheat', quantity: '1,050 kg', amount: '₹22,575', status: 'Completed' },
  { id: 'PH-5', date: '10 Apr 2025', center: 'Center C', produce: 'Maize', quantity: '800 kg', amount: '₹16,000', status: 'Completed' },
  { id: 'PH-6', date: '15 Mar 2025', center: 'Center A', produce: 'Wheat', quantity: '900 kg', amount: '₹19,800', status: 'Completed' },
]

export const PAYMENT_RECORDS = [
  { id: 'PAY-1', date: '12 Aug 2025', produce: 'Wheat', amount: '₹27,300', status: 'Paid', transactionId: 'TXN123456' },
  { id: 'PAY-2', date: '05 Jul 2025', produce: 'Rice', amount: '₹18,050', status: 'Pending', transactionId: '-' },
  { id: 'PAY-3', date: '18 May 2025', produce: 'Wheat', amount: '₹22,575', status: 'Paid', transactionId: 'TXN987654' },
  { id: 'PAY-4', date: '10 Apr 2025', produce: 'Maize', amount: '₹16,000', status: 'Paid', transactionId: 'TXN456789' },
  { id: 'PAY-5', date: '15 Mar 2025', produce: 'Wheat', amount: '₹19,800', status: 'Pending', transactionId: '-' },
]
