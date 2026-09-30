// Central config for every list-style module in the sidebar.
// Swap `rows` for a Supabase query later — `columns`/`stats` can stay as-is.

const col = (key, label, extra = {}) => ({ key, label, ...extra })

export const MODULES = {
  '/orders': {
    title: 'Orders',
    subtitle: 'ការបញ្ជាទិញរបស់ Customer ពី Platform ផ្សេងៗ',
    primaryAction: 'Order ថ្មី',
    stats: [
      { icon: 'ClipboardList', label: 'Orders (ខែនេះ)', value: '2,340', tone: 'blue' },
      { icon: 'Clock', label: 'Processing', value: '186', tone: 'amber' },
      { icon: 'PackageCheck', label: 'Packed', value: '1,920', tone: 'teal' },
      { icon: 'CircleX', label: 'Cancelled', value: '12', tone: 'red' },
    ],
    columns: [
      col('id', 'Order ID', { strong: true }),
      col('customer', 'Customer'),
      col('date', 'Order Date'),
      col('platform', 'Platform'),
      col('packages', 'Packages'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { id: 'ORD-2026-000125', customer: 'KH-000582 · Sothon Shop', date: '25 Sep 2026', platform: '1688', packages: 3, status: 'Processing' },
      { id: 'ORD-2026-000124', customer: 'KH-000117 · Dara Trading', date: '25 Sep 2026', platform: 'Taobao', packages: 1, status: 'Confirmed' },
      { id: 'ORD-2026-000123', customer: 'KH-000721 · Chenda Mart', date: '24 Sep 2026', platform: 'Tmall', packages: 5, status: 'Processing' },
      { id: 'ORD-2026-000122', customer: 'KH-000340 · Bopha Import', date: '24 Sep 2026', platform: 'Pinduoduo', packages: 2, status: 'Cancelled' },
      { id: 'ORD-2026-000121', customer: 'KH-000582 · Sothon Shop', date: '23 Sep 2026', platform: 'JD', packages: 4, status: 'Confirmed' },
    ],
  },

  '/packages': {
    title: 'Packages / TK',
    subtitle: 'កញ្ចប់ទំនិញនីមួយៗ ចាប់ពី China Warehouse រហូតដល់ Delivery',
    primaryAction: 'TK ថ្មី',
    stats: [
      { icon: 'Package', label: 'Total Packages', value: '18,420', tone: 'ink' },
      { icon: 'Warehouse', label: 'នៅ China', value: '2,140', tone: 'blue' },
      { icon: 'Ship', label: 'In Transit', value: '4,860', tone: 'amber' },
      { icon: 'CircleCheck', label: 'Delivered', value: '11,420', tone: 'teal' },
    ],
    columns: [
      col('tk', 'TK Number', { strong: true, linkTo: (row) => `/packages/${row.tk}` }),
      col('customer', 'Customer'),
      col('weight', 'Weight'),
      col('cbm', 'CBM'),
      col('warehouse', 'Warehouse'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { tk: 'TK202609250041', customer: 'KH-000582 · Sothon Shop', weight: '12.5 KG', cbm: '0.03', warehouse: 'CN-GZ-01', status: 'Outbound Origin' },
      { tk: 'TK202609250038', customer: 'KH-000117 · Dara Trading', weight: '4.2 KG', cbm: '0.01', warehouse: 'CN-YW-01', status: 'QC Completed' },
      { tk: 'TK202609250035', customer: 'KH-000721 · Chenda Mart', weight: '8.0 KG', cbm: '0.02', warehouse: 'CN-GZ-01', status: 'Inbound Origin' },
      { tk: 'TK202609250029', customer: 'KH-000582 · Sothon Shop', weight: '15.8 KG', cbm: '0.04', warehouse: 'CN-SZ-01', status: 'Weight Difference' },
      { tk: 'TK202609250012', customer: 'KH-000340 · Bopha Import', weight: '6.4 KG', cbm: '0.02', warehouse: 'CN-GZ-01', status: 'Consolidated' },
    ],
  },

  '/inbound-origin': {
    title: 'Inbound Origin',
    subtitle: 'ការទទួលទំនិញនៅ China Warehouse — Scan TK, Weight, Dimension, QC',
    primaryAction: 'Scan TK',
    stats: [
      { icon: 'LogIn', label: 'Received (ថ្ងៃនេះ)', value: '1,245', tone: 'blue' },
      { icon: 'ScanLine', label: 'Awaiting QC', value: '210', tone: 'amber' },
      { icon: 'UserX', label: 'Customer Not Found', value: '6', tone: 'red' },
    ],
    columns: [
      col('tk', 'TK Number', { strong: true }),
      col('customer', 'Customer'),
      col('supplier', 'Supplier'),
      col('weight', 'Weight'),
      col('receivedBy', 'Received By'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { tk: 'TK202609250041', customer: 'KH-000582 · Sothon Shop', supplier: '1688 Supplier A', weight: '12.5 KG', receivedBy: 'Li Wei', status: 'Received' },
      { tk: 'TK202609250040', customer: 'KH-000528 (Not Found)', supplier: 'Taobao Shop B', weight: '3.1 KG', receivedBy: 'Li Wei', status: 'Hold' },
      { tk: 'TK202609250039', customer: 'KH-000117 · Dara Trading', supplier: 'Tmall Store C', weight: '4.2 KG', receivedBy: 'Zhang Min', status: 'Received' },
      { tk: 'TK202609250038', customer: 'KH-000721 · Chenda Mart', supplier: '1688 Supplier D', weight: '8.0 KG', receivedBy: 'Zhang Min', status: 'Received' },
    ],
  },

  '/qc': {
    title: 'QC / Inspection',
    subtitle: 'ការត្រួតពិនិត្យទំនិញបន្ទាប់ពី Inbound',
    stats: [
      { icon: 'ScanSearch', label: 'QC ថ្ងៃនេះ', value: '860', tone: 'blue' },
      { icon: 'CircleCheck', label: 'Normal', value: '812', tone: 'teal' },
      { icon: 'TriangleAlert', label: 'Damaged / Wrong', value: '48', tone: 'red' },
    ],
    columns: [
      col('tk', 'TK Number', { strong: true }),
      col('condition', 'Condition', { status: true }),
      col('weightDiff', 'Weight Diff'),
      col('checkedBy', 'Checked By'),
      col('time', 'Checked Time'),
    ],
    rows: [
      { tk: 'TK202609250038', condition: 'Normal', weightDiff: '0.0 KG', checkedBy: 'QC — Mey Ratha', time: '10:12 AM' },
      { tk: 'TK202609250029', condition: 'Weight Difference', weightDiff: '+2.3 KG', checkedBy: 'QC — Mey Ratha', time: '10:20 AM' },
      { tk: 'TK202609250025', condition: 'Damaged', weightDiff: '0.0 KG', checkedBy: 'QC — Sok Dara', time: '10:31 AM' },
      { tk: 'TK202609250019', condition: 'Normal', weightDiff: '0.0 KG', checkedBy: 'QC — Sok Dara', time: '10:44 AM' },
    ],
  },

  '/consolidation': {
    title: 'Consolidation',
    subtitle: 'Group TK ជាច្រើនចូលទៅ Shipment មួយ',
    primaryAction: 'បង្កើត Shipment',
    stats: [
      { icon: 'Combine', label: 'Ready to Consolidate', value: '640', tone: 'amber' },
      { icon: 'Truck', label: 'Consolidated (ខែនេះ)', value: '12', tone: 'teal' },
    ],
    columns: [
      col('shipment', 'Shipment No', { strong: true }),
      col('tkCount', 'TK Count'),
      col('weight', 'Weight'),
      col('cbm', 'CBM'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { shipment: 'SHP-2026-000125', tkCount: 426, weight: '8,240 KG', cbm: '52.6', status: 'Confirmed' },
      { shipment: 'SHP-2026-000124', tkCount: 310, weight: '6,010 KG', cbm: '38.2', status: 'In Progress' },
      { shipment: 'SHP-2026-000123', tkCount: 198, weight: '3,420 KG', cbm: '21.4', status: 'Confirmed' },
    ],
  },

  '/outbound-origin': {
    title: 'Outbound Origin',
    subtitle: 'ការដឹកចេញពី China Warehouse — Scan TK ដើម្បី Confirm Loading',
    primaryAction: 'Outbound ថ្មី',
    stats: [
      { icon: 'LogOut', label: 'Total CBM', value: '1,126.71', unit: 'M³', tone: 'blue' },
      { icon: 'Weight', label: 'Total Weight', value: '280,514', unit: 'KG', tone: 'ink' },
    ],
    columns: [
      col('outboundAt', 'Outbound At'),
      col('code', 'Shipment Code', { strong: true }),
      col('type', 'Type'),
      col('method', 'Shipping Method'),
      col('cbm', 'Total CBM'),
      col('weight', 'Total Weight'),
      col('qty', 'Quantity'),
    ],
    rows: [
      { outboundAt: '2026-09-23 11:35 AM', code: 'DRSB2605240019', type: 'Small Package', method: 'Land', cbm: '0.251991 m³', weight: '40 KG', qty: 1 },
      { outboundAt: '2026-09-18 10:50 AM', code: 'DRSB2609010007', type: 'Measurable Package', method: 'Land', cbm: '2.6082 m³', weight: '460 KG', qty: 9 },
      { outboundAt: '2026-09-12 10:10 AM', code: 'DRSB2609110004', type: 'Measurable Package', method: 'Land', cbm: '0.681201 m³', weight: '161 KG', qty: 12 },
    ],
  },

  '/shipments': {
    title: 'Shipments',
    subtitle: 'ការដឹកជញ្ជូនដែល Group TK ជាច្រើន',
    stats: [
      { icon: 'Truck', label: 'Active Shipments', value: '58', tone: 'blue' },
      { icon: 'Ship', label: 'In Transit', value: '31', tone: 'amber' },
      { icon: 'CircleCheck', label: 'Arrived', value: '27', tone: 'teal' },
    ],
    columns: [
      col('id', 'Shipment No', { strong: true }),
      col('route', 'Route'),
      col('transport', 'Transport'),
      col('packages', 'Packages'),
      col('weight', 'Weight'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { id: 'SHP-2026-000125', route: 'China → Cambodia', transport: 'Sea', packages: 426, weight: '8,240 KG', status: 'In Transit' },
      { id: 'SHP-2026-000124', route: 'China → Cambodia', transport: 'Land', packages: 310, weight: '6,010 KG', status: 'Arrived' },
      { id: 'SHP-2026-000123', route: 'China → Cambodia', transport: 'Sea', packages: 198, weight: '3,420 KG', status: 'Customs Clearance' },
    ],
  },

  '/containers': {
    title: 'Containers',
    subtitle: 'ឯកតាដឹកជញ្ជូនពិតប្រាកដ',
    primaryAction: 'Container ថ្មី',
    stats: [
      { icon: 'Container', label: 'Active Containers', value: '24', tone: 'blue' },
      { icon: 'DoorOpen', label: 'Loading', value: '5', tone: 'amber' },
      { icon: 'CircleCheck', label: 'Released', value: '19', tone: 'teal' },
    ],
    columns: [
      col('no', 'Container No', { strong: true, linkTo: (row) => `/containers/${row.no}` }),
      col('type', 'Type'),
      col('seal', 'Seal No'),
      col('shipment', 'Shipment'),
      col('packages', 'Packages'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { no: 'MSKU1234567', type: '40HC', seal: 'SL908821', shipment: 'SHP-2026-000125', packages: 426, status: 'In Transit' },
      { no: 'TCLU9988771', type: '20GP', seal: 'SL908790', shipment: 'SHP-2026-000123', packages: 198, status: 'Customs Clearance' },
      { no: 'CMAU4471122', type: '40HC', seal: 'SL908650', shipment: 'SHP-2026-000121', packages: 380, status: 'Released' },
    ],
  },

  '/transit': {
    title: 'Transit Tracking',
    subtitle: 'ការដឹកជញ្ជូនតាម Sea / Land / Air',
    columns: [
      col('vessel', 'Vessel / Voyage', { strong: true }),
      col('pol', 'Port of Loading'),
      col('pod', 'Port of Discharge'),
      col('etd', 'ETD'),
      col('eta', 'ETA'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { vessel: 'MV Ocean Star · V.221E', pol: 'Guangzhou', pod: 'Sihanoukville', etd: '26 Sep 2026', eta: '05 Oct 2026', status: 'In Transit' },
      { vessel: 'MV Mekong Pearl · V.118W', pol: 'Shenzhen', pod: 'Sihanoukville', etd: '20 Sep 2026', eta: '29 Sep 2026', status: 'Arrived Destination' },
      { vessel: 'Truck Convoy · TC-0042', pol: 'Yiwu (Land)', pod: 'Poipet Border', etd: '24 Sep 2026', eta: '27 Sep 2026', status: 'In Transit' },
    ],
  },

  '/arrival': {
    title: 'Cambodia Arrival',
    subtitle: 'ការមកដល់នៅកំពង់ផែ / Dry Port',
    columns: [
      col('container', 'Container', { strong: true }),
      col('port', 'Port / Dry Port'),
      col('arrivalDate', 'Arrival Date'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { container: 'MSKU1234567', port: 'Sihanoukville Port', arrivalDate: '05 Oct 2026', status: 'Pending' },
      { container: 'TCLU9988771', port: 'Phnom Penh Dry Port', arrivalDate: '02 Oct 2026', status: 'Customs' },
      { container: 'CMAU4471122', port: 'Sihanoukville Port', arrivalDate: '28 Sep 2026', status: 'Released' },
    ],
  },

  '/customs': {
    title: 'Customs Management',
    subtitle: 'ការធ្វើពិធីការគយ',
    stats: [
      { icon: 'Stamp', label: 'Pending', value: '42', tone: 'amber' },
      { icon: 'ScanSearch', label: 'Inspection', value: '9', tone: 'amber' },
      { icon: 'CircleCheck', label: 'Released', value: '318', tone: 'teal' },
    ],
    columns: [
      col('declaration', 'Declaration No', { strong: true }),
      col('container', 'Container No'),
      col('office', 'Customs Office'),
      col('submitted', 'Submitted Date'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { declaration: 'DEC-2026-08841', container: 'MSKU1234567', office: 'Sihanoukville', submitted: '06 Oct 2026', status: 'Customs Pending' },
      { declaration: 'DEC-2026-08822', container: 'TCLU9988771', office: 'Phnom Penh', submitted: '02 Oct 2026', status: 'Customs Inspection' },
      { declaration: 'DEC-2026-08790', container: 'CMAU4471122', office: 'Sihanoukville', submitted: '28 Sep 2026', status: 'Customs Released' },
    ],
  },

  '/kh-warehouse': {
    title: 'Cambodia Warehouse',
    subtitle: 'ការទទួល Container និង TK នៅឃ្លាំងកម្ពុជា',
    stats: [
      { icon: 'Warehouse', label: 'In Stock', value: '1,582', tone: 'teal' },
      { icon: 'TriangleAlert', label: 'Missing (ថ្ងៃនេះ)', value: '6', tone: 'red' },
    ],
    columns: [
      col('container', 'Container', { strong: true }),
      col('expected', 'Expected'),
      col('scanned', 'Scanned'),
      col('missing', 'Missing'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { container: 'MSKU1234567', expected: 426, scanned: 420, missing: 6, status: 'Missing' },
      { container: 'TCLU9988771', expected: 198, scanned: 198, missing: 0, status: 'Completed' },
      { container: 'CMAU4471122', expected: 380, scanned: 380, missing: 0, status: 'Completed' },
    ],
  },

  '/sorting': {
    title: 'Warehouse Sorting',
    subtitle: 'តម្រៀប TK ទៅតាម Customer និង Location',
    columns: [
      col('tk', 'TK Number', { strong: true }),
      col('customer', 'Customer'),
      col('location', 'Location'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { tk: 'TK202609200011', customer: 'KH-000582 · Sothon Shop', location: 'A01-01', status: 'Sorted' },
      { tk: 'TK202609200012', customer: 'KH-000117 · Dara Trading', location: 'A01-02', status: 'Sorted' },
      { tk: 'TK202609200013', customer: 'KH-000721 · Chenda Mart', location: 'B02-01', status: 'Pending' },
    ],
  },

  '/delivery': {
    title: 'Delivery',
    subtitle: 'ការដឹកជញ្ជូនដល់ Customer',
    primaryAction: 'ចាត់តាំង Driver',
    stats: [
      { icon: 'Bike', label: 'Out for Delivery', value: '38', tone: 'blue' },
      { icon: 'CircleCheck', label: 'Delivered (ថ្ងៃនេះ)', value: '212', tone: 'teal' },
      { icon: 'CircleX', label: 'Failed', value: '4', tone: 'red' },
    ],
    columns: [
      col('id', 'Delivery ID', { strong: true }),
      col('customer', 'Customer'),
      col('driver', 'Driver'),
      col('packages', 'Packages'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { id: 'DLV-2026-04412', customer: 'KH-000582 · Sothon Shop', driver: 'Vin Sokha', packages: 3, status: 'Out for Delivery' },
      { id: 'DLV-2026-04411', customer: 'KH-000117 · Dara Trading', driver: 'Chan Vibol', packages: 1, status: 'Delivered' },
      { id: 'DLV-2026-04410', customer: 'KH-000340 · Bopha Import', driver: 'Vin Sokha', packages: 2, status: 'Failed Delivery' },
    ],
  },

  '/customers': {
    title: 'Customers',
    subtitle: 'អ្នកប្រើប្រាស់ទាំងអស់ក្នុងប្រព័ន្ធ',
    primaryAction: 'Customer ថ្មី',
    stats: [
      { icon: 'Users', label: 'Total Customers', value: '3,214', tone: 'ink' },
      { icon: 'UserPlus', label: 'New (ខែនេះ)', value: '86', tone: 'blue' },
    ],
    columns: [
      col('id', 'Customer ID', { strong: true }),
      col('name', 'Name'),
      col('phone', 'Phone'),
      col('warehouse', 'Default Warehouse'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { id: 'KH-000582', name: 'Sothon Shop', phone: '+855 12 345 678', warehouse: 'CN-GZ-01', status: 'Active' },
      { id: 'KH-000117', name: 'Dara Trading', phone: '+855 92 111 222', warehouse: 'CN-YW-01', status: 'Active' },
      { id: 'KH-000721', name: 'Chenda Mart', phone: '+855 78 555 999', warehouse: 'CN-GZ-01', status: 'Active' },
      { id: 'KH-000340', name: 'Bopha Import', phone: '+855 61 222 333', warehouse: 'CN-SZ-01', status: 'Suspended' },
    ],
  },

  '/customer-accounts': {
    title: 'Customer Accounts',
    subtitle: 'គណនីចូលប្រើប្រាស់របស់ Customer',
    columns: [
      col('id', 'Customer ID', { strong: true }),
      col('name', 'Name'),
      col('email', 'Email'),
      col('registered', 'Registered'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { id: 'KH-000582', name: 'Sothon Shop', email: 'sothon@shop.com', registered: '12 Jan 2026', status: 'Active' },
      { id: 'KH-000117', name: 'Dara Trading', email: 'dara@trading.com', registered: '03 Feb 2026', status: 'Active' },
      { id: 'KH-000721', name: 'Chenda Mart', email: 'chenda@mart.com', registered: '19 Mar 2026', status: 'Active' },
    ],
  },

  '/customer-addresses': {
    title: 'Customer Addresses',
    subtitle: 'អាសយដ្ឋាន China Warehouse របស់ Customer នីមួយៗ',
    columns: [
      col('customer', 'Customer', { strong: true }),
      col('warehouse', 'Warehouse'),
      col('recipient', 'Recipient'),
      col('version', 'Version'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { customer: 'KH-000582 · Sothon Shop', warehouse: 'Guangzhou Warehouse', recipient: 'Sothon Shop KH-000582', version: 'V2', status: 'Active' },
      { customer: 'KH-000117 · Dara Trading', warehouse: 'Yiwu Warehouse', recipient: 'Dara Trading KH-000117', version: 'V1', status: 'Active' },
      { customer: 'KH-000721 · Chenda Mart', warehouse: 'Guangzhou Warehouse', recipient: 'Chenda Mart KH-000721', version: 'V2', status: 'Active' },
    ],
  },

  '/customer-transfer': {
    title: 'Customer ID Transfer',
    subtitle: 'ផ្ទេរ TK ពី Customer ID មួយទៅមួយទៀត (មិនលុប History)',
    primaryAction: 'Transfer ថ្មី',
    columns: [
      col('tk', 'TK Number', { strong: true }),
      col('from', 'From'),
      col('to', 'To'),
      col('reason', 'Reason'),
      col('approvedBy', 'Approved By'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { tk: 'TK123456789', from: 'KH-000582', to: 'KH-000721', reason: 'Wrong Customer ID', approvedBy: 'Supervisor B', status: 'Resolved' },
      { tk: 'TK998877665', from: 'KH-000340', to: 'KH-000117', reason: 'Wrong Customer ID', approvedBy: 'Supervisor A', status: 'Pending' },
    ],
  },

  '/customer-qr': {
    title: 'Customer QR',
    subtitle: 'QR Code សម្រាប់ស្កេនរកឃើញ Customer ភ្លាមៗ',
    columns: [
      col('id', 'Customer ID', { strong: true }),
      col('name', 'Name'),
      col('warehouse', 'Default Warehouse'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { id: 'KH-000582', name: 'Sothon Shop', warehouse: 'CN-GZ-01', status: 'Issued' },
      { id: 'KH-000117', name: 'Dara Trading', warehouse: 'CN-YW-01', status: 'Issued' },
      { id: 'KH-000721', name: 'Chenda Mart', warehouse: 'CN-GZ-01', status: 'Issued' },
    ],
  },

  '/warehouses': {
    title: 'Warehouses',
    subtitle: 'Warehouse Master — China និង Cambodia',
    primaryAction: 'Warehouse ថ្មី',
    columns: [
      col('id', 'Warehouse ID', { strong: true }),
      col('name', 'Name'),
      col('country', 'Country'),
      col('city', 'Province / City'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { id: 'CN-GZ-01', name: 'Guangzhou Warehouse', country: 'China', city: 'Guangzhou', status: 'Active' },
      { id: 'CN-YW-01', name: 'Yiwu Warehouse', country: 'China', city: 'Yiwu', status: 'Active' },
      { id: 'CN-SZ-01', name: 'Shenzhen Warehouse', country: 'China', city: 'Shenzhen', status: 'Active' },
      { id: 'KH-PP-01', name: 'Phnom Penh Warehouse', country: 'Cambodia', city: 'Phnom Penh', status: 'Active' },
    ],
  },

  '/locations': {
    title: 'Warehouse Locations',
    subtitle: 'ទីតាំងផ្ទុកទំនិញក្នុងឃ្លាំង',
    columns: [
      col('code', 'Location Code', { strong: true }),
      col('warehouse', 'Warehouse'),
      col('zone', 'Zone'),
      col('capacity', 'Used / Capacity'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { code: 'A01-01', warehouse: 'KH-PP-01', zone: 'A', capacity: '82 / 100', status: 'Active' },
      { code: 'A01-02', warehouse: 'KH-PP-01', zone: 'A', capacity: '45 / 100', status: 'Active' },
      { code: 'B02-01', warehouse: 'KH-PP-01', zone: 'B', capacity: '98 / 100', status: 'Active' },
    ],
  },

  '/warehouse-operations': {
    title: 'Warehouse Operations',
    subtitle: 'កំណត់ត្រាសកម្មភាពប្រតិបត្តិការឃ្លាំង',
    columns: [
      col('action', 'Action', { strong: true }),
      col('tk', 'TK Number'),
      col('staff', 'Staff'),
      col('time', 'Time'),
    ],
    rows: [
      { action: 'Scan In', tk: 'TK202609250041', staff: 'Li Wei', time: '25 Sep, 09:12 AM' },
      { action: 'Move to Location', tk: 'TK202609200011', staff: 'Vin Sokha', time: '25 Sep, 08:40 AM' },
      { action: 'Scan Out', tk: 'TK202609190090', staff: 'Chan Vibol', time: '24 Sep, 04:22 PM' },
    ],
  },

  '/exceptions': {
    title: 'Exception Center',
    subtitle: 'ករណីលើកលែងទាំងអស់ — Missing, Damaged, Customs Hold ជាដើម',
    primaryAction: 'Exception ថ្មី',
    stats: [
      { icon: 'TriangleAlert', label: 'Open', value: '13', tone: 'red' },
      { icon: 'ScanSearch', label: 'Investigating', value: '5', tone: 'amber' },
      { icon: 'CircleCheck', label: 'Resolved (ខែនេះ)', value: '61', tone: 'teal' },
    ],
    columns: [
      col('id', 'Exception ID', { strong: true }),
      col('ref', 'Reference'),
      col('type', 'Type'),
      col('reportedBy', 'Reported By'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { id: 'EXC-0192', ref: 'SHP-2026-000125 · 6 packages', type: 'Missing', reportedBy: 'KH Warehouse', status: 'Open' },
      { id: 'EXC-0191', ref: 'MSKU1234567', type: 'Customs Hold', reportedBy: 'Customs Staff', status: 'Investigating' },
      { id: 'EXC-0190', ref: 'TK123456789', type: 'Wrong Customer ID', reportedBy: 'CN Warehouse', status: 'Resolved' },
    ],
  },

  '/documents': {
    title: 'Documents',
    subtitle: 'ឯកសារភ្ជាប់ជាមួយ Order, Shipment, Customs',
    primaryAction: 'Upload ឯកសារ',
    columns: [
      col('name', 'Document Name', { strong: true }),
      col('relatedTo', 'Related To'),
      col('uploadedBy', 'Uploaded By'),
      col('date', 'Date'),
    ],
    rows: [
      { name: 'Customs Declaration DEC-08841.pdf', relatedTo: 'MSKU1234567', uploadedBy: 'Customs Staff', date: '06 Oct 2026' },
      { name: 'Packing List SHP-000125.xlsx', relatedTo: 'SHP-2026-000125', uploadedBy: 'Admin', date: '25 Sep 2026' },
      { name: 'Invoice ORD-000125.pdf', relatedTo: 'ORD-2026-000125', uploadedBy: 'Sothon Shop', date: '25 Sep 2026' },
    ],
  },

  '/notifications': {
    title: 'Notifications',
    subtitle: 'ការជូនដំណឹងទៅ Customer និង Staff',
    columns: [
      col('type', 'Type', { status: true }),
      col('message', 'Message'),
      col('recipient', 'Recipient'),
      col('time', 'Time'),
    ],
    rows: [
      { type: 'Delivered', message: 'ការដឹកជញ្ជូនបានបញ្ចប់', recipient: 'KH-000117 · Dara Trading', time: '11:05 AM' },
      { type: 'Customs Hold', message: 'Container កំពុងជាប់គយ', recipient: 'Admin', time: '10:40 AM' },
      { type: 'Package Received', message: 'TK202609250041 បានទទួល', recipient: 'KH-000582 · Sothon Shop', time: '09:12 AM' },
    ],
  },

  '/reports': {
    title: 'Reports',
    subtitle: 'របាយការណ៍ប្រតិបត្តិការទាំងអស់ — នាំចេញជា Excel, CSV, PDF',
    columns: [
      col('name', 'Report Name', { strong: true }),
      col('category', 'Category'),
      col('lastGenerated', 'Last Generated'),
      col('format', 'Formats'),
    ],
    rows: [
      { name: 'Inbound Report', category: 'Operations', lastGenerated: '25 Sep 2026', format: 'Excel · CSV · PDF' },
      { name: 'Customs Report', category: 'Cambodia', lastGenerated: '24 Sep 2026', format: 'Excel · PDF' },
      { name: 'Exception Report', category: 'Management', lastGenerated: '25 Sep 2026', format: 'Excel · CSV' },
      { name: 'Staff Activity Report', category: 'System', lastGenerated: '23 Sep 2026', format: 'PDF' },
    ],
  },

  '/users': {
    title: 'Users',
    subtitle: 'Staff និង Admin ទាំងអស់ក្នុងប្រព័ន្ធ',
    primaryAction: 'User ថ្មី',
    columns: [
      col('name', 'Name', { strong: true }),
      col('role', 'Role'),
      col('email', 'Email'),
      col('status', 'Status', { status: true }),
    ],
    rows: [
      { name: 'Ou Sothon', role: 'Admin', email: 'sothon@cargobridge.com', status: 'Active' },
      { name: 'Li Wei', role: 'China Warehouse Staff', email: 'liwei@cargobridge.com', status: 'Active' },
      { name: 'Vin Sokha', role: 'Delivery Staff', email: 'sokha@cargobridge.com', status: 'Active' },
      { name: 'Mey Ratha', role: 'QC Staff', email: 'ratha@cargobridge.com', status: 'Suspended' },
    ],
  },

  '/roles': {
    title: 'Roles',
    subtitle: 'តួនាទីទាំងអស់ — Super Admin ដល់ Customer',
    columns: [
      col('name', 'Role Name', { strong: true }),
      col('permissions', 'Permissions'),
      col('users', 'Users'),
    ],
    rows: [
      { name: 'Super Admin', permissions: 'All access', users: 2 },
      { name: 'China Warehouse Staff', permissions: 'Inbound, QC, Outbound, Loading', users: 14 },
      { name: 'Cambodia Warehouse Staff', permissions: 'Arrival, Sorting, Warehouse, Delivery', users: 9 },
      { name: 'Customs Staff', permissions: 'Customs module only', users: 3 },
    ],
  },

  '/permissions': {
    title: 'Permissions',
    subtitle: 'សិទ្ធិលម្អិតតាម Module',
    columns: [
      col('name', 'Permission', { strong: true }),
      col('description', 'Description'),
      col('roles', 'Assigned Roles'),
    ],
    rows: [
      { name: 'inbound.create', description: 'Receive & scan packages', roles: 'China Warehouse Staff' },
      { name: 'customs.edit', description: 'Edit customs declarations', roles: 'Customs Staff, Admin' },
      { name: 'customer.transfer', description: 'Transfer TK between customers', roles: 'Supervisor, Admin' },
    ],
  },

  '/status-master': {
    title: 'Status Master',
    subtitle: 'និយមន័យ Status ទាំងអស់ក្នុងប្រព័ន្ធ',
    columns: [
      col('code', 'Status Code', { strong: true }),
      col('label', 'Label'),
      col('category', 'Category'),
    ],
    rows: [
      { code: 'INBOUND_ORIGIN', label: 'Inbound Origin', category: 'Package' },
      { code: 'CUSTOMS_PENDING', label: 'Customs Pending', category: 'Customs' },
      { code: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', category: 'Delivery' },
      { code: 'DELIVERED', label: 'Delivered', category: 'Delivery' },
    ],
  },

  '/audit-logs': {
    title: 'Audit Logs',
    subtitle: 'កំណត់ត្រាសកម្មភាពសំខាន់ៗទាំងអស់ — Who, What, When',
    columns: [
      col('action', 'Action', { strong: true }),
      col('ref', 'Reference'),
      col('by', 'By'),
      col('time', 'Time'),
    ],
    rows: [
      { action: 'TRANSFER_CUSTOMER', ref: 'TK123456789 · KH-000582 → KH-000721', by: 'Staff A', time: '25 Sep 2026, 10:25 AM' },
      { action: 'CUSTOMS_RELEASE', ref: 'MSKU1234567', by: 'Customs Staff', time: '24 Sep 2026, 03:10 PM' },
      { action: 'DELETE_ADDRESS_V1', ref: 'CN-GZ-01 (blocked — versioning)', by: 'System', time: '20 Sep 2026, 09:00 AM' },
    ],
  },
}
