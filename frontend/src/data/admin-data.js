export const ADMIN_METRICS = {
  totalFarmers: '1,240',
  procurementCenters: '8',
  totalProcurements: '5,620',
  totalPayments: '₹1.8 Cr',
}

export const ADMIN_TREND_DATA = [
  { month: 'Jul', value: 15 },
  { month: 'Aug', value: 30 },
  { month: 'Sep', value: 22 },
  { month: 'Oct', value: 45 },
]

export const ADMIN_CROP_DISTRIBUTION = [
  { crop: 'Wheat', percent: 60, color: '#3b82f6', hex: '#3b82f6' },
  { crop: 'Rice', percent: 20, color: '#f59e0b', hex: '#f59e0b' },
  { crop: 'Maize', percent: 10, color: '#ca8a04', hex: '#ca8a04' },
  { crop: 'Pulses', percent: 10, color: '#10b981', hex: '#10b981' },
]

export const ADMIN_RECENT_ACTIVITIES = [
  { id: 1, text: 'New farmer registered', time: '10:24 AM', status: 'Completed', type: 'farmer' },
  { id: 2, text: 'Payment processed', time: '09:16 AM', status: 'Completed', type: 'payment' },
  { id: 3, text: 'Slot booked at Center A', time: '08:45 AM', status: 'Confirmed', type: 'slot' },
  { id: 4, text: 'Grain inspection passed (Wheat 2000kg)', time: '08:12 AM', status: 'Completed', type: 'procurement' },
  { id: 5, text: 'Procurement center capacity updated', time: 'Yesterday', status: 'Completed', type: 'center' },
  { id: 6, text: 'DBT Batch disbursement initiated', time: 'Yesterday', status: 'Completed', type: 'payment' },
]

export const ADMIN_CENTER_PERFORMANCE = [
  { name: 'Center A', performance: 90, capacity: 200, booked: 180 },
  { name: 'Center B', performance: 70, capacity: 150, booked: 105 },
  { name: 'Center C', performance: 66, capacity: 180, booked: 120 },
  { name: 'Center D', performance: 85, capacity: 220, booked: 187 },
]

export const ADMIN_CENTERS = [
  {
    id: 1001,
    name: 'Agricultural Procurement Center A',
    state: 'Uttar Pradesh',
    district: 'XYZ District',
    village: 'XYZ Village',
    address: 'Plot 12, Mandi Road, XYZ Village',
    daily_capacity: 200,
    current_capacity: 180,
    utilization: 90,
    opening_time: '08:00 AM',
    closing_time: '06:00 PM',
    status: 'Active',
    pincode: 201301,
  },
  {
    id: 1002,
    name: 'Procurement Center B',
    state: 'Uttar Pradesh',
    district: 'ABC District',
    village: 'ABC Town',
    address: 'Mandi Samiti Complex, ABC Town',
    daily_capacity: 150,
    current_capacity: 105,
    utilization: 70,
    opening_time: '08:30 AM',
    closing_time: '05:30 PM',
    status: 'Active',
    pincode: 201306,
  },
  {
    id: 1003,
    name: 'Procurement Center C',
    state: 'Uttar Pradesh',
    district: 'DEF District',
    village: 'DEF City',
    address: 'Sector 4 Grain Yard, DEF City',
    daily_capacity: 180,
    current_capacity: 120,
    utilization: 66,
    opening_time: '08:00 AM',
    closing_time: '06:00 PM',
    status: 'Active',
    pincode: 201310,
  },
  {
    id: 1004,
    name: 'Procurement Center D',
    state: 'Punjab',
    district: 'Ludhiana',
    village: 'Kisan Mandi',
    address: 'GT Road Bypass, Kisan Mandi, Ludhiana',
    daily_capacity: 220,
    current_capacity: 187,
    utilization: 85,
    opening_time: '07:30 AM',
    closing_time: '06:30 PM',
    status: 'Active',
    pincode: 141001,
  },
  {
    id: 1005,
    name: 'Greenfield Procurement Hub',
    state: 'Haryana',
    district: 'Karnal',
    village: 'Rampur',
    address: 'Agro Terminal, NH-44, Rampur, Karnal',
    daily_capacity: 160,
    current_capacity: 130,
    utilization: 81,
    opening_time: '08:00 AM',
    closing_time: '05:00 PM',
    status: 'Active',
    pincode: 132001,
  },
  {
    id: 1006,
    name: 'Saharanpur Grain Terminal',
    state: 'Uttar Pradesh',
    district: 'Saharanpur',
    village: 'Deoband Road',
    address: 'Central Warehouse Rd, Saharanpur',
    daily_capacity: 250,
    current_capacity: 210,
    utilization: 84,
    opening_time: '08:00 AM',
    closing_time: '06:00 PM',
    status: 'Active',
    pincode: 247001,
  },
  {
    id: 1007,
    name: 'Apex Farmers Mandi',
    state: 'Madhya Pradesh',
    district: 'Indore',
    village: 'Kalyanpur',
    address: 'Krishi Upaj Mandi, Kalyanpur, Indore',
    daily_capacity: 190,
    current_capacity: 145,
    utilization: 76,
    opening_time: '08:00 AM',
    closing_time: '05:30 PM',
    status: 'Active',
    pincode: 452001,
  },
  {
    id: 1008,
    name: 'Vikas Krishi Kendra',
    state: 'Rajasthan',
    district: 'Kota',
    village: 'Mohanpur',
    address: 'State Highway 33, Mohanpur, Kota',
    daily_capacity: 140,
    current_capacity: 95,
    utilization: 68,
    opening_time: '08:30 AM',
    closing_time: '05:00 PM',
    status: 'Active',
    pincode: 324001,
  },
]

export const ADMIN_USERS = [
  { id: 1, name: 'Rahul Kumar', farmer_id: 'FK123456', mobile: '+91 9876543210', location: 'XYZ Village, XYZ District • Uttar Pradesh', role: 'Farmer', total_bookings: 3, status: 'Verified' },
  { id: 2, name: 'Sunita Devi', farmer_id: 'FK123457', mobile: '+91 9812345678', location: 'Rampur, XYZ District • Uttar Pradesh', role: 'Farmer', total_bookings: 4, status: 'Verified' },
  { id: 3, name: 'Ramesh Singh', farmer_id: 'FK123458', mobile: '+91 9823456789', location: 'ABC Town, ABC District • Uttar Pradesh', role: 'Farmer', total_bookings: 2, status: 'Verified' },
  { id: 4, name: 'Amit Patel', farmer_id: 'FK123459', mobile: '+91 9834567890', location: 'DEF City, DEF District • Uttar Pradesh', role: 'Farmer', total_bookings: 5, status: 'Verified' },
  { id: 5, name: 'Vikram Verma', farmer_id: 'FK123460', mobile: '+91 9845678901', location: 'Samrala, Ludhiana • Punjab', role: 'Farmer', total_bookings: 3, status: 'Verified' },
  { id: 6, name: 'Harpreet Kaur', farmer_id: 'FK123461', mobile: '+91 9856789012', location: 'Khanna, Ludhiana • Punjab', role: 'Farmer', total_bookings: 2, status: 'Verified' },
  { id: 7, name: 'Rajesh Sharma', farmer_id: 'FK123462', mobile: '+91 9867890123', location: 'Nilokheri, Karnal • Haryana', role: 'Farmer', total_bookings: 6, status: 'Verified' },
  { id: 8, name: 'Suresh Verma', farmer_id: 'FK123464', mobile: '+91 9889012345', location: 'Nakur, Saharanpur • Uttar Pradesh', role: 'Farmer', total_bookings: 4, status: 'Verified' },
  { id: 9, name: 'Pooja Yadav', farmer_id: 'FK123466', mobile: '+91 9901234567', location: 'Sanwer, Indore • Madhya Pradesh', role: 'Farmer', total_bookings: 3, status: 'Verified' },
  { id: 10, name: 'Baldev Singh', farmer_id: 'FK123468', mobile: '+91 9923456789', location: 'Sangod, Kota • Rajasthan', role: 'Farmer', total_bookings: 2, status: 'Verified' },
]

export const ADMIN_SLOTS = [
  { id: 1, center_name: 'Agricultural Procurement Center A', time: '08:00 AM - 09:00 AM', capacity: 20, booked_count: 18, available: 2, status: 'available' },
  { id: 2, center_name: 'Agricultural Procurement Center A', time: '09:00 AM - 10:00 AM', capacity: 20, booked_count: 20, available: 0, status: 'full' },
  { id: 3, center_name: 'Agricultural Procurement Center A', time: '10:00 AM - 11:00 AM', capacity: 20, booked_count: 19, available: 1, status: 'available' },
  { id: 4, center_name: 'Agricultural Procurement Center A', time: '11:00 AM - 12:00 PM', capacity: 20, booked_count: 16, available: 4, status: 'available' },
  { id: 5, center_name: 'Agricultural Procurement Center A', time: '01:00 PM - 02:00 PM', capacity: 20, booked_count: 14, available: 6, status: 'available' },
  { id: 6, center_name: 'Procurement Center B', time: '08:30 AM - 09:30 AM', capacity: 15, booked_count: 12, available: 3, status: 'available' },
  { id: 7, center_name: 'Procurement Center B', time: '09:30 AM - 10:30 AM', capacity: 15, booked_count: 15, available: 0, status: 'full' },
  { id: 8, center_name: 'Procurement Center B', time: '10:30 AM - 11:30 AM', capacity: 15, booked_count: 11, available: 4, status: 'available' },
]

export const ADMIN_PROCUREMENTS = [
  { id: 101, token: 'A-042', farmer_name: 'Rahul Kumar', farmer_id: 'FK123456', center_name: 'Agricultural Procurement Center A', produce: 'Wheat', produce_type: 'Grade A', quantity_kg: 1000, total_price: 23000, status: 'Confirmed', date: '12 Sep 2025' },
  { id: 102, token: 'A-041', farmer_name: 'Sunita Devi', farmer_id: 'FK123457', center_name: 'Agricultural Procurement Center A', produce: 'Wheat', produce_type: 'Standard Grade', quantity_kg: 2000, total_price: 46000, status: 'Completed', date: '12 Sep 2025' },
  { id: 103, token: 'B-018', farmer_name: 'Ramesh Singh', farmer_id: 'FK123458', center_name: 'Procurement Center B', produce: 'Rice', produce_type: 'Premium Organic', quantity_kg: 1500, total_price: 33000, status: 'Completed', date: '11 Sep 2025' },
  { id: 104, token: 'C-029', farmer_name: 'Amit Patel', farmer_id: 'FK123459', center_name: 'Procurement Center C', produce: 'Maize', produce_type: 'Standard Grade', quantity_kg: 1200, total_price: 25200, status: 'Quality Checked', date: '11 Sep 2025' },
  { id: 105, token: 'D-055', farmer_name: 'Vikram Verma', farmer_id: 'FK123460', center_name: 'Procurement Center D', produce: 'Wheat', produce_type: 'Grade A', quantity_kg: 2500, total_price: 57500, status: 'Completed', date: '10 Sep 2025' },
  { id: 106, token: 'E-012', farmer_name: 'Rajesh Sharma', farmer_id: 'FK123462', center_name: 'Greenfield Procurement Hub', produce: 'Pulses', produce_type: 'Grade A', quantity_kg: 800, total_price: 52000, status: 'Confirmed', date: '10 Sep 2025' },
  { id: 107, token: 'F-034', farmer_name: 'Suresh Verma', farmer_id: 'FK123464', center_name: 'Saharanpur Grain Terminal', produce: 'Wheat', produce_type: 'Standard Grade', quantity_kg: 3000, total_price: 69000, status: 'Completed', date: '09 Sep 2025' },
]

export const ADMIN_PAYMENTS = {
  summary: {
    total_disbursed: '₹1.8 Cr',
    pending_approvals: '₹4.2 Lakh',
    successful_transactions: 5420,
    processing: 38,
  },
  transactions: [
    { id: 'TXN-08912', farmer_name: 'Rahul Kumar', farmer_id: 'FK123456', produce: 'Wheat', quantity_kg: 1000, amount: 23000, bank_account: 'SBI •••• 3012', status: 'Credited', date: '12 Sep 2025' },
    { id: 'TXN-08911', farmer_name: 'Sunita Devi', farmer_id: 'FK123457', produce: 'Wheat', quantity_kg: 2000, amount: 46000, bank_account: 'PNB •••• 4189', status: 'Credited', date: '12 Sep 2025' },
    { id: 'TXN-08910', farmer_name: 'Ramesh Singh', farmer_id: 'FK123458', produce: 'Rice', quantity_kg: 1500, amount: 33000, bank_account: 'BOB •••• 7721', status: 'Credited', date: '11 Sep 2025' },
    { id: 'TXN-08909', farmer_name: 'Amit Patel', farmer_id: 'FK123459', produce: 'Maize', quantity_kg: 1200, amount: 25200, bank_account: 'HDFC •••• 1045', status: 'In Transit', date: '11 Sep 2025' },
    { id: 'TXN-08908', farmer_name: 'Vikram Verma', farmer_id: 'FK123460', produce: 'Wheat', quantity_kg: 2500, amount: 57500, bank_account: 'SBI •••• 9920', status: 'Credited', date: '10 Sep 2025' },
    { id: 'TXN-08907', farmer_name: 'Rajesh Sharma', farmer_id: 'FK123462', produce: 'Pulses', quantity_kg: 800, amount: 52000, bank_account: 'Canara •••• 6614', status: 'In Transit', date: '10 Sep 2025' },
  ]
}

export const ADMIN_REPORTS = {
  monthly_tonnage: [
    { month: 'May', target: 800, achieved: 840 },
    { month: 'Jun', target: 950, achieved: 910 },
    { month: 'Jul', target: 1200, achieved: 1290 },
    { month: 'Aug', target: 1400, achieved: 1460 },
    { month: 'Sep', target: 1600, achieved: 1580 },
  ],
  crop_revenue: [
    { crop: 'Wheat', revenue: '₹94.5 Lakh', volume: '4,108 MT' },
    { crop: 'Rice', revenue: '₹52.8 Lakh', volume: '2,400 MT' },
    { crop: 'Maize', revenue: '₹21.0 Lakh', volume: '1,000 MT' },
    { crop: 'Pulses', revenue: '₹11.7 Lakh', volume: '180 MT' },
  ],
  turnout_rate: '96.4%',
  avg_processing_time: '22 mins',
}

export const ADMIN_SETTINGS = {
  msp_rates: {
    Wheat: 23,
    Rice: 22,
    Maize: 21,
    Pulses: 65,
  },
  operating_hours: '08:00 AM - 06:00 PM',
  max_booking_per_farmer_kg: 5000,
  sms_notifications: true,
  auto_queue_rebalancing: true,
  admin_profile: {
    name: 'Rajesh Kumar',
    designation: 'State Procurement Director',
    initials: 'RK',
    email: 'director.procurement@agriqueue.gov.in',
  }
}
