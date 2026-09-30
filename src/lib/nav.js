// Mirrors "Main Menu" (section 35) of the system blueprint.
// icon names map to lucide-react components (see Sidebar.jsx)
export const NAV_SECTIONS = [
  {
    label: null,
    items: [{ label: 'Dashboard', icon: 'LayoutDashboard', path: '/' }],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Orders', icon: 'ClipboardList', path: '/orders' },
      { label: 'Packages / TK', icon: 'Package', path: '/packages' },
      { label: 'Inbound Origin', icon: 'LogIn', path: '/inbound-origin' },
      { label: 'QC', icon: 'ScanSearch', path: '/qc' },
      { label: 'Consolidation', icon: 'Combine', path: '/consolidation' },
      { label: 'Outbound Origin', icon: 'LogOut', path: '/outbound-origin' },
      { label: 'Shipments', icon: 'Truck', path: '/shipments' },
      { label: 'Containers', icon: 'Container', path: '/containers' },
      { label: 'Transit', icon: 'Ship', path: '/transit' },
    ],
  },
  {
    label: 'Cambodia',
    items: [
      { label: 'Arrival', icon: 'Anchor', path: '/arrival' },
      { label: 'Customs', icon: 'Stamp', path: '/customs' },
      { label: 'Cambodia Warehouse', icon: 'Warehouse', path: '/kh-warehouse' },
      { label: 'Sorting', icon: 'ListTree', path: '/sorting' },
      { label: 'Delivery', icon: 'Bike', path: '/delivery' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customers', icon: 'Users', path: '/customers' },
      { label: 'Customer Accounts', icon: 'UserCog', path: '/customer-accounts' },
      { label: 'Customer Addresses', icon: 'MapPin', path: '/customer-addresses' },
      { label: 'Customer ID Transfer', icon: 'ArrowLeftRight', path: '/customer-transfer' },
      { label: 'Customer QR', icon: 'QrCode', path: '/customer-qr' },
    ],
  },
  {
    label: 'Warehouse',
    items: [
      { label: 'Warehouses', icon: 'Building2', path: '/warehouses' },
      { label: 'Locations', icon: 'MapPinned', path: '/locations' },
      { label: 'Warehouse Operations', icon: 'Boxes', path: '/warehouse-operations' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Exceptions', icon: 'TriangleAlert', path: '/exceptions' },
      { label: 'Documents', icon: 'FileText', path: '/documents' },
      { label: 'Notifications', icon: 'Bell', path: '/notifications' },
      { label: 'Reports', icon: 'BarChart3', path: '/reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', icon: 'UserRound', path: '/users' },
      { label: 'Roles', icon: 'ShieldCheck', path: '/roles' },
      { label: 'Permissions', icon: 'KeyRound', path: '/permissions' },
      { label: 'Status Master', icon: 'ListChecks', path: '/status-master' },
      { label: 'Audit Logs', icon: 'History', path: '/audit-logs' },
    ],
  },
]
