// =============================================================
// Cargo Bridge — Logistics Frontend (single-file build)
// =============================================================
// Everything from src/ merged into ONE file for quick copy/paste.
// Still needs, alongside this file in the same Vite + Tailwind project:
//   - index.html, tailwind.config.js, postcss.config.js, package.json
//   - src/index.css  (Tailwind directives + base styles)
//   - .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) if using Supabase
//   - supabase/schema.sql run once in the Supabase SQL editor
// Save this as src/main.jsx and delete the old src/App.jsx and
// src/components, src/pages, src/context, src/lib files it replaces.
// =============================================================

import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
} from "react";
import {
  Link,
  NavLink,
  useNavigate,
  Outlet,
  useLocation,
  Navigate,
  useParams,
  useSearchParams,
  Routes,
  Route,
  BrowserRouter,
} from "react-router-dom";
import * as Icons from "lucide-react";
import {
  Check,
  Menu,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  UserRound,
  Filter,
  Download,
  Plus,
  Eye,
  EyeOff,
  Waypoints,
  ArrowRight,
  TriangleAlert,
  ArrowLeft,
  Copy,
  CircleCheck,
  PackageCheck,
  Ship,
  Package,
  Container as ContainerIcon,
  Construction,
  X,
  Save,
  ScanLine,
  Loader2,
  History,
  Circle,
} from "lucide-react";

import { createClient } from "@supabase/supabase-js";
import "./index.css";

// ------------------------------------------------------------
// lib/supabaseClient.js
// ------------------------------------------------------------
// Fill these in your .env file (see .env.example) once your Supabase
// project is ready. Nothing in the current UI calls this yet —
// it's wired up so pages can start reading/writing real data later.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!supabase) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — running in UI-only mode.",
  );
}

// ------------------------------------------------------------
// components/Skeleton.jsx — loading placeholders (shimmer + soft fade-in)
// ------------------------------------------------------------
// Shown while data is being fetched from the server for the FIRST time
// (each data hook exposes a `ready` flag). Later refetches keep the current
// rows on screen instead of flashing a skeleton again. The animation is a
// single light sweep, staggered a little per row, and is switched off for
// people who prefer reduced motion.
const SKELETON_CSS = `
@keyframes cb-shimmer {
  0%   { background-position: 160% 0; }
  100% { background-position: -60% 0; }
}
@keyframes cb-sk-in {
  from { opacity: 0; transform: translateY(3px); }
  to   { opacity: 1; transform: none; }
}
.cb-sk {
  display: block;
  border-radius: 6px;
  background-color: #e8ecf1;
  background-image: linear-gradient(
    100deg,
    rgba(255,255,255,0) 30%,
    rgba(255,255,255,.75) 50%,
    rgba(255,255,255,0) 70%
  );
  background-size: 220% 100%;
  background-repeat: no-repeat;
  animation: cb-shimmer 1.5s ease-in-out infinite;
}
.cb-sk-in { animation: cb-sk-in .28s ease-out both; }
.cb-fade-in { animation: cb-sk-in .38s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .cb-sk { animation: none; }
  .cb-sk-in, .cb-fade-in { animation: none; }
}
`;

if (
  typeof document !== "undefined" &&
  !document.getElementById("cb-skeleton-css")
) {
  const el = document.createElement("style");
  el.id = "cb-skeleton-css";
  el.textContent = SKELETON_CSS;
  document.head.appendChild(el);
}

// A single grey block. `delay` (ms) offsets the sweep so rows ripple.
function Skeleton({ className = "", style, delay = 0 }) {
  return (
    <span
      aria-hidden="true"
      className={`cb-sk ${className}`}
      style={delay ? { animationDelay: `${delay}ms`, ...style } : style}
    />
  );
}

// Deterministic "natural" widths so the placeholder doesn't look like a grid.
const SK_WIDTHS = [62, 84, 46, 72, 55, 90, 40, 68, 78, 50];
const skWidth = (i, j = 0) =>
  `${SK_WIDTHS[(i * 3 + j * 7) % SK_WIDTHS.length]}%`;

// Wrapper that announces "loading" to screen readers once.
function SkeletonRegion({ className = "", children, label = "Loading..." }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`cb-sk-in ${className}`}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function SkeletonLines({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5"
          style={{ width: i === lines - 1 ? "55%" : skWidth(i) }}
          delay={i * 70}
        />
      ))}
    </div>
  );
}

// <tr>s for DataTable.
function SkeletonTableRows({ columns, rows = 6 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={`sk-${i}`} aria-hidden="true">
      {columns.map((col, j) => (
        <td key={col.key} className="px-4 py-3.5 whitespace-nowrap">
          {col.status ? (
            <Skeleton className="h-5 w-20 rounded-sm" delay={i * 70} />
          ) : (
            <Skeleton
              className="h-3.5"
              style={{ width: skWidth(i, j), minWidth: 36, maxWidth: 160 }}
              delay={i * 70}
            />
          )}
        </td>
      ))}
    </tr>
  ));
}

// Mobile "card" lists (Containers, TK lists on small screens).
function SkeletonCardList({ count = 3, className = "" }) {
  return (
    <SkeletonRegion className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${CT_CARD} p-4 space-y-2.5`}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-32" delay={i * 90} />
            <Skeleton className="h-5 w-16 rounded-sm" delay={i * 90} />
          </div>
          <Skeleton className="h-3.5 w-3/4" delay={i * 90 + 40} />
          <Skeleton className="h-3.5 w-1/2" delay={i * 90 + 80} />
        </div>
      ))}
    </SkeletonRegion>
  );
}

function StatCardSkeleton({ delay = 0 }) {
  return (
    <div className="bg-white border border-mist-200 rounded-md shadow-panel p-4 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-md shrink-0" delay={delay} />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3" delay={delay + 40} />
        <Skeleton className="h-5 w-1/3" delay={delay + 80} />
      </div>
    </div>
  );
}

function StatCardsSkeleton({ count = 5, className = "" }) {
  return (
    <SkeletonRegion className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} delay={i * 80} />
      ))}
    </SkeletonRegion>
  );
}

// Rows with a dot + two lines + a right-hand time (Dashboard lists).
function SkeletonListRows({ rows = 4 }) {
  return (
    <SkeletonRegion className="divide-y divide-mist-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 lg:px-5 py-3">
          <Skeleton className="w-2 h-2 rounded-full shrink-0" delay={i * 80} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" delay={i * 80} />
            <Skeleton className="h-3 w-48 max-w-full" delay={i * 80 + 40} />
          </div>
          <Skeleton className="h-3 w-12 shrink-0" delay={i * 80} />
        </div>
      ))}
    </SkeletonRegion>
  );
}

// Grid of square thumbnails (photo galleries).
function SkeletonPhotoGrid({ count = 3, className = "" }) {
  return (
    <SkeletonRegion
      className={`grid grid-cols-2 sm:grid-cols-3 gap-3 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-mist-200 rounded-md overflow-hidden"
        >
          <Skeleton
            className="w-full aspect-square rounded-none"
            delay={i * 90}
          />
          <div className="p-2">
            <Skeleton className="h-3 w-2/3" delay={i * 90 + 40} />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

// Compact placeholder for dropdown search results.
function SkeletonDropdownRows({ rows = 3 }) {
  return (
    <SkeletonRegion className="px-3 py-2 space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton
            className="h-3.5"
            style={{ width: skWidth(i) }}
            delay={i * 80}
          />
          <Skeleton className="h-2.5 w-1/3" delay={i * 80 + 40} />
        </div>
      ))}
    </SkeletonRegion>
  );
}

// Whole "detail" page (Package / Container): title bar + two panels.
function DetailPageSkeleton({ backTo, backLabel }) {
  return (
    <SkeletonRegion className="space-y-5">
      {backTo ? (
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-sm text-ink-600/60 hover:text-ink-900"
        >
          <ArrowLeft size={15} />
          {backLabel}
        </Link>
      ) : (
        <Skeleton className="h-4 w-40" />
      )}
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-md shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-44" delay={60} />
          <Skeleton className="h-3.5 w-64 max-w-full" delay={120} />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} delay={i * 70} />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className={`lg:col-span-2 ${CT_CARD} p-5 space-y-5`}>
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton
                className="w-5 h-5 rounded-full shrink-0"
                delay={i * 90}
              />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" delay={i * 90} />
                <Skeleton className="h-3 w-56 max-w-full" delay={i * 90 + 40} />
              </div>
            </div>
          ))}
        </div>
        <div className={`${CT_CARD} p-5 space-y-4`}>
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-2.5 w-20" delay={i * 60} />
              <Skeleton className="h-3.5 w-full" delay={i * 60 + 30} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

// Full-screen placeholder while the login session is being checked.
function AppShellSkeleton() {
  // Mirrors the real Layout (sidebar + topbar + page) and fills the WHOLE
  // viewport, so a full browser refresh doesn't show a short skeleton with
  // an empty area underneath while the session is restored.
  const navGroups = [1, 6, 5, 4, 4, 3];
  return (
    <div
      className="h-screen flex bg-mist-50 overflow-hidden"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Loading...</span>

      <div className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-mist-200 p-4 overflow-hidden">
        <Skeleton className="h-8 w-36 mb-5" />
        <div className="space-y-5 flex-1 min-h-0 overflow-hidden">
          {navGroups.map((n, g) => (
            <div key={g} className="space-y-3">
              {g > 0 && <Skeleton className="h-2.5 w-16" delay={g * 60} />}
              {Array.from({ length: n }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-4"
                  style={{ width: skWidth(g + i) }}
                  delay={(g * 3 + i) * 50}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-4 border-t border-mist-100">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="h-14 shrink-0 bg-white border-b border-mist-200 flex items-center gap-3 px-5">
          <Skeleton className="h-8 flex-1 max-w-sm" />
          <div className="flex-1" />
          <Skeleton className="w-8 h-8 rounded-full" delay={80} />
          <Skeleton className="w-8 h-8 rounded-full" delay={120} />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden p-4 lg:p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-9 w-32 rounded-md" delay={80} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={i} delay={i * 80} />
            ))}
          </div>
          <div
            className={`${CT_CARD} flex-1 min-h-0 overflow-hidden flex flex-col`}
          >
            <div className="flex items-center gap-3 p-4 border-b border-mist-200 shrink-0">
              <Skeleton className="h-9 flex-1 max-w-xs" />
              <Skeleton className="h-9 w-28" delay={60} />
              <Skeleton className="h-9 w-28" delay={100} />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-6 px-5 py-4 border-b border-mist-100"
                >
                  {[0, 1, 2, 3, 4].map((j) => (
                    <div
                      key={j}
                      className={j === 0 ? "w-40 shrink-0" : "flex-1"}
                    >
                      <Skeleton
                        className="h-3.5"
                        style={{ width: skWidth(i, j) }}
                        delay={i * 40 + j * 20}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// lib/customerId.js
// ------------------------------------------------------------
// Used only when Supabase isn't configured (see supabaseClient.js).
// Once connected, the real Customer ID comes from the `customer_code_seq`
// + trigger in supabase/schema.sql instead of this.
function generateMockCustomerId() {
  const n = Math.floor(900000 + Math.random() * 99999);
  return `KH-${String(n).slice(0, 6)}`;
}

// ------------------------------------------------------------
// lib/nav.js
// ------------------------------------------------------------
// Mirrors "Main Menu" (section 35) of the system blueprint.
// icon names map to lucide-react components (see Sidebar.jsx)
const NAV_SECTIONS = [
  {
    label: null,
    items: [{ label: "Dashboard", icon: "LayoutDashboard", path: "/" }],
  },
  {
    label: "Operations",
    items: [
      { label: "Packages / TK", icon: "Package", path: "/packages" },
      { label: "Scan Center", icon: "ScanLine", path: "/scan-center" },
      { label: "Process Tracking", icon: "Route", path: "/process-tracking" },
      { label: "Inbound Origin", icon: "LogIn", path: "/inbound-origin" },
      { label: "Outbound Origin", icon: "LogOut", path: "/outbound-origin" },
      { label: "Shipments", icon: "Truck", path: "/shipments" },
      { label: "Containers", icon: "Container", path: "/containers" },
      { label: "Shipment Lookup", icon: "Waypoints", path: "/shipment-lookup" },
    ],
  },
  {
    label: "Cambodia",
    items: [
      { label: "Arrival", icon: "Anchor", path: "/arrival" },
      {
        label: "W.H Arrived (Destination)",
        icon: "PackageCheck",
        path: "/wh-arrived",
      },
      { label: "Cambodia Warehouse", icon: "Warehouse", path: "/kh-warehouse" },
      { label: "Sorting", icon: "ListTree", path: "/sorting" },
      { label: "Delivery", icon: "Bike", path: "/delivery" },
    ],
  },
  {
    label: "Customers",
    items: [
      { label: "Customers", icon: "Users", path: "/customers" },
      {
        label: "Customer Accounts",
        icon: "UserCog",
        path: "/customer-accounts",
      },
      {
        label: "Customer Addresses",
        icon: "MapPin",
        path: "/customer-addresses",
      },
      {
        label: "Customer ID Transfer",
        icon: "ArrowLeftRight",
        path: "/customer-transfer",
      },
    ],
  },
  {
    label: "Warehouse",
    items: [
      { label: "Warehouse Management", icon: "Building2", path: "/warehouses" },
      { label: "Locations", icon: "MapPinned", path: "/locations" },
      {
        label: "Warehouse Operations",
        icon: "Boxes",
        path: "/warehouse-operations",
      },
    ],
  },
  {
    label: "Exceptions & Reports",
    items: [
      { label: "Exceptions", icon: "TriangleAlert", path: "/exceptions" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Users", icon: "UserRound", path: "/users" },
      { label: "Role Management", icon: "ShieldCheck", path: "/roles" },
      { label: "Status Master", icon: "ListChecks", path: "/status-master" },
      { label: "Audit Logs", icon: "History", path: "/audit-logs" },
    ],
  },
];

// ------------------------------------------------------------
// lib/permissions.js — Roles · Permissions · Department · Data scope
// ------------------------------------------------------------
// ONE central authorization layer (it replaces the old ROLE_PERMISSIONS
// path list and every hard-coded `X_ROLES.includes(user.role)` check):
//
//   User ──► Role ──► Permissions           WHAT may the user do?
//   User ──► Department ──► Warehouse       WHERE may the user do it?
//
// • Roles live in a small store (localStorage + Supabase `roles` table) and
//   are edited in Role Management (/roles). Permissions are EXPLICIT per
//   role — a lower level never inherits anything from a higher one.
// • Super Admin is a locked system role: always every permission, never
//   shown in / edited through the matrix.
// • Every guarded action calls hasPermission(user, "module.action") — for
//   showing the button AND inside the action itself.
// • Data scope (GLOBAL / DEPARTMENT / BRANCH / WAREHOUSE / TEAM / SELF) is
//   resolved by scopeWarehouseCodes() and applied where TK and Container
//   lists are exposed (PackageTrackingProvider, useContainerStore).
//
// SQL — run once in the Supabase SQL editor. Without the `roles` table,
// role changes are saved in THIS browser only (Role Management warns you):
//
//   create table if not exists roles (
//     name text primary key,
//     level int,
//     scope text not null default 'DEPARTMENT',
//     status text not null default 'Active',
//     description text,
//     is_system boolean default false,
//     is_legacy boolean default false,
//     permissions text[] not null default '{}',
//     updated_at timestamptz default now()
//   );
//   alter table users add column if not exists department text;
//   alter table users add column if not exists warehouse_code text;
//   -- Full script with RLS: supabase/role_management.sql

const SUPER_ADMIN = "Super Admin";
const ROLES_KEY = "cargo_bridge_roles_v1";
const NO_PERM_MSG = "You do not have permission to perform this action.";

const ROLE_SCOPES = [
  "GLOBAL",
  "DEPARTMENT",
  "BRANCH",
  "WAREHOUSE",
  "TEAM",
  "SELF",
];
const SCOPE_HINT = {
  GLOBAL: "All warehouses",
  DEPARTMENT: "All warehouses of the user's department",
  BRANCH: "The user's assigned branch / warehouse",
  WAREHOUSE: "The user's assigned warehouse",
  TEAM: "The user's assigned warehouse (team)",
  SELF: "The user's assigned warehouse (own work)",
};

// Department answers "which team does the user belong to?". `country`
// links it to the warehouse master (warehouses.type) for DEPARTMENT scope.
const DEPARTMENTS = [
  { name: "China Warehouse", country: "china" },
  { name: "Cambodia Warehouse", country: "cambodia" },
  { name: "Customs", country: null },
  { name: "Customer Service", country: null },
  { name: "Management", country: null },
];

// Permission catalog — ONLY actions that exist in this application.
const crudPerms = (p, noun) => [
  [`${p}.view`, `View ${noun}`],
  [`${p}.create`, `Create ${noun}`],
  [`${p}.edit`, `Edit ${noun}`],
  [`${p}.delete`, `Delete ${noun}`],
];

const PERMISSION_GROUPS = [
  {
    key: "dashboard",
    label: "Dashboard",
    perms: [["dashboard.view", "View Dashboard"]],
  },
  {
    key: "tk",
    label: "TK / Packages",
    perms: [
      ...crudPerms("tk", "TK"),
      ["tk.scan", "Scan TK (Inbound / Outbound Origin)"],
      ["tk.manage_inbound", "Measure TK & Inbound Status"],
      ["tk.process", "Advance TK Status"],
      ["tk.remeasure", "Re-measure TK (Cambodia)"],
      ["tk.freight_override", "Override Freight Fee"],
    ],
  },
  {
    key: "china",
    label: "China Operations",
    perms: [
      ["inbound.view", "View Inbound Origin"],
      ["outbound.view", "View Outbound Origin"],
      ...crudPerms("shipment", "Shipment"),
      ["lookup.view", "View Shipment Lookup"],
    ],
  },
  {
    key: "container",
    label: "Containers",
    perms: [
      ["container.view", "View Container"],
      ["container.manage", "Create & Manage (China side)"],
      ["container.receive", "Receive & Transfer TK (Cambodia side)"],
      ["container.edit", "Edit Container (any status)"],
      ["container.break_seal", "Break Seal"],
      ["container.delete", "Delete Container"],
    ],
  },
  {
    key: "cambodia",
    label: "Cambodia Operations",
    perms: [
      ...crudPerms("arrival", "Arrival"),
      ["wh_arrived.view", "View W.H Arrived"],
      ["kh_warehouse.view", "View Cambodia Warehouse"],
      ["sorting.view", "View Sorting"],
      ...crudPerms("delivery", "Delivery"),
    ],
  },
  {
    key: "customer",
    label: "Customers",
    perms: [
      ...crudPerms("customer", "Customer"),
      ...crudPerms("customer_account", "Customer Account"),
      ...crudPerms("customer_address", "Customer Address"),
      ["customer_transfer.view", "View Customer ID Transfer"],
    ],
  },
  {
    key: "order",
    label: "Orders",
    perms: [
      ["order.view", "View Order"],
      ["order.edit", "Edit Order"],
      ["order.delete", "Delete Order"],
      ["order.change_branch", "Change Receiving Branch"],
    ],
  },
  {
    key: "warehouse",
    label: "Warehouses",
    perms: [
      ["warehouse.view", "View Warehouses"],
      ["warehouse.manage", "Manage Warehouses & Assign Customers"],
      ...crudPerms("location", "Location"),
      ...crudPerms("warehouse_ops", "Warehouse Operation"),
    ],
  },
  {
    key: "reports",
    label: "Exceptions & Audit",
    perms: [
      ["exception.view", "View Exceptions"],
      ["audit.view", "View Audit Logs"],
    ],
  },
  {
    key: "system",
    label: "Users & System",
    perms: [
      ["user.view", "View Users"],
      ["user.create", "Create User"],
      ["user.edit", "Edit User"],
      ["user.delete", "Delete User"],
      ["user.assign_role", "Assign Role / Department / Warehouse"],
      ["role.view", "View Role Management"],
      ...crudPerms("status_master", "Status Master"),
    ],
  },
];

const PERMISSION_LABEL = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.perms),
);
// "role.manage" (edit roles) is Super Admin only — never a matrix row.
const SUPER_ONLY = new Set(["role.manage"]);
const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
  g.perms.map((p) => p[0]),
);

// Page access: which permission opens which route.
const PATH_VIEW = {
  "/": "dashboard.view",
  "/packages": "tk.view",
  "/inbound-origin": "inbound.view",
  "/outbound-origin": "outbound.view",
  "/shipments": "shipment.view",
  "/containers": "container.view",
  "/shipment-lookup": "lookup.view",
  "/arrival": "arrival.view",
  "/wh-arrived": "wh_arrived.view",
  "/kh-warehouse": "kh_warehouse.view",
  "/sorting": "sorting.view",
  "/delivery": "delivery.view",
  "/customers": "customer.view",
  "/customer-accounts": "customer_account.view",
  "/customer-addresses": "customer_address.view",
  "/customer-transfer": "customer_transfer.view",
  "/orders": "order.view",
  "/warehouses": "warehouse.view",
  "/locations": "location.view",
  "/warehouse-operations": "warehouse_ops.view",
  "/exceptions": "exception.view",
  "/users": "user.view",
  "/roles": "role.view",
  "/permissions": "role.view",
  "/status-master": "status_master.view",
  "/audit-logs": "audit.view",
};

// Generic list pages: which permission creates / edits / deletes a row.
// A path with no entry here is Super Admin only (fail closed).
const crudKeys = (p) => ({
  create: `${p}.create`,
  edit: `${p}.edit`,
  delete: `${p}.delete`,
});
const PATH_ACTIONS = {
  "/packages": crudKeys("tk"),
  "/inbound-origin": {
    create: "tk.scan",
    edit: "tk.edit",
    delete: "tk.delete",
  },
  "/outbound-origin": {
    create: "tk.scan",
    edit: "tk.edit",
    delete: "tk.delete",
  },
  "/shipments": crudKeys("shipment"),
  "/arrival": crudKeys("arrival"),
  "/delivery": crudKeys("delivery"),
  "/customers": crudKeys("customer"),
  "/customer-accounts": crudKeys("customer_account"),
  "/customer-addresses": crudKeys("customer_address"),
  "/locations": crudKeys("location"),
  "/warehouse-operations": crudKeys("warehouse_ops"),
  "/users": crudKeys("user"),
  "/status-master": crudKeys("status_master"),
};

// ---- Seed roles ---------------------------------------------------------
function normalizeRole(r) {
  return {
    name: r.name,
    level: r.level === undefined || r.level === "" ? null : r.level,
    scope: ROLE_SCOPES.includes(r.scope) ? r.scope : "DEPARTMENT",
    status: r.status === "Inactive" ? "Inactive" : "Active",
    description: r.description || "",
    system: !!r.system,
    legacy: !!r.legacy,
    permissions: Array.isArray(r.permissions)
      ? r.permissions.filter((k) => PERMISSION_LABEL[k] && !SUPER_ONLY.has(k))
      : [],
  };
}

function seedRoles() {
  const all = ALL_PERMISSION_KEYS;
  const views = all.filter((k) => k.endsWith(".view"));
  const not = (list, ...drop) => list.filter((k) => !drop.includes(k));
  const mk = (name, level, scope, permissions, extra = {}) =>
    normalizeRole({ name, level, scope, permissions, ...extra });

  return [
    mk(SUPER_ADMIN, 0, "GLOBAL", all, {
      system: true,
      description: "System role — full access to everything. Not editable.",
    }),
    mk(
      "Manager",
      1,
      "DEPARTMENT",
      not(
        all,
        "container.break_seal",
        "user.delete",
        "status_master.create",
        "status_master.edit",
        "status_master.delete",
      ),
      { description: "Runs a department / branch." },
    ),
    mk(
      "Supervisor",
      2,
      "DEPARTMENT",
      [
        ...not(views, "status_master.view", "audit.view"),
        "tk.create",
        "tk.edit",
        "tk.scan",
        "tk.manage_inbound",
        "tk.process",
        "tk.remeasure",
        "container.manage",
        "container.receive",
        "customer.create",
        "customer.edit",
        "order.edit",
        "order.change_branch",
      ],
      { description: "Leads a team inside a department." },
    ),
    mk(
      "Senior Officer",
      3,
      "WAREHOUSE",
      [
        "dashboard.view",
        "tk.view",
        "tk.create",
        "tk.edit",
        "tk.scan",
        "tk.manage_inbound",
        "tk.remeasure",
        "inbound.view",
        "outbound.view",
        "lookup.view",
        "container.view",
        "container.receive",
        "arrival.view",
        "wh_arrived.view",
        "kh_warehouse.view",
        "sorting.view",
        "delivery.view",
        "customer.view",
        "exception.view",
      ],
      { description: "Experienced warehouse operator." },
    ),
    mk(
      "Officer",
      4,
      "WAREHOUSE",
      [
        "dashboard.view",
        "tk.view",
        "tk.scan",
        "inbound.view",
        "outbound.view",
        "lookup.view",
        "container.view",
        "arrival.view",
        "wh_arrived.view",
        "sorting.view",
        "delivery.view",
      ],
      { description: "Front-line warehouse operator." },
    ),
    // Existing roles — kept with the SAME access they had before, so current
    // users keep working. Convert or retire them whenever you like.
    mk(
      "China Warehouse Staff",
      null,
      "DEPARTMENT",
      [
        "dashboard.view",
        "tk.view",
        "tk.create",
        "tk.scan",
        "tk.manage_inbound",
        "inbound.view",
        "outbound.view",
        "shipment.view",
        "shipment.create",
        "lookup.view",
        "container.view",
        "container.manage",
      ],
      { legacy: true, description: "Existing role (kept as-is)." },
    ),
    mk(
      "Cambodia Warehouse Staff",
      null,
      "DEPARTMENT",
      [
        "dashboard.view",
        "tk.remeasure",
        "container.view",
        "container.receive",
        "arrival.view",
        "arrival.create",
        "wh_arrived.view",
        "kh_warehouse.view",
        "sorting.view",
        "delivery.view",
        "delivery.create",
      ],
      { legacy: true, description: "Existing role (kept as-is)." },
    ),
    mk(
      "Customs Staff",
      null,
      "DEPARTMENT",
      ["dashboard.view", "exception.view"],
      { legacy: true, description: "Existing role (kept as-is)." },
    ),
    mk(
      "Customer Service",
      null,
      "DEPARTMENT",
      [
        "dashboard.view",
        "tk.view",
        "container.view",
        "lookup.view",
        "customer.view",
        "customer.create",
        "customer_account.view",
        "customer_account.create",
        "customer_address.view",
        "customer_address.create",
        "customer_transfer.view",
        "exception.view",
        "order.change_branch",
      ],
      { legacy: true, description: "Existing role (kept as-is)." },
    ),
  ];
}

// ---- Role store (module-level so non-React code can check permissions) ---
const rolesStore = { roles: null, version: 0, subs: new Set(), server: null };

function loadRoles() {
  if (rolesStore.roles) return rolesStore.roles;
  const seeds = seedRoles();
  const saved = lsRead(ROLES_KEY, null);
  const list =
    Array.isArray(saved) && saved.length ? saved.map(normalizeRole) : seeds;
  rolesStore.roles = [seeds[0], ...list.filter((r) => r.name !== SUPER_ADMIN)];
  return rolesStore.roles;
}

function commitRoles(next, persistLocal = true) {
  rolesStore.roles = [
    seedRoles()[0],
    ...next.filter((r) => r.name !== SUPER_ADMIN),
  ];
  rolesStore.version += 1;
  if (persistLocal) lsWrite(ROLES_KEY, rolesStore.roles);
  rolesStore.subs.forEach((fn) => fn());
}

function useRoles() {
  React.useSyncExternalStore(
    (fn) => {
      rolesStore.subs.add(fn);
      return () => rolesStore.subs.delete(fn);
    },
    () => rolesStore.version,
  );
  return loadRoles();
}

function findRole(name) {
  return loadRoles().find((r) => r.name === name);
}

// Pull the shared role definitions so every browser enforces the same
// matrix. Returns true when the `roles` table is reachable.
async function syncRolesFromServer() {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.from("roles").select("*");
    if (error || !Array.isArray(data)) {
      rolesStore.server = false;
      return false;
    }
    rolesStore.server = true;
    if (data.length > 0) {
      commitRoles(
        data.map((r) =>
          normalizeRole({ ...r, system: r.is_system, legacy: r.is_legacy }),
        ),
      );
    }
    return true;
  } catch {
    rolesStore.server = false;
    return false;
  }
}

// Always upserts the FULL role list (not just the edited roles) so the
// server copy is complete — otherwise the first sync would drop the roles
// that were never saved.
async function persistRoles() {
  if (!supabase) return { error: null, local: true };
  const rows = loadRoles()
    .filter((r) => r.name !== SUPER_ADMIN)
    .map((r) => ({
      name: r.name,
      level: r.level,
      scope: r.scope,
      status: r.status,
      description: r.description || null,
      is_system: r.system,
      is_legacy: r.legacy,
      permissions: r.permissions,
      updated_at: new Date().toISOString(),
    }));
  if (!rows.length) return { error: null };
  const { error } = await supabase
    .from("roles")
    .upsert(rows, { onConflict: "name" });
  return { error };
}

// ---- The one permission check -------------------------------------------
function hasPermission(user, key) {
  if (!user) return false;
  if (user.role === SUPER_ADMIN) return true; // Super Admin is never restricted
  if (!key || SUPER_ONLY.has(key)) return false;
  const role = findRole(user.role);
  return !!role && role.status === "Active" && role.permissions.includes(key);
}

function requirePermission(user, key, message) {
  if (!hasPermission(user, key)) throw new Error(message || NO_PERM_MSG);
}

// Resolved LIVE from the role store, so editing a role immediately changes
// every signed-in user of that role.
function computeAllowedPaths(u) {
  if (!u || u.role === SUPER_ADMIN) return "*";
  return Object.entries(PATH_VIEW)
    .filter(([, key]) => hasPermission(u, key))
    .map(([path]) => path);
}

function withLivePaths(u) {
  if (!u || !u.role || u.isStaff === false || u.role === "Customer") return u;
  return { ...u, allowedPaths: computeAllowedPaths(u) };
}

function firstAllowedPath(u) {
  const ap = u?.allowedPaths;
  if (ap === "*") return "/";
  if (!Array.isArray(ap)) return null;
  for (const section of NAV_SECTIONS)
    for (const item of section.items)
      if (ap.includes(item.path)) return item.path;
  return null;
}

// ---- Role assignment ------------------------------------------------------
// Super Admin may assign any role. Anyone else needs user.assign_role and
// may only assign roles BELOW their own level (no self-escalation).
function assignableRoles(user) {
  const active = loadRoles().filter((r) => r.status === "Active");
  if (user?.role === SUPER_ADMIN) return active;
  const me = findRole(user?.role);
  if (!hasPermission(user, "user.assign_role") || me?.level == null) return [];
  return active.filter(
    (r) => r.name !== SUPER_ADMIN && r.level != null && r.level > me.level,
  );
}

function assertCanAssignRole(user, roleName) {
  requirePermission(user, "user.assign_role", "អ្នកគ្មានសិទ្ធិកំណត់ Role ទេ");
  if (!assignableRoles(user).some((r) => r.name === roleName))
    throw new Error(`អ្នកមិនអាចកំណត់ Role "${roleName}" បានទេ`);
}

// ---- Department / warehouse data scope -------------------------------------
// Returns null (= no restriction) or the list of warehouse codes the user
// may operate in. Legacy users without department/warehouse stay unrestricted
// (back-compat); a NEW role with no department/warehouse sees nothing.
function scopeWarehouseCodes(user, whRows) {
  if (!user || user.role === SUPER_ADMIN) return null;
  if (user.isStaff === false || user.role === "Customer" || !user.role)
    return null;
  const role = findRole(user.role);
  if (!role || role.scope === "GLOBAL") return null;
  const list = Array.isArray(whRows) ? whRows : [];
  const dept = DEPARTMENTS.find((d) => d.name === user.department);
  if (user.warehouse && role.scope !== "DEPARTMENT") return [user.warehouse];
  if (dept?.country)
    return list.filter((w) => w.type === dept.country).map((w) => w.code);
  if (user.warehouse) return [user.warehouse];
  if (dept) return null; // Customs / Customer Service / Management
  return role.legacy ? null : [];
}

// A TK / Container is in scope when any of its warehouse codes is allowed.
// Rows without any warehouse code stay visible.
function rowInScope(row, codes) {
  if (codes === null) return true;
  const rc = [
    row?.origin_wh_code,
    row?.dest_branch_code,
    row?.dest_wh_code,
    row?.warehouse,
  ].filter(Boolean);
  if (!rc.length) return true;
  return rc.some((c) => codes.includes(c));
}

// ------------------------------------------------------------
// lib/modules.js
// ------------------------------------------------------------
// Central config for every list-style module in the sidebar.
// Swap `rows` for a Supabase query later — `columns`/`stats` can stay as-is.

const col = (key, label, extra = {}) => ({ key, label, ...extra });

const MODULES = {
  "/packages": {
    title: "Packages / TK",
    subtitle: "Every package from China Warehouse to final delivery",
    primaryAction: "New TK",
    stats: [
      {
        icon: "Package",
        label: "Total Packages",
        metric: "total",
        tone: "ink",
      },
      {
        icon: "Warehouse",
        label: "At China Warehouse",
        metric: "atChina",
        tone: "blue",
      },
      { icon: "Ship", label: "In Transit", metric: "inTransit", tone: "amber" },
      {
        icon: "CircleCheck",
        label: "Delivered",
        metric: "delivered",
        tone: "teal",
      },
    ],
    columns: [
      col("tk", "TK Number", {
        strong: true,
        linkTo: (row) => `/packages/${row.tk}`,
      }),
      col("customer", "Customer"),
      col("order_no", "Order ID"),
      col("cargo", "Cargo"),
      col("weight", "Weight"),
      col("cbm", "CBM"),
      col("freight", "Freight"),
      col("warehouse", "China WH"),
      col("dest_branch", "Receiving Branch"),
      col("inbound_status", "Inbound", { status: true }),
      col("status", "Status", { status: true }),
      col("shipping_fee", "Shipping Fee", {
        render: (row) => <ShippingFeeCell row={row} />,
      }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/inbound-origin": {
    title: "Inbound Origin",
    subtitle:
      "Receive goods at China Warehouse — scan TK, weight, dimensions and QC",
    primaryAction: "Scan TK",
    stats: [
      {
        icon: "LogIn",
        label: "Received (Today)",
        metric: "receivedToday",
        tone: "blue",
      },
      {
        icon: "ScanLine",
        label: "Awaiting QC",
        metric: "awaitingQc",
        tone: "amber",
      },
      {
        icon: "UserX",
        label: "Customer Not Found",
        metric: "notFound",
        tone: "red",
      },
    ],
    columns: [
      col("tk", "TK Number", {
        strong: true,
        linkTo: (row) => `/packages/${row.tk}`,
      }),
      col("customer", "Customer"),
      col("order_no", "Order ID"),
      col("cargo", "Cargo"),
      col("weight", "Weight"),
      col("cbm", "CBM"),
      col("freight", "Freight"),
      col("created_by", "Received By"),
      col("inbound_status", "Inbound Status", { status: true }),
      col("shipping_fee", "Shipping Fee", {
        render: (row) => <ShippingFeeCell row={row} />,
      }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/outbound-origin": {
    title: "Outbound Origin",
    subtitle:
      "Outbound processing from China Warehouse — scan TK to confirm loading",
    // Same TK registry as Packages / TK and Inbound Origin (see
    // PackageTrackingContext) — a TK only appears here once it's been
    // scanned out, and its Status is the same shared Status shown
    // everywhere else that TK appears.
    primaryAction: "Scan TK",
    stats: [
      {
        icon: "LogOut",
        label: "Total CBM",
        metric: "totalCbm",
        unit: "M³",
        tone: "blue",
      },
      {
        icon: "Weight",
        label: "Total Weight",
        metric: "totalWeight",
        unit: "KG",
        tone: "ink",
      },
    ],
    columns: [
      col("tk", "TK Number", {
        strong: true,
        linkTo: (row) => `/packages/${row.tk}`,
      }),
      col("customer", "Customer"),
      col("order_no", "Order ID"),
      col("container_no", "Container No"),
      col("dest_branch", "Receiving Branch"),
      col("weight", "Weight"),
      col("cbm", "CBM"),
      col("method", "Shipping Method"),
      col("outboundAt", "Outbound At"),
      col("shipping_fee", "Shipping Fee", {
        render: (row) => <ShippingFeeCell row={row} />,
      }),
      col("status", "Status", { status: true }),
    ],
    // Rows aren't listed here — this list is derived live from whichever
    // TKs in the shared registry have reached "Outbound Origin" status.
    rows: [],
  },

  "/shipments": {
    title: "Shipments",
    subtitle: "Shipments that group multiple TKs",
    stats: [
      {
        icon: "Truck",
        label: "Active Shipments",
        metric: "total",
        tone: "blue",
      },
      {
        icon: "Ship",
        label: "In Transit",
        metric: "shipInTransit",
        tone: "amber",
      },
      {
        icon: "CircleCheck",
        label: "Arrived",
        metric: "shipArrived",
        tone: "teal",
      },
    ],
    columns: [
      col("shipment_no", "Shipment No", { strong: true }),
      col("route", "Route"),
      col("transport", "Transport"),
      col("packages", "Packages"),
      col("weight", "Weight"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/arrival": {
    title: "Cambodia Arrival",
    subtitle: "Arrival at port / dry port",
    columns: [
      col("shipment_no", "Shipment No", { strong: true }),
      col("port", "Port / Dry Port"),
      col("arrivalDate", "Arrival Date"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/kh-warehouse": {
    title: "Cambodia Warehouse",
    subtitle: "Receive containers and TKs at Cambodia Warehouse",
    stats: [
      {
        icon: "Warehouse",
        label: "In Stock",
        metric: "khScanned",
        tone: "teal",
      },
      {
        icon: "TriangleAlert",
        label: "Missing",
        metric: "khMissing",
        tone: "red",
      },
    ],
    columns: [
      col("container", "Container", { strong: true }),
      col("expected", "Expected"),
      col("scanned", "Scanned"),
      col("missing", "Missing"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/sorting": {
    title: "Warehouse Sorting",
    subtitle: "Sort TKs by customer and location",
    // Same shared TK registry as Packages / TK, Inbound Origin and
    // Outbound Origin (see PackageTrackingContext / STAGE_LIST_PAGES) — a
    // TK only appears here once it's reached "Inbound Warehouse".
    primaryAction: "Scan TK",
    columns: [
      col("tk", "TK Number", {
        strong: true,
        linkTo: (row) => `/packages/${row.tk}`,
      }),
      col("customer", "Customer"),
      col("dest_branch", "Receiving Branch"),
      col("location", "Location"),
      col("shipping_fee", "Shipping Fee", {
        render: (row) => <ShippingFeeCell row={row} />,
      }),
      col("status", "Status", { status: true }),
    ],
    // Rows aren't listed here — this list is derived live from whichever
    // TKs in the shared registry have reached "Inbound Warehouse".
    rows: [],
  },

  "/delivery": {
    title: "Delivery",
    subtitle: "Deliver shipments to customers",
    primaryAction: "Assign Driver",
    stats: [
      {
        icon: "Bike",
        label: "Out for Delivery",
        metric: "dlvOut",
        tone: "blue",
      },
      {
        icon: "CircleCheck",
        label: "Delivered",
        metric: "dlvDone",
        tone: "teal",
      },
      { icon: "CircleX", label: "Failed", metric: "dlvFailed", tone: "red" },
    ],
    columns: [
      col("id", "Delivery ID", { strong: true }),
      col("customer", "Customer"),
      col("driver", "Driver"),
      col("packages", "Packages"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/customers": {
    title: "Customers",
    subtitle: "All users in the system",
    primaryAction: "New Customer",
    stats: [
      { icon: "Users", label: "Total Customers", metric: "total", tone: "ink" },
      {
        icon: "UserPlus",
        label: "New (This Month)",
        metric: "newThisMonth",
        tone: "blue",
      },
    ],
    columns: [
      col("id", "Customer ID", { strong: true }),
      col("name", "Name"),
      col("email", "Email"),
      col("phone", "Phone"),
      col("warehouse", "Default Warehouse"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/customer-accounts": {
    title: "Customer Accounts",
    subtitle: "Customer login accounts",
    columns: [
      col("id", "Customer ID", { strong: true }),
      col("name", "Name"),
      col("email", "Email"),
      col("registered", "Registered"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/customer-addresses": {
    title: "Customer Addresses",
    subtitle: "Customer China Warehouse addresses",
    columns: [
      col("customer", "Customer", { strong: true }),
      col("warehouse", "Warehouse"),
      col("recipient", "Recipient"),
      col("version", "Version"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/customer-transfer": {
    title: "Customer ID Transfer",
    subtitle: "Transfer TKs between Customer IDs without deleting history",
    primaryAction: "New Transfer",
    columns: [
      col("tk", "TK Number", {
        strong: true,
        linkTo: (row) => `/packages/${row.tk}`,
      }),
      col("from", "From"),
      col("to", "To"),
      col("reason", "Reason"),
      col("approvedBy", "Approved By"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/warehouses": {
    title: "Warehouses",
    subtitle: "Warehouse master data — China and Cambodia",
    primaryAction: "New Warehouse",
    columns: [
      col("id", "Warehouse ID", { strong: true }),
      col("name", "Name"),
      col("country", "Country"),
      col("city", "Province / City"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/locations": {
    title: "Warehouse Locations",
    subtitle: "Storage locations inside warehouses",
    columns: [
      col("code", "Location Code", { strong: true }),
      col("warehouse", "Warehouse"),
      col("zone", "Zone"),
      col("capacity", "Used / Capacity"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/warehouse-operations": {
    title: "Warehouse Operations",
    subtitle: "Warehouse operational activity logs",
    columns: [
      col("action", "Action", { strong: true }),
      col("tk", "TK Number", { linkTo: (row) => `/packages/${row.tk}` }),
      col("staff", "Staff"),
      col("time", "Time"),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/users": {
    title: "Users",
    subtitle: "All staff and admins in the system",
    primaryAction: "New User",
    columns: [
      col("name", "Name", { strong: true }),
      col("role", "Role"),
      col("department", "Department"),
      col("warehouse_code", "Warehouse"),
      col("email", "Email"),
      col("status", "Status", { status: true }),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/status-master": {
    title: "Status Master",
    subtitle: "All status definitions used by the system",
    columns: [
      col("code", "Status Code", { strong: true }),
      col("label", "Label"),
      col("category", "Category"),
    ],
    rows: [], // live data only — loaded from the server
  },

  "/audit-logs": {
    title: "Audit Logs",
    subtitle: "Important activity logs — Who, What, When",
    columns: [
      col("action", "Action", { strong: true }),
      col("ref", "Reference"),
      col("by", "By"),
      col("time", "Time"),
    ],
    rows: [], // live data only — loaded from the server
  },

  // Rows come from the real shared package registry (see
  // PackageTrackingContext, ListPage's isExceptionsModule branch below) —
  // packages whose `exception` field is set — not from a static mock
  // array like the modules above. `rows: []` here is just the shape
  // ListPage expects; it's never actually rendered for this path.
  "/exceptions": {
    title: "Exception Center",
    subtitle:
      "All TKs currently in exception (weight difference, missing, etc.)",
    columns: [
      col("tk", "TK Number", {
        strong: true,
        linkTo: (row) => `/packages/${row.tk}`,
      }),
      col("customer", "Customer"),
      col("status", "Exception Type", { status: true }),
      col("detail", "Detail"),
    ],
    rows: [],
  },
};

// ------------------------------------------------------------
// lib/details.js
// ------------------------------------------------------------
// Detail data for the TK / Container detail pages.
// Swap these lookups for Supabase queries later — the page components
// just need { header fields..., timeline: [{label, time, state}] }.

const PACKAGE_STAGES = [
  "Inbound Origin",
  "Outbound Origin",
  "Arrived Destination",
  "Shipping To Branch",
  "Inbound Warehouse",
  "Completed",
];

// Some transitions have a real, dedicated Scan → Verify flow elsewhere
// (W.H Arrived / Scan Arrive V2 for Outbound Origin → Arrived
// Destination, Sorting / Scan Sorting V2 for Shipping To Branch →
// Inbound Warehouse) — those represent the package physically arriving
// somewhere, confirmed by a staff member on the spot, not something a
// generic "next status" click on Package Detail should be able to skip
// straight past. Package Detail's manual Advance button is disabled
// while a TK sits in one of these stages; it just has to wait there
// (in transit) for the real scan to happen on the right page.
const VERIFY_GATED_STAGES = {
  "Outbound Origin": {
    nextLabel: "Arrived Destination",
    note: "ទំនិញកំពុងដឹកជញ្ជូន — រង់ចាំ Verify Scan Arrive V2 នៅ W.H Arrived (Destination)",
  },
  "Shipping To Branch": {
    nextLabel: "Inbound Warehouse",
    note: "កំពុងបញ្ជូនទៅសាខា — រង់ចាំ Verify Scan Sorting V2 នៅ Sorting",
  },
};

const CONTAINER_STAGES = [
  "Created",
  "Booking Confirmed",
  "Loading",
  "Loaded",
  "Gate Out",
  "Departed",
  "In Transit",
  "Arrived",
  "Customs Clearance",
  "Released",
  "Empty Returned",
];

function buildTimeline(stages, currentIndex, timestamps, proceedBy = []) {
  return stages.map((label, i) => ({
    label,
    time: timestamps[i] || null,
    state:
      i < currentIndex ? "done" : i === currentIndex ? "active" : "pending",
    proceedBy:
      i < currentIndex
        ? proceedBy[i] || "System Automation"
        : i === currentIndex
          ? proceedBy[i] || null
          : null,
  }));
}

// Manual status advance — used until real inbound/outbound scans exist to
// drive this automatically (see Package/Container detail pages). Marks the
// current "active" step "done" (stamped with who/when) and activates the
// next step — stamped with who/when right away too, same as
// syncTimelineToStatus, so whichever stage is currently active always
// shows a real user and timestamp instead of waiting for the step after
// it. Returns the same array (no-op) once the last stage is reached.
function advanceTimeline(timeline, proceedBy) {
  const activeIndex = timeline.findIndex((s) => s.state === "active");
  if (activeIndex === -1) return timeline;
  const now = formatNowTimestamp();
  return timeline.map((step, i) => {
    if (i === activeIndex) {
      return { ...step, state: "done", time: now, proceedBy };
    }
    if (i === activeIndex + 1) {
      return { ...step, state: "active", time: now, proceedBy };
    }
    return step;
  });
}

function formatNowTimestamp() {
  const d = new Date();
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
}

// ------------------------------------------------------------
// lib/cargo.js — freight pricing, CBM, Order ID (THN######), photos
// ------------------------------------------------------------
// Shared by the New TK / Inbound Origin form, TK Detail, the list filters
// and Outbound Origin so every module reads the same rules.
//
// SUPABASE MIGRATION (run once BEFORE using the new Inbound form with a
// live database — UI-only mode needs nothing). Column types assume
// packages.id and customers.id are uuid; adjust if yours differ.
//
//   create sequence if not exists order_no_seq;
//   alter table orders add column if not exists order_no text unique;
//   alter table orders alter column order_no set default
//     'THN' || lpad(nextval('order_no_seq')::text, 6, '0');
//   update orders set order_no = 'THN' || lpad(nextval('order_no_seq')::text, 6, '0')
//     where order_no is null;
//   create index if not exists orders_customer_id_idx on orders(customer_id);
//
//   alter table packages
//     add column if not exists order_no text,
//     add column if not exists product_name text,
//     add column if not exists cargo_type text,
//     add column if not exists size_class text,
//     add column if not exists length_cm numeric,
//     add column if not exists width_cm numeric,
//     add column if not exists height_cm numeric,
//     add column if not exists weight_kg numeric,
//     add column if not exists pricing_method text,
//     add column if not exists rate numeric,
//     add column if not exists freight_fee numeric,
//     add column if not exists freight_overridden boolean default false,
//     add column if not exists inbound_status text,
//     add column if not exists inbound_at timestamptz,
//     add column if not exists container_no text,
//     add column if not exists package_count int default 1,
//     add column if not exists created_by text,
//     add column if not exists updated_by text,
//     add column if not exists updated_at timestamptz;
//   create index if not exists packages_order_no_idx on packages(order_no);
//   create index if not exists packages_container_no_idx on packages(container_no);
//   create index if not exists packages_customer_id_idx on packages(customer_id);
//   alter table outbound_origin add column if not exists container_no text;
//
//   create table if not exists cargo_photos (
//     id uuid primary key default gen_random_uuid(),
//     package_id uuid references packages(id) on delete cascade,
//     tk text not null,
//     customer_id uuid references customers(id),
//     order_no text,
//     category text,
//     storage_path text not null,
//     created_at timestamptz default now()
//   );
//   create index if not exists cargo_photos_tk_idx on cargo_photos(tk);
//
//   create table if not exists status_history (
//     id uuid primary key default gen_random_uuid(),
//     tk text not null,
//     status text not null,
//     remark text,
//     created_by text,
//     created_at timestamptz default now()
//   );
//   create index if not exists status_history_tk_idx on status_history(tk);
//
//   -- Storage: create a public bucket named "cargo-photos", plus RLS
//   -- policies that let staff insert/select on cargo_photos.

const SIZE_PRICES = { S: 0.5, M: 1, L: 2 };
const CBM_RATES = { Normal: 180, Sensitive: 220 };
const CARGO_TYPES = ["Normal", "Sensitive"];
const SIZE_CHOICES = ["S", "M", "L", "OVER"];
const PHOTO_CATEGORIES = [
  "Product Front",
  "Product Back",
  "Product Label / Barcode",
  "Package",
  "Damage / Exception",
];
const INBOUND_STATUSES = [
  "Pending",
  "Received",
  "Measuring",
  "Checked",
  "Ready for Shipment",
  "Exception",
];
const CHINA_WAREHOUSES = [
  { code: "CN-GZ-01", name: "Guangzhou" },
  { code: "CN-YW-01", name: "Yiwu" },
  { code: "CN-SZ-01", name: "Shenzhen" },
];
// Who may create/scan TKs, measure cargo and move them to Outbound Origin.
// TK_CREATE_ROLES → permission "tk.manage_inbound" (see lib/permissions.js)
// Who may override the automatically calculated freight fee.
// FREIGHT_OVERRIDE_ROLES → permission "tk.freight_override" (see lib/permissions.js)
// Who may re-measure (size / weight) a TK at the Cambodia warehouse when
// the China side entered it wrongly.
// REMEASURE_ROLES → permission "tk.remeasure" (see lib/permissions.js)

const LABEL_CLS =
  "block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1";
const INPUT_CLS =
  "w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue";

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function money(n) {
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toFixed(2)}` : "—";
}

function sizeLabel(size) {
  if (!size) return "—";
  return size === "OVER" ? "> L (Oversize)" : size;
}

// CBM = L × W × H (cm) / 1,000,000, rounded to 3 decimals. Returns null
// unless all three sides are positive numbers.
function computeCbm(length, width, height) {
  const l = Number(length);
  const w = Number(width);
  const h = Number(height);
  if (!(l > 0 && w > 0 && h > 0)) return null;
  return Math.round(((l * w * h) / 1000000) * 1000) / 1000;
}

// S/M/L → fixed price. "OVER" (> L) → CBM × rate for the cargo type.
function calcFreight({ cargoType, sizeClass, length, width, height }) {
  const cbm = computeCbm(length, width, height);
  if (!cargoType) return { ok: false, message: "សូមជ្រើសរើស Cargo Type", cbm };
  if (!sizeClass) return { ok: false, message: "សូមជ្រើសរើស Size", cbm };
  if (sizeClass === "OVER") {
    if (cbm == null)
      return {
        ok: false,
        message: "សូមបញ្ចូល Length, Width, Height (លេខវិជ្ជមាន)",
        cbm,
      };
    const rate = CBM_RATES[cargoType];
    return {
      ok: true,
      method: "CBM",
      rate,
      cbm,
      fee: Math.round(cbm * rate * 100) / 100,
    };
  }
  const rate = SIZE_PRICES[sizeClass];
  return { ok: true, method: "Fixed", rate, cbm, fee: rate };
}

function rateLabel(pkg) {
  if (pkg.rate === undefined || pkg.rate === null || pkg.rate === "")
    return "—";
  return pkg.pricing_method === "CBM"
    ? `${money(pkg.rate).replace(".00", "")} / CBM`
    : money(pkg.rate);
}

// ---- Shipping fee (payment) status --------------------------------------
// total = freight_fee, paid = paid_amount (0 until a payment is recorded),
// due = total - paid. Shown on every TK list as "Due $X / Shipping fee",
// "Paid $X" or "—" when the TK has no fee yet.
function shippingFeeOf(p) {
  const total = Number(p?.freight_fee);
  if (
    p?.freight_fee === undefined ||
    p?.freight_fee === null ||
    p?.freight_fee === "" ||
    !Number.isFinite(total)
  )
    return { state: "none", total: null, paid: 0, due: 0 };
  const paid = Math.max(Number(p?.paid_amount) || 0, 0);
  const due = Math.max(Math.round((total - paid) * 100) / 100, 0);
  return { state: due > 0 ? "due" : "paid", total, paid, due };
}

function shippingFeeText(p) {
  const f = shippingFeeOf(p);
  if (f.state === "none") return "—";
  return f.state === "due" ? `Due ${money(f.due)}` : `Paid ${money(f.total)}`;
}

function ShippingFeeCell({ row }) {
  const f = shippingFeeOf(row);
  if (f.state === "none") return <span className="text-ink-600/40">—</span>;
  if (f.state === "paid")
    return (
      <div className="leading-tight">
        <div className="font-semibold text-signal-teal">{money(f.total)}</div>
        <div className="text-[11px] text-signal-teal/80">Paid</div>
      </div>
    );
  return (
    <div className="leading-tight">
      <div className="font-semibold text-[#B87415]">{money(f.due)}</div>
      <div className="text-[11px] text-ink-600/55">Shipping fee</div>
    </div>
  );
}

const SHIPPING_FEE_COL = {
  key: "shipping_fee",
  label: "Shipping Fee",
  render: (row) => <ShippingFeeCell row={row} />,
};

function outboundStatusOf(p) {
  return p.status === "Inbound Origin" || !p.status ? "Not Shipped" : p.status;
}

function formatIso(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Adds display-only fields so list columns/CSV export/search can read
// flat strings. Never written back to the registry.
function decoratePackageRow(p) {
  const hasFee =
    p.freight_fee !== undefined &&
    p.freight_fee !== null &&
    p.freight_fee !== "";
  return {
    ...p,
    cargo: p.cargo_type ? `${p.cargo_type} · ${sizeLabel(p.size_class)}` : "—",
    freight: hasFee ? money(p.freight_fee) : "—",
    shipping_fee: shippingFeeText(p),
    dest_branch: p.dest_branch_code || "—",
    origin_wh: p.origin_wh_code || p.warehouse || "—",
    inbound_status: p.inbound_status || "—",
    order_no: p.order_no || "—",
    container_no: p.container_no || "—",
    created_by: p.created_by || "—",
  };
}

// ---- Order ID (THN000001, THN000002, ...) -----------------------------
// Live database: orders.order_no gets its value from a sequence default
// (see migration above), so two staff creating orders at the same moment
// can never receive the same number. UI-only mode keeps a local registry.
const ORDERS_KEY = "cargo_bridge_orders";

function readLocalOrders() {
  try {
    return JSON.parse(window.localStorage.getItem(ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalOrders(rows) {
  try {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(rows));
  } catch {
    // Storage unavailable — the order still exists for this session's flow.
  }
}

function formatOrderNo(n) {
  return `THN${String(n).padStart(6, "0")}`;
}

function nextLocalOrderNo(existing) {
  const nums = existing
    .map((o) => parseInt(String(o.order_no || "").slice(3), 10))
    .filter(Number.isFinite);
  return formatOrderNo((nums.length ? Math.max(...nums) : 0) + 1);
}

function createLocalOrder(customer, platform, route = {}) {
  const existing = readLocalOrders();
  const order = {
    id: `local-${makeId()}`,
    order_no: nextLocalOrderNo(existing),
    customer_id: customer.id,
    customer: `${customer.customer_code} · ${customer.name}`,
    platform: platform || null,
    china_wh_code: route.china || null,
    kh_branch_code: route.kh || null,
    status: "New",
    date: formatNowTimestamp(),
    created_at: new Date().toISOString(),
  };
  writeLocalOrders([order, ...existing]);
  return order;
}

async function createOrderRemote(customer, platform, route = {}) {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      customer: `${customer.customer_code} · ${customer.name}`,
      platform: platform || null,
      china_wh_code: route.china || null,
      kh_branch_code: route.kh || null,
      date: formatNowTimestamp(),
      status: "New",
    })
    .select("*")
    .single();
  if (error) {
    if (/china_wh_code|kh_branch_code/.test(error.message || ""))
      throw new Error(
        "orders.china_wh_code / kh_branch_code មិនទាន់មាន — សូមរត់ SQL migration Warehouse (មើលកំណត់ចំណាំ lib/warehouses.js) សិន",
      );
    throw error;
  }
  if (!data.order_no)
    throw new Error(
      "orders.order_no មិនទាន់មាន — សូមរត់ SQL migration (មើលកំណត់ចំណាំ lib/cargo.js) សិន",
    );
  return data;
}

// Preview of the Order ID the NEXT inbound will receive (read-only in the
// New TK form). The real number is always assigned at Save time — by the
// database sequence (live) or the local registry (UI-only) — so a preview
// can never cause a duplicate; it only shows what is about to be issued.
async function peekNextOrderNo() {
  const local = nextLocalOrderNo(readLocalOrders());
  if (!supabase) return local;
  try {
    const { data } = await supabase
      .from("orders")
      .select("order_no")
      .like("order_no", "THN%")
      .order("order_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const n = parseInt(String(data?.order_no || "").slice(3), 10);
    return Number.isFinite(n) ? formatOrderNo(n + 1) : local;
  } catch {
    return local;
  }
}

// If the TK could not be saved after its new Order was created, remove that
// Order again so no empty / orphan Order is left behind.
async function rollbackNewOrder(order) {
  if (!order) return;
  try {
    if (String(order.id).startsWith("local-"))
      writeLocalOrders(readLocalOrders().filter((o) => o.id !== order.id));
    else if (supabase)
      await supabase.from("orders").delete().eq("id", order.id);
  } catch {
    // best effort
  }
}

// ------------------------------------------------------------
// lib/warehouses.js — China Warehouses & Cambodia Receiving Branches
// ------------------------------------------------------------
// Two DIFFERENT concepts, never mixed:
//   China Warehouse  = where the supplier sends the goods (origin)
//   Cambodia Branch  = where the customer receives the goods (destination)
// Both are stored on the ORDER (orders.china_wh_code / kh_branch_code) and
// every TK inherits them (packages.origin_wh_code / dest_branch_code).
// A customer only has DEFAULTS (customers.default_china_wh /
// default_kh_branch) that pre-fill new orders — old orders never change
// when a default changes.
//
// SUPABASE MIGRATION (run once; UI-only mode needs nothing):
//
//   create table if not exists warehouses (
//     id uuid primary key default gen_random_uuid(),
//     type text not null check (type in ('china','cambodia')),
//     code text not null unique,
//     name text not null,
//     country text, province text, district text, commune text,
//     address text, map_url text,
//     contact_person text, phone text, opening_hours text,
//     status text not null default 'Active',
//     created_at timestamptz default now(),
//     updated_at timestamptz default now()
//   );
//   create index if not exists warehouses_type_idx on warehouses(type);
//   insert into warehouses (type, code, name, country, province) values
//     ('china','CN-GZ-01','Guangzhou Warehouse','China','Guangzhou'),
//     ('china','CN-YW-01','Yiwu Warehouse','China','Yiwu'),
//     ('china','CN-SZ-01','Shenzhen Warehouse','China','Shenzhen'),
//     ('cambodia','KH-PP-01','Phnom Penh Branch','Cambodia','Phnom Penh')
//   on conflict (code) do nothing;
//
//   alter table customers
//     add column if not exists default_china_wh text,
//     add column if not exists default_kh_branch text;
//   alter table orders
//     add column if not exists china_wh_code text,
//     add column if not exists kh_branch_code text;
//   alter table packages
//     add column if not exists origin_wh_code text,
//     add column if not exists dest_branch_code text;
//   create index if not exists orders_kh_branch_idx on orders(kh_branch_code);
//   create index if not exists packages_dest_branch_idx on packages(dest_branch_code);
//
//   create table if not exists warehouse_history (
//     id uuid primary key default gen_random_uuid(),
//     entity_type text not null,   -- 'order' | 'customer'
//     ref text not null,           -- order_no or customer_code
//     field text,                  -- china_wh | kh_branch | default_...
//     old_code text, new_code text,
//     changed_by text, reason text,
//     created_at timestamptz default now()
//   );
//   create index if not exists warehouse_history_ref_idx
//     on warehouse_history(entity_type, ref);
//
//   notify pgrst, 'reload schema';
const WAREHOUSES_KEY = "cargo_bridge_warehouses";
const WH_HISTORY_KEY = "cargo_bridge_wh_history";
const CUSTOMER_WH_KEY = "cargo_bridge_customer_wh";
// Who manages the warehouse master data / customer assignments.
// WAREHOUSE_ADMIN_ROLES → permission "warehouse.manage" (see lib/permissions.js)
// Who may change an order's destination branch (with a reason).
// BRANCH_CHANGE_ROLES → permission "order.change_branch" (see lib/permissions.js)
// true = Confirm Arrived is blocked when no Receiving Branch can be found.
// Kept false so old TKs created before this feature can still arrive.
const REQUIRE_BRANCH_ON_ARRIVAL = false;
const WH_TABLE_HINT =
  "តារាង warehouses មិនទាន់មាន — សូមរត់ SQL migration Warehouse (មើលកំណត់ចំណាំ lib/warehouses.js) សិន";

function lsRead(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — data still lives in memory for this session.
  }
}

function blankWarehouse(type) {
  return {
    type,
    code: "",
    name: "",
    country: type === "china" ? "China" : "Cambodia",
    province: "",
    district: "",
    commune: "",
    address: "",
    map_url: "",
    contact_person: "",
    phone: "",
    opening_hours: "",
    status: "Active",
  };
}

function seedWarehouses() {
  const now = new Date().toISOString();
  return [
    ...CHINA_WAREHOUSES.map((w) => ({
      ...blankWarehouse("china"),
      id: `seed-${w.code}`,
      code: w.code,
      name: `${w.name} Warehouse`,
      province: w.name,
      created_at: now,
      updated_at: now,
    })),
    {
      ...blankWarehouse("cambodia"),
      id: "seed-KH-PP-01",
      code: "KH-PP-01",
      name: "Phnom Penh Branch",
      province: "Phnom Penh",
      created_at: now,
      updated_at: now,
    },
  ];
}

function readLocalWarehouses() {
  const saved = lsRead(WAREHOUSES_KEY, null);
  if (Array.isArray(saved) && saved.length) return saved;
  const seeded = seedWarehouses();
  lsWrite(WAREHOUSES_KEY, seeded);
  return seeded;
}

function whName(list, code) {
  if (!code) return "—";
  const w = list.find((x) => x.code === code);
  return w ? `${w.code} · ${w.name}` : code;
}

function whIsActive(list, code, type) {
  const w = list.find((x) => x.code === code && (!type || x.type === type));
  return !!w && w.status === "Active";
}

// Every active order needs an ACTIVE China Warehouse and an ACTIVE
// Cambodia Branch. Returns "" when valid, otherwise a message.
function validateOrderRoute(china, kh, list) {
  if (!china) return "សូមជ្រើសរើស China Warehouse";
  if (!kh) return "សូមជ្រើសរើស Cambodia Receiving Branch";
  if (list.length) {
    if (!whIsActive(list, china, "china"))
      return `China Warehouse "${china}" មិន Active`;
    if (!whIsActive(list, kh, "cambodia"))
      return `Cambodia Branch "${kh}" មិន Active`;
  }
  return "";
}

function useWarehouses() {
  const [rows, setRows] = useState(() =>
    supabase ? seedWarehouses() : readLocalWarehouses(),
  );
  const [loading, setLoading] = useState(!!supabase);
  const [ready, setReady] = useState(!supabase); // first fetch finished
  // false = live table missing → showing seed data, writes are refused.
  const [tableReady, setTableReady] = useState(!supabase);

  const refetch = React.useCallback(async () => {
    if (!supabase) {
      setRows(readLocalWarehouses());
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .order("code", { ascending: true });
    setLoading(false);
    setReady(true);
    if (error || !data) {
      setTableReady(false);
      return;
    }
    setTableReady(true);
    setRows(data);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function saveWarehouse(values, existing) {
    const type = values.type;
    const code = String(values.code || "")
      .trim()
      .toUpperCase();
    const name = String(values.name || "").trim();
    if (!code) throw new Error("Code ត្រូវការ");
    if (!name) throw new Error("Name ត្រូវការ");
    if (type === "cambodia" && !String(values.province || "").trim())
      throw new Error("Province ត្រូវការសម្រាប់ Cambodia Branch");
    if (
      rows.some(
        (w) =>
          w.code.toLowerCase() === code.toLowerCase() && w.id !== existing?.id,
      )
    )
      throw new Error(`Code "${code}" មានរួចហើយ`);
    const t = (v) => String(v || "").trim();
    const clean = {
      type,
      code,
      name,
      country: type === "china" ? "China" : "Cambodia",
      province: t(values.province),
      district: t(values.district),
      commune: t(values.commune),
      address: t(values.address),
      map_url: t(values.map_url),
      contact_person: t(values.contact_person),
      phone: t(values.phone),
      opening_hours: t(values.opening_hours),
      status: values.status || "Active",
      updated_at: new Date().toISOString(),
    };
    if (!supabase) {
      const next = existing
        ? rows.map((w) => (w.id === existing.id ? { ...w, ...clean } : w))
        : [
            { id: `local-${makeId()}`, created_at: clean.updated_at, ...clean },
            ...rows,
          ];
      lsWrite(WAREHOUSES_KEY, next);
      setRows(next);
      return;
    }
    if (!tableReady) throw new Error(WH_TABLE_HINT);
    const req = existing
      ? supabase.from("warehouses").update(clean).eq("id", existing.id)
      : supabase.from("warehouses").insert(clean);
    const { data, error } = await req.select("*").single();
    if (error)
      throw new Error(
        error.code === "23505" ? `Code "${code}" មានរួចហើយ` : error.message,
      );
    setRows((prev) =>
      existing
        ? prev.map((w) => (w.id === data.id ? data : w))
        : [...prev, data].sort((a, b) => a.code.localeCompare(b.code)),
    );
  }

  function setWarehouseStatus(w, status) {
    return saveWarehouse({ ...w, status }, w);
  }

  return {
    rows,
    loading,
    ready,
    tableReady,
    refetch,
    saveWarehouse,
    setWarehouseStatus,
  };
}

// ---- Customer default warehouses -------------------------------------
// Server value wins; localStorage is the fallback (UI-only mode, or the
// customers table not migrated yet). Default China falls back to the
// older customers.warehouse column so existing customers keep working.
async function readCustomerDefaults(customerCode) {
  if (!customerCode) return { china: "", kh: "" };
  const local = lsRead(CUSTOMER_WH_KEY, {})[customerCode] || {};
  let china = local.china || "";
  let kh = local.kh || "";
  try {
    if (supabase) {
      let res = await supabase
        .from("customers")
        .select("customer_code, warehouse, default_china_wh, default_kh_branch")
        .eq("customer_code", customerCode)
        .maybeSingle();
      if (res.error)
        res = await supabase
          .from("customers")
          .select("customer_code, warehouse")
          .eq("customer_code", customerCode)
          .maybeSingle();
      const row = res.data;
      if (row) {
        china =
          row.default_china_wh ||
          china ||
          (String(row.warehouse || "").startsWith("CN") ? row.warehouse : "");
        kh = row.default_kh_branch || kh;
      }
    } else if (!china) {
      const mock = MODULES["/customers"].rows.find(
        (c) => c.id === customerCode,
      );
      if (mock && String(mock.warehouse || "").startsWith("CN"))
        china = mock.warehouse;
    }
  } catch {
    // Keep whatever the local fallback produced.
  }
  return { china, kh };
}

async function saveCustomerDefaults(customerCode, patch) {
  if (supabase) {
    const upd = {};
    if ("china" in patch) upd.default_china_wh = patch.china || null;
    if ("kh" in patch) upd.default_kh_branch = patch.kh || null;
    const { error } = await supabase
      .from("customers")
      .update(upd)
      .eq("customer_code", customerCode);
    if (error)
      throw new Error(
        `${error.message} — សូមរត់ SQL migration Warehouse (customers.default_*) សិន`,
      );
    return;
  }
  const map = lsRead(CUSTOMER_WH_KEY, {});
  map[customerCode] = { ...(map[customerCode] || {}), ...patch };
  lsWrite(CUSTOMER_WH_KEY, map);
}

async function listCustomersByDefault(kind, code) {
  const out = new Map();
  const local = lsRead(CUSTOMER_WH_KEY, {});
  const nameOf = (cc) =>
    MODULES["/customers"].rows.find((c) => c.id === cc)?.name || "";
  Object.entries(local).forEach(([cc, d]) => {
    if (d[kind] === code) out.set(cc, { customer_code: cc, name: nameOf(cc) });
  });
  if (supabase) {
    const column = kind === "kh" ? "default_kh_branch" : "default_china_wh";
    const { data, error } = await supabase
      .from("customers")
      .select("customer_code, name")
      .eq(column, code);
    if (!error && data) data.forEach((r) => out.set(r.customer_code, r));
  } else if (kind === "china") {
    MODULES["/customers"].rows.forEach((c) => {
      if (c.warehouse === code && !("china" in (local[c.id] || {})))
        out.set(c.id, { customer_code: c.id, name: c.name });
    });
  }
  return [...out.values()];
}

// ---- Change history ----------------------------------------------------
async function logWarehouseChange(entry) {
  const row = {
    entity_type: entry.entity_type,
    ref: entry.ref,
    field: entry.field,
    old_code: entry.old_code || null,
    new_code: entry.new_code || null,
    changed_by: entry.changed_by || "System",
    reason: entry.reason || "",
  };
  if (supabase) {
    const { error } = await supabase.from("warehouse_history").insert(row);
    if (!error) return;
  }
  // UI-only mode, or the table isn't migrated: never lose the record.
  lsWrite(WH_HISTORY_KEY, [
    { ...row, created_at: new Date().toISOString() },
    ...lsRead(WH_HISTORY_KEY, []),
  ]);
}

async function readWarehouseHistory(entityType, ref) {
  let rows = lsRead(WH_HISTORY_KEY, []).filter(
    (h) => h.entity_type === entityType && h.ref === ref,
  );
  if (supabase) {
    const { data, error } = await supabase
      .from("warehouse_history")
      .select("*")
      .eq("entity_type", entityType)
      .eq("ref", ref)
      .order("created_at", { ascending: false });
    if (!error && data) rows = [...data, ...rows];
  }
  return rows;
}

// ---- Orders: lookup + route change ---------------------------------------
async function findOrderByNo(orderNo) {
  if (!orderNo) return null;
  const local = readLocalOrders().find((o) => o.order_no === orderNo) || null;
  if (!supabase) return local;
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("order_no", orderNo)
    .maybeSingle();
  return data || local;
}

async function updateOrderRoute(order, patch) {
  if (!supabase || String(order.id).startsWith("local-")) {
    writeLocalOrders(
      readLocalOrders().map((o) =>
        o.id === order.id ? { ...o, ...patch } : o,
      ),
    );
    return { ...order, ...patch };
  }
  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", order.id)
    .select("*")
    .single();
  if (error)
    throw new Error(
      /china_wh_code|kh_branch_code/.test(error.message || "")
        ? "orders.china_wh_code / kh_branch_code មិនទាន់មាន — សូមរត់ SQL migration Warehouse សិន"
        : error.message,
    );
  return data;
}

function WhLabel({ code }) {
  const { rows } = useWarehouses();
  return <>{code ? whName(rows, code) : "—"}</>;
}

function WarehouseSelect({
  label,
  hint,
  type,
  value,
  onChange,
  list,
  disabled,
}) {
  const options = list.filter(
    (w) => w.type === type && (w.status === "Active" || w.code === value),
  );
  return (
    <div>
      <label className={LABEL_CLS}>
        {label} <span className="text-signal-red">*</span>
      </label>
      {hint && <p className="text-[11px] text-ink-600/50 mb-1">{hint}</p>}
      <select
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLS}
      >
        <option value="">— ជ្រើសរើស —</option>
        {options.map((w) => (
          <option key={w.code} value={w.code} disabled={w.status !== "Active"}>
            {w.code} · {w.name}
            {w.status !== "Active" ? " (Disabled)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// Shows an Order's route (China Warehouse → Cambodia Branch) and lets an
// authorized user set / change it. Every change needs a reason and is
// written to warehouse_history; the order's TKs follow the order.
function OrderRouteCard({ order, onUpdated }) {
  const { user } = useAuth();
  const { rows: list } = useWarehouses();
  const { packages, upsertPackage } = usePackageTracking();
  const missing = !order.china_wh_code || !order.kh_branch_code;
  const canEdit =
    hasPermission(user, "order.change_branch") ||
    (missing && hasPermission(user, "tk.manage_inbound"));
  const orderTks = packages.filter(
    (p) => order.order_no && p.order_no === order.order_no,
  );
  const chinaLocked = !!order.china_wh_code && orderTks.length > 0;
  const [editing, setEditing] = useState(false);
  const [china, setChina] = useState(order.china_wh_code || "");
  const [kh, setKh] = useState(order.kh_branch_code || "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setChina(order.china_wh_code || "");
    setKh(order.kh_branch_code || "");
    setReason("");
    setError("");
    setEditing(missing && canEdit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.china_wh_code, order.kh_branch_code]);

  async function save() {
    setError("");
    const problem = validateOrderRoute(china, kh, list);
    if (problem) return setError(problem);
    const changedChina = china !== (order.china_wh_code || "");
    const changedKh = kh !== (order.kh_branch_code || "");
    if (!changedChina && !changedKh) return setEditing(false);
    if (!missing && !reason.trim())
      return setError("សូមបញ្ចូលមូលហេតុនៃការប្តូរ (Reason)");
    setSaving(true);
    try {
      const by = user?.name || "Admin";
      const why = reason.trim() || "Initial assignment";
      const updated = await updateOrderRoute(order, {
        china_wh_code: china,
        kh_branch_code: kh,
      });
      if (changedChina)
        await logWarehouseChange({
          entity_type: "order",
          ref: order.order_no,
          field: "china_wh",
          old_code: order.china_wh_code,
          new_code: china,
          changed_by: by,
          reason: why,
        });
      if (changedKh)
        await logWarehouseChange({
          entity_type: "order",
          ref: order.order_no,
          field: "kh_branch",
          old_code: order.kh_branch_code,
          new_code: kh,
          changed_by: by,
          reason: why,
        });
      for (const p of orderTks) {
        if (p.status === "Completed") continue;
        await upsertPackage({
          tk: p.tk,
          origin_wh_code: china,
          dest_branch_code: kh,
          ...(changedChina ? { warehouse: china } : {}),
        });
      }
      onUpdated?.({ ...order, ...updated });
      setEditing(false);
    } catch (err) {
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-mist-200 rounded-md bg-white p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-600/55">
          Route · China Warehouse → Cambodia Branch
        </span>
        {!editing && canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-signal-blue hover:underline"
          >
            {missing ? "កំណត់ Warehouse" : "ប្តូរ Warehouse / Branch"}
          </button>
        )}
      </div>
      {!editing ? (
        <div className="flex items-center gap-2 flex-wrap text-ink-900">
          {order.china_wh_code ? (
            <span>{whName(list, order.china_wh_code)}</span>
          ) : (
            <span className="text-signal-red">
              China Warehouse: មិនទាន់កំណត់
            </span>
          )}
          <ArrowRight size={13} className="text-ink-600/40" />
          {order.kh_branch_code ? (
            <span>{whName(list, order.kh_branch_code)}</span>
          ) : (
            <span className="text-signal-red">
              Cambodia Branch: មិនទាន់កំណត់
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {error && <p className="text-xs text-signal-red">{error}</p>}
          <WarehouseSelect
            label="China Warehouse"
            hint="Where should your supplier send the goods?"
            type="china"
            value={china}
            onChange={setChina}
            list={list}
            disabled={chinaLocked}
          />
          {chinaLocked && (
            <p className="text-[11px] text-ink-600/50">
              មិនអាចប្តូរ China Warehouse បានទេ ព្រោះ Order នេះមាន TK
              ចូលឃ្លាំងរួចហើយ
            </p>
          )}
          <WarehouseSelect
            label="Cambodia Receiving Branch"
            hint="Where will you receive your goods?"
            type="cambodia"
            value={kh}
            onChange={setKh}
            list={list}
          />
          {!missing && (
            <div>
              <label className={LABEL_CLS}>មូលហេតុ (Reason) *</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ឧ. Customer requested different receiving location"
                className={INPUT_CLS}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="text-sm font-medium bg-signal-blue text-white px-3 py-1.5 rounded-md disabled:opacity-60"
            >
              {saving ? "កំពុងSave..." : "Save"}
            </button>
            {!(missing && canEdit) && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm text-ink-700 px-3 py-1.5 rounded-md hover:bg-mist-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Read-only route + change history for the Order Detail page.
function OrderRouteInfo({ orderNo }) {
  const { rows: list } = useWarehouses();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let alive = true;
    findOrderByNo(orderNo).then(async (o) => {
      if (!alive) return;
      setOrder(o);
      if (o?.order_no) {
        const h = await readWarehouseHistory("order", o.order_no);
        if (alive) setHistory(h);
      }
    });
    return () => {
      alive = false;
    };
  }, [orderNo]);

  if (!order) return null;
  return (
    <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
      <h2 className="font-display font-bold text-sm text-ink-900 mb-4">
        Route
      </h2>
      <InfoGrid
        items={[
          {
            label: "Origin (China Warehouse)",
            value: order.china_wh_code
              ? whName(list, order.china_wh_code)
              : "—",
            span: true,
          },
          {
            label: "Destination (Cambodia Branch)",
            value: order.kh_branch_code
              ? whName(list, order.kh_branch_code)
              : "—",
            span: true,
          },
        ]}
      />
      {history.length > 0 && (
        <div className="mt-4 border-t border-mist-100 pt-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-600/55">
            Warehouse Change History
          </div>
          {history.map((h, i) => (
            <div key={i} className="text-xs text-ink-700">
              <div>
                {h.field === "china_wh" ? "China WH" : "Branch"}:{" "}
                <span className="text-ink-600/60">{h.old_code || "—"}</span> →{" "}
                <b>{h.new_code || "—"}</b>
              </div>
              <div className="text-ink-600/50">
                {h.changed_by} · {formatIso(h.created_at)}
                {h.reason ? ` · ${h.reason}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Product photos ---------------------------------------------------
// Photos are downscaled in the browser (max 1280px JPEG) so a phone photo
// doesn't become 8 MB. Stored in IndexedDB (localStorage would overflow),
// and also uploaded to the "cargo-photos" bucket + cargo_photos table
// when Supabase is configured.
function compressImage(file, maxSide = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("មិនអាចអានរូបភាពនេះបានទេ"));
    };
    img.src = url;
  });
}

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("IndexedDB មិនអាចប្រើបាន"));
    const req = indexedDB.open("cargo_bridge_photos", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("photos", { keyPath: "tk" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePhotosLocal(meta, photos) {
  const db = await openPhotoDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put({ ...meta, photos });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadPhotosLocal(tk) {
  const db = await openPhotoDb();
  const rec = await new Promise((resolve, reject) => {
    const req = db.transaction("photos").objectStore("photos").get(tk);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rec?.photos || [];
}

async function uploadPhotosRemote(meta, photos) {
  for (const p of photos) {
    const blob = await (await fetch(p.dataUrl)).blob();
    const path = `${meta.tk}/${p.id}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("cargo-photos")
      .upload(path, blob, { contentType: "image/jpeg" });
    if (upErr) throw upErr;
    const { error } = await supabase.from("cargo_photos").insert({
      package_id: meta.package_id || null,
      tk: meta.tk,
      customer_id: meta.customer_id,
      order_no: meta.order_no,
      category: p.category,
      storage_path: path,
    });
    if (error) throw error;
  }
}

async function loadPhotosRemote(tk) {
  const { data, error } = await supabase
    .from("cargo_photos")
    .select("*")
    .eq("tk", tk)
    .order("created_at");
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    category: r.category,
    name: r.storage_path,
    dataUrl: supabase.storage.from("cargo-photos").getPublicUrl(r.storage_path)
      .data.publicUrl,
    addedAt: r.created_at,
  }));
}

// Always keeps a local copy; also uploads when Supabase is configured.
// Returns a warning string if the remote upload failed (the TK itself is
// still saved — staff can see the problem instead of a silent loss).
async function savePhotos(meta, photos) {
  let warning = "";
  try {
    await savePhotosLocal(meta, photos);
  } catch (err) {
    warning = `មិនអាចSaveរូបភាពក្នុង browser បានទេ: ${err.message}`;
  }
  if (supabase) {
    try {
      await uploadPhotosRemote(meta, photos);
      warning = "";
    } catch (err) {
      warning = `Upload រូបភាពទៅ Supabase មិនបានជោគជ័យ: ${err.message}`;
    }
  }
  return warning;
}

async function loadPhotos(tk) {
  if (supabase) {
    const remote = await loadPhotosRemote(tk).catch(() => []);
    if (remote.length) return remote;
  }
  return loadPhotosLocal(tk).catch(() => []);
}

const PACKAGE_DETAILS = {}; // live data only — nothing hard-coded

// ------------------------------------------------------------
// lib/usePersistentState.js
// ------------------------------------------------------------
// Same shape as useState, but backed by localStorage — so refreshing the
// page (or Vite's dev server reloading) doesn't wipe out everything
// that's been Scan'd/created in UI-only mode. Once Supabase is connected,
// data lives there instead and this is just a warm first paint.
function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw != null) return JSON.parse(raw);
      } catch {
        // Corrupted/unavailable storage — fall through to initialValue.
      }
    }
    return typeof initialValue === "function" ? initialValue() : initialValue;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage full/unavailable (e.g. private browsing) — the UI still
      // works for this session, it just won't survive a refresh.
    }
  }, [key, state]);

  return [state, setState];
}

// ------------------------------------------------------------
// context/PackageTrackingContext.jsx
// ------------------------------------------------------------
// Every TK lives in ONE shared registry here instead of three separate,
// disconnected mock tables — Packages / TK, Inbound Origin and Outbound
// Origin all read and write the same record, keyed by `tk`. Scanning a TK
// on Inbound Origin creates/updates that record with status
// "Inbound Origin"; that's immediately what Packages / TK shows for it.
// Pushing it through Outbound Origin (either the Outbound Origin scan
// form, or "Advance" on the Package Detail page) updates that same
// record's status to "Outbound Origin", which is what makes it appear in
// the Outbound Origin list — same TK, same status, everywhere it's shown.
// UI-only for now (see advanceTimeline above); once Inbound/Outbound
// scanning writes to Supabase directly, this registry can just read from
// a `packages` table keyed by `tk` instead. Persisted to localStorage (see
// usePersistentState above) so it survives a page refresh too.
const PackageTrackingContext = createContext(null);

function initialPackageTimelines() {
  const map = {};
  Object.entries(PACKAGE_DETAILS).forEach(([tk, d]) => {
    map[tk] = d.timeline;
  });
  return map;
}

// Real columns on the `packages` table (see the workflow migration) — any
// other key on `values` (e.g. a stage form's `supplier`/`method`/`location`)
// is history for that stage's own table (inbound_origin/outbound_origin/
// sorting), not something to write onto the shared package row itself.
const PACKAGE_TABLE_COLUMNS = [
  "tk",
  "customer",
  "customer_id",
  "order_id",
  "shipment_id",
  "weight",
  "cbm",
  "warehouse",
  "status",
  "outboundAt",
  "exception",
  // Cargo / freight / inbound fields (see lib/cargo.js migration notes)
  "order_no",
  "product_name",
  "cargo_type",
  "size_class",
  "length_cm",
  "width_cm",
  "height_cm",
  "weight_kg",
  "pricing_method",
  "rate",
  "freight_fee",
  "freight_overridden",
  "paid_amount",
  "origin_wh_code",
  "dest_branch_code",
  "inbound_status",
  "inbound_at",
  "container_no",
  "package_count",
  "created_by",
  "updated_by",
  "updated_at",
];

function pickPackageFields(values) {
  const out = {};
  for (const key of PACKAGE_TABLE_COLUMNS) {
    if (values[key] !== undefined) out[key] = values[key];
  }
  return out;
}

function PackageTrackingProvider({ children }) {
  // Department / warehouse data scope + permission guard for TK actions.
  const { user: scopeUser } = useAuth();
  const { rows: scopeWhRows } = useWarehouses();
  const scopeRoles = useRoles();
  const [timelines, setTimelines] = usePersistentState(
    "cargo_bridge_timelines",
    initialPackageTimelines,
  );
  // Local cache of the shared TK registry — seeded from localStorage for a
  // warm first paint in UI-only mode, then overwritten with the real
  // `packages` table the moment Supabase is configured (see refetch below).
  // This is what keeps Packages / TK, Inbound Origin, Outbound Origin and
  // Sorting showing the *same* record instead of separate copies.
  const [packages, setPackages] = usePersistentState(
    "cargo_bridge_packages",
    [],
  );
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(!supabase); // first fetch finished
  // Append-only status log per TK (Status / time / user / remark) — never
  // overwritten; every status change adds a row.
  const [statusHistory, setStatusHistory] = usePersistentState(
    "cargo_bridge_status_history",
    {},
  );

  const refetch = React.useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    setLoading(false);
    setReady(true);
    if (!error && data) setPackages(data);
    // On error (e.g. RLS not configured yet), keep whatever's cached rather
    // than blanking the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  function getTimeline(tk) {
    return timelines[tk] || packageFallbackDetail(tk).timeline;
  }

  const historyKey = (tk) =>
    String(tk || "")
      .trim()
      .toLowerCase();

  function getHistory(tk) {
    return statusHistory[historyKey(tk)] || [];
  }

  function logStatus(tk, status, userName, remark) {
    const entry = {
      status,
      at: new Date().toISOString(),
      user: userName || "System",
      remark: remark || "",
    };
    setStatusHistory((prev) => ({
      ...prev,
      [historyKey(tk)]: [...(prev[historyKey(tk)] || []), entry],
    }));
    if (supabase) {
      // Best-effort mirror to the status_history table.
      supabase
        .from("status_history")
        .insert({ tk, status, remark: entry.remark, created_by: entry.user })
        .then(
          () => {},
          () => {},
        );
    }
  }

  function findPackage(tk) {
    const key = String(tk || "")
      .trim()
      .toLowerCase();
    return packages.find((p) => String(p.tk).trim().toLowerCase() === key);
  }

  // Creates the TK if it's new, or merges these fields onto it if it
  // already exists — this is what keeps Packages / TK, Inbound Origin and
  // Outbound Origin showing the *same* record instead of three copies.
  // Writes straight to the `packages` table (source of truth) when
  // Supabase is configured; falls back to local-only state in UI-only mode.
  async function upsertPackage(values) {
    const tk = String(values.tk || "").trim();
    if (!tk) throw new Error("TK Number ត្រូវការ");

    if (supabase) {
      const existing = findPackage(tk);
      const fields = pickPackageFields(values);
      let saved;
      if (existing) {
        const { data, error } = await supabase
          .from("packages")
          .update(fields)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase
          .from("packages")
          .insert({ ...fields, tk })
          .select("*")
          .single();
        if (error) {
          throw new Error(
            error.code === "23505"
              ? `TK "${tk}" មានរួចហើយក្នុងប្រព័ន្ធ`
              : error.message,
          );
        }
        saved = data;
      }
      setPackages((prev) => {
        const idx = prev.findIndex((p) => p.id === saved.id);
        if (idx === -1) return [saved, ...prev];
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      return saved;
    }

    // UI-only fallback (no Supabase configured): keep the previous
    // local-only upsert-by-tk behaviour so the app still feels alive.
    const key = tk.toLowerCase();
    let merged = null;
    setPackages((prev) => {
      const idx = prev.findIndex(
        (p) => String(p.tk).trim().toLowerCase() === key,
      );
      if (idx === -1) {
        merged = { ...values, tk };
        return [merged, ...prev];
      }
      merged = { ...prev[idx], ...values, tk: prev[idx].tk };
      const next = [...prev];
      next[idx] = merged;
      return next;
    });
    return merged;
  }

  // Super Admin only (enforced in the UI): removes the TK row plus its
  // local timeline / status log. Supabase is the source of truth when set.
  async function deletePackage(tk) {
    requirePermission(scopeUser, "tk.delete"); // guard the action itself
    const key = String(tk || "")
      .trim()
      .toLowerCase();
    const existing = findPackage(tk);
    if (supabase && existing?.id) {
      const { data, error } = await supabase
        .from("packages")
        .delete()
        .eq("id", existing.id)
        .select("id");
      if (error) throw error;
      // RLS blocks a delete silently (0 rows, no error) — treat as failure.
      if (!data?.length)
        throw new Error("Server មិនអនុញ្ញាតឱ្យលុបទេ (គ្មានសិទ្ធិ Super Admin)");
    }
    setPackages((prev) =>
      prev.filter((p) => String(p.tk).trim().toLowerCase() !== key),
    );
    setTimelines((prev) => {
      const next = { ...prev };
      delete next[tk];
      return next;
    });
    setStatusHistory((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function advance(tk, proceedBy) {
    const current = getTimeline(tk);
    const next = advanceTimeline(current, proceedBy);
    setTimelines((prev) => ({ ...prev, [tk]: next }));

    // Keep the shared record's `status` in sync with wherever the
    // timeline now sits — its newly-"active" step, or the last step once
    // every stage is done. That's the same "current stage" already shown
    // on the Package Detail badge/timeline, and it's what the Outbound
    // Origin (and later) list pages filter on. The previous version set
    // `status` to whichever step had just been marked "done" instead —
    // one stage behind — so a TK advanced here would show the right
    // stage on its own detail page but never appear on those lists.
    const newActiveStep = next.find((step) => step.state === "active");
    const newStatus = newActiveStep
      ? newActiveStep.label
      : next[next.length - 1].label;
    logStatus(tk, newStatus, proceedBy);

    // Reaching "Outbound Origin" here is the same event as a real Outbound
    // Origin scan — push the same status/timestamp onto the shared record.
    upsertPackage(
      newStatus === "Outbound Origin"
        ? { tk, status: newStatus, outboundAt: formatNowTimestamp() }
        : { tk, status: newStatus },
    );
  }

  // Jumps the timeline straight to `status` and syncs the shared record
  // to match — used by scan flows (e.g. Verify Scan Arrived) that set a
  // package's status directly via upsertPackage rather than stepping
  // through advance() one stage at a time. advance() only moves the
  // timeline's CURRENT "active" step forward by one, so if a TK's status
  // was ever set directly (any scan-to-list form does this) without its
  // timeline being kept in step, advance() silently moves the wrong step
  // instead of reaching `status`. This instead rebuilds the timeline from
  // PACKAGE_STAGES itself: every stage before `status` becomes "done"
  // (keeping its real timestamp/who if it already had one), `status`
  // becomes the new "active" step and is immediately stamped with who
  // just scanned it in (not left blank until some later step marks it
  // "done"), and everything after stays pending — so the Package Detail
  // timeline always matches the record's real status, regardless of how
  // it got there.
  function syncTimelineToStatus(tk, status, proceedBy, remark) {
    const targetIndex = PACKAGE_STAGES.indexOf(status);
    if (targetIndex === -1) return;
    const current = getTimeline(tk);
    const now = formatNowTimestamp();
    const next = PACKAGE_STAGES.map((label, i) => {
      if (i < targetIndex) {
        const prev = current[i];
        return {
          label,
          time: prev?.state === "done" ? prev.time : now,
          state: "done",
          proceedBy:
            prev?.state === "done"
              ? prev.proceedBy || "System Automation"
              : proceedBy || "System Automation",
        };
      }
      if (i === targetIndex) {
        // The scan/confirm that brought the package to `status` is what
        // just happened — stamp both who did it AND when, right away,
        // instead of leaving an in-progress stage as "Proceed By: NA"
        // with no date until some later step marks it "done".
        const carriedTime =
          current[i]?.state === "active" ? current[i]?.time || now : now;
        const carriedProceedBy =
          current[i]?.state === "active" && current[i]?.proceedBy
            ? current[i].proceedBy
            : proceedBy || null;
        return {
          label,
          time: carriedTime,
          state: "active",
          proceedBy: carriedProceedBy,
        };
      }
      return { label, time: null, state: "pending", proceedBy: null };
    });
    setTimelines((prev) => ({ ...prev, [tk]: next }));
    upsertPackage({ tk, status });
    logStatus(tk, status, proceedBy, remark);
  }

  // Moves a TK's Inbound Status (Pending → Received → Measuring → Checked
  // → Ready for Shipment, or Exception) and records it in the history.
  async function updateInboundStatus(tk, status, userName, remark) {
    if (status === "Exception" && !String(remark || "").trim())
      throw new Error("សូមបញ្ចូល Remark សម្រាប់ Exception");
    const existing = findPackage(tk);
    await upsertPackage({
      tk,
      inbound_status: status,
      updated_by: userName,
      updated_at: new Date().toISOString(),
      ...(status === "Exception"
        ? { exception: { type: "Inbound Exception", detail: remark.trim() } }
        : existing?.exception?.type === "Inbound Exception"
          ? { exception: null }
          : {}),
    });
    logStatus(tk, status, userName, remark);
  }

  // Everything outside this provider only ever sees TKs in the user's scope
  // (internal logic above keeps using the full registry).
  const scopeCodes = scopeWarehouseCodes(scopeUser, scopeWhRows);
  const scopedPackages = React.useMemo(
    () =>
      scopeCodes === null
        ? packages
        : packages.filter((p) => rowInScope(p, scopeCodes)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      packages,
      scopeRoles,
      scopeUser?.role,
      scopeUser?.department,
      scopeUser?.warehouse,
      scopeWhRows,
    ],
  );

  return (
    <PackageTrackingContext.Provider
      value={{
        getTimeline,
        syncTimelineToStatus,
        getHistory,
        logStatus,
        updateInboundStatus,
        advance,
        packages: scopedPackages,
        findPackage: (tk) => {
          const p = findPackage(tk);
          return p && rowInScope(p, scopeCodes) ? p : undefined;
        },
        upsertPackage,
        deletePackage,
        loading,
        ready,
        refetch,
      }}
    >
      {children}
    </PackageTrackingContext.Provider>
  );
}

function usePackageTracking() {
  const ctx = useContext(PackageTrackingContext);
  if (!ctx)
    throw new Error(
      "usePackageTracking must be used within PackageTrackingProvider",
    );
  return ctx;
}

const CONTAINER_DETAILS = {}; // live data only — nothing hard-coded

const ORDER_STAGES = [
  "Order Placed",
  "Confirmed",
  "Processing",
  "Packed",
  "Arrived Destination",
  "Delivered",
];

// Order & Product detail for the Order Detail page — keyed by Order ID.
// `uid` is the numeric account UID shown in the Transfer Order modal
// (separate from the KH-000xxx Customer ID used elsewhere); swap for a
// real "orders where id = :id" + "order_items" query later.
const ORDER_DETAILS = {}; // live data only — nothing hard-coded

// ------------------------------------------------------------
// lib/customerLookup.js
// ------------------------------------------------------------
// Shared "Transfer Type" search used by both the per-Order "Transfer
// Order" modal and the /customer-transfer "New Transfer" modal — look
// a customer up by UID (Customer ID), Name, or Phone and get back the
// same account, so both flows show the same Information card.
const TRANSFER_TYPES = [
  { value: "uid", label: "UID" },
  { value: "name", label: "Name" },
  { value: "phone", label: "Phone" },
];

// Accepts either the numeric "UID" style (887) or the full Customer ID
// (KH-000582) — whichever the rest of the app is using for this lookup.
// UI-only fallback only — real (Supabase-backed) lookups go through
// useCustomerLookup below, which queries the live customers table
// instead of this mock array.
function findCustomerInMockRows(type, raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  const rows = MODULES["/customers"].rows;
  if (type === "uid") {
    return rows.find((c) => {
      const idLower = c.id.toLowerCase();
      const numericUid = c.id.replace(/[^\d]/g, "");
      return idLower === q || idLower.includes(q) || numericUid === q;
    });
  }
  if (type === "phone") {
    const digits = q.replace(/[^\d]/g, "");
    if (!digits) return null;
    return rows.find((c) => c.phone.replace(/[^\d]/g, "").includes(digits));
  }
  return rows.find((c) => c.name.toLowerCase().includes(q));
}

// Debounced customer lookup shared by both transfer modals. When
// Supabase is connected this queries the REAL `customers` table (the
// same one /customers reads from) instead of the mock rows, so it
// finds whatever accounts actually exist in the database — including
// UUID-style ids like the ones shown on the live Customers page.
function useCustomerLookup(transferType, query) {
  const [matched, setMatched] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    clearTimeout(timerRef.current);

    if (!q) {
      setMatched(null);
      setLoading(false);
      return;
    }

    if (!supabase) {
      // UI-only mode — no live database to query.
      setMatched(findCustomerInMockRows(transferType, q));
      setLoading(false);
      return;
    }

    setLoading(true);
    const myRequestId = ++requestId.current;
    timerRef.current = setTimeout(async () => {
      try {
        // Same `customer_code` → `id` aliasing as the /customers list
        // (see CUSTOMERS_DISPLAY_SELECT) — the sequential Customer ID
        // lives in `customer_code`, not the uuid primary key.
        let req = supabase
          .from("customers")
          .select("id:customer_code, name, phone, uuid:id");
        if (transferType === "phone") {
          const digits = q.replace(/[^\d]/g, "");
          req = digits
            ? req.ilike("phone", `%${digits}%`)
            : req.eq("customer_code", "");
        } else if (transferType === "uid") {
          req = req.ilike("customer_code", `%${q}%`);
        } else {
          req = req.ilike("name", `%${q}%`);
        }
        const { data, error } = await req.limit(1).maybeSingle();
        if (myRequestId !== requestId.current) return; // stale response
        setMatched(error ? null : data || null);
      } catch {
        if (myRequestId === requestId.current) setMatched(null);
      } finally {
        if (myRequestId === requestId.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [transferType, query]);

  return { matched, loading };
}

// ------------------------------------------------------------
// lib/useCustomerSearch.js
// ------------------------------------------------------------
// Live typeahead against the real `customers` table — returns up to 8
// candidates *with their real uuid* (not just the display code), so
// callers that need to write a proper `customer_id` foreign key (Package
// / Order creation) have it. UI-only mode falls back to the mock rows.
function useCustomerSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    clearTimeout(timerRef.current);
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (!supabase) {
      const rows = MODULES["/customers"].rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          c.id.toLowerCase().includes(q.toLowerCase()),
      );
      setResults(
        rows.map((r) => ({
          id: r.id,
          customer_code: r.id,
          name: r.name,
          phone: r.phone,
        })),
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    const myRequestId = ++requestId.current;
    timerRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, customer_code, name, phone")
          .or(`name.ilike.%${q}%,customer_code.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(8);
        if (myRequestId !== requestId.current) return;
        setResults(error || !data ? [] : data);
      } catch {
        if (myRequestId === requestId.current) setResults([]);
      } finally {
        if (myRequestId === requestId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { results, loading };
}

// Search-and-select Customer picker — used wherever a form needs to link
// to a real customer row (Package / Order creation) rather than just
// showing a free-text name.
// `strict` (New TK): the Customer ID must already exist — an unknown ID
// shows "Customer Not Found" and the TK can't be created for it.
function CustomerPicker({
  value,
  onChange,
  label = "Customer",
  strict = false,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, loading } = useCustomerSearch(query);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
        {label} <span className="text-signal-red">*</span>
      </label>
      {value ? (
        <div className="flex items-center justify-between border border-mist-200 rounded-md px-3 py-2 text-sm bg-mist-50">
          <span className="font-medium text-ink-900">
            {value.customer_code} · {value.name}
            {strict && (
              <span className="flex items-center gap-1 text-xs font-normal text-signal-teal mt-0.5">
                <Check size={12} strokeWidth={3} />
                Customer verified
                {value.phone ? (
                  <span className="text-ink-600/50"> · {value.phone}</span>
                ) : null}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-ink-600/50 hover:text-signal-red"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Searchតាម ID, ឈ្មោះ ឬPhone number..."
            className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
          />
          {open && query && (loading || results.length > 0 || !strict) && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-mist-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {loading ? (
                <SkeletonDropdownRows />
              ) : results.length > 0 ? (
                results.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      onChange(c);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-mist-50"
                  >
                    <span className="font-medium text-ink-900">
                      {c.customer_code}
                    </span>
                    <span className="text-ink-600/55"> · {c.name}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-ink-600/45">
                  {strict
                    ? "Customer Not Found"
                    : "Customer not found — សូមបង្កើតនៅ Customers page សិន"}
                </p>
              )}
            </div>
          )}
          {strict && query && !loading && results.length === 0 && (
            <CustomerNotFound query={query} />
          )}
        </>
      )}
    </div>
  );
}

// Existing Orders that belong to a given Customer (orders.customer_id) —
// used by OrderPicker below so a Package can be attached to one of them.
// UI-only mode reads the local order registry (see lib/cargo.js).
function useCustomerOrders(customerId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(!!supabase && !!customerId);

  const refetch = React.useCallback(async () => {
    if (!customerId) {
      setOrders([]);
      return;
    }
    if (!supabase) {
      setOrders(readLocalOrders().filter((o) => o.customer_id === customerId));
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (!error && data) setOrders(data);
  }, [customerId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { orders, loading, refetch };
}

function orderLabel(o) {
  return o.order_no || `Order · ${String(o.id).slice(0, 8)}`;
}

// Lets the Package creation form pick an existing Order for the selected
// Customer, or create a new one inline. The Order ID (THN######) is
// generated automatically and can't be typed or edited — an Order always
// belongs to exactly one Customer and one Customer can have many Orders.
function OrderPicker({ customer, value, onChange }) {
  const { orders, loading, refetch } = useCustomerOrders(customer?.id);
  const [creating, setCreating] = useState(false);
  const [platform, setPlatform] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { rows: whList } = useWarehouses();
  const [china, setChina] = useState("");
  const [kh, setKh] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  const canSetDefault = hasPermission(user, "order.change_branch");

  // Pre-select the customer's default locations (only if still Active);
  // they can be changed for THIS order without touching the default.
  async function startCreating() {
    setCreating(true);
    setError("");
    setSaveDefault(false);
    const d = await readCustomerDefaults(customer.customer_code);
    setChina(
      (prev) => prev || (whIsActive(whList, d.china, "china") ? d.china : ""),
    );
    setKh((prev) => prev || (whIsActive(whList, d.kh, "cambodia") ? d.kh : ""));
  }

  if (!customer) {
    return (
      <div className="text-xs text-ink-600/45 border border-dashed border-mist-200 rounded-md px-3 py-2">
        សូមផ្ទៀងផ្ទាត់ Customer ID សិន ដើម្បីមើល/Create Order
      </div>
    );
  }

  async function handleCreateOrder() {
    setSaving(true);
    setError("");
    try {
      const problem = validateOrderRoute(china, kh, whList);
      if (problem) throw new Error(problem);
      const route = { china, kh };
      const order = supabase
        ? await createOrderRemote(customer, platform, route)
        : createLocalOrder(customer, platform, route);
      if (saveDefault && canSetDefault) {
        const old = await readCustomerDefaults(customer.customer_code);
        await saveCustomerDefaults(customer.customer_code, { china, kh });
        const by = user?.name || "Admin";
        if (old.china !== china)
          await logWarehouseChange({
            entity_type: "customer",
            ref: customer.customer_code,
            field: "default_china_wh",
            old_code: old.china,
            new_code: china,
            changed_by: by,
            reason: `Saved as default while creating ${order.order_no}`,
          });
        if (old.kh !== kh)
          await logWarehouseChange({
            entity_type: "customer",
            ref: customer.customer_code,
            field: "default_kh_branch",
            old_code: old.kh,
            new_code: kh,
            changed_by: by,
            reason: `Saved as default while creating ${order.order_no}`,
          });
      }
      onChange(order);
      refetch();
      setCreating(false);
      setPlatform("");
      setChina("");
      setKh("");
    } catch (err) {
      setError(err.message || "មិនអាចCreate Order បានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className={LABEL_CLS}>
        Order ID <span className="text-signal-red">*</span>
      </label>
      {value ? (
        <>
          <div className="flex items-center justify-between border border-mist-200 rounded-md px-3 py-2 text-sm bg-mist-50">
            <span className="font-medium text-ink-900">
              {orderLabel(value)}
              {value.platform ? ` (${value.platform})` : ""}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-ink-600/50 hover:text-signal-red"
            >
              <X size={14} />
            </button>
          </div>
          <OrderRouteCard order={value} onUpdated={onChange} />
        </>
      ) : creating ? (
        <div className="border border-mist-200 rounded-md p-3 space-y-2">
          {error && <p className="text-xs text-signal-red">{error}</p>}
          <p className="text-xs text-ink-600/50">
            Order ID (THN######) នឹងត្រូវបានបង្កើតស្វ័យប្រវត្តិ
          </p>
          <input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="Platform (Taobao, 1688, ...) — ស្រេចចិត្ត"
            className={INPUT_CLS}
          />
          <WarehouseSelect
            label="China Warehouse"
            hint="Where should your supplier send the goods?"
            type="china"
            value={china}
            onChange={setChina}
            list={whList}
          />
          <WarehouseSelect
            label="Cambodia Receiving Branch"
            hint="Where will you receive your goods?"
            type="cambodia"
            value={kh}
            onChange={setKh}
            list={whList}
          />
          {canSetDefault && (
            <label className="flex items-center gap-2 text-xs text-ink-700">
              <input
                type="checkbox"
                checked={saveDefault}
                onChange={(e) => setSaveDefault(e.target.checked)}
              />
              ដាក់ជា Default របស់ Customer នេះ (មិនប៉ះពាល់ Order ចាស់)
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleCreateOrder}
              className="text-sm font-medium bg-signal-blue text-white px-3 py-1.5 rounded-md disabled:opacity-60"
            >
              {saving ? "កំពុងបង្កើត..." : "Create Order"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setChina("");
                setKh("");
              }}
              className="text-sm text-ink-700 px-3 py-1.5 rounded-md hover:bg-mist-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {loading ? (
            <SkeletonRegion className="space-y-1.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 w-full" delay={i * 80} />
              ))}
            </SkeletonRegion>
          ) : (
            orders.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => onChange(o)}
                className="w-full text-left border border-mist-200 rounded-md px-3 py-2 text-sm hover:bg-mist-50"
              >
                {orderLabel(o)} {o.platform ? `(${o.platform})` : ""} —{" "}
                {o.status}
                <span className="block text-[11px] text-ink-600/50">
                  {o.china_wh_code || "China WH —"} →{" "}
                  {o.kh_branch_code || "Branch —"}
                </span>
              </button>
            ))
          )}
          <button
            type="button"
            onClick={startCreating}
            className="w-full text-left border border-dashed border-mist-200 rounded-md px-3 py-2 text-sm text-signal-blue hover:bg-mist-50"
          >
            + Create New Order
          </button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// components/CustomerNotFound.jsx
// ------------------------------------------------------------
// Shown by CustomerPicker (strict mode) when a Customer ID doesn't exist.
// The TK can't be created — staff are pointed at Admin / Customer Service
// to create the customer first.
function CustomerNotFound({ query }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const canOpenCustomers =
    user?.allowedPaths === "*" ||
    (Array.isArray(user?.allowedPaths) &&
      user.allowedPaths.includes("/customers"));
  const message = `សូមបង្កើត New Customer — Customer ID "${query.trim()}" រកមិនឃើញក្នុងប្រព័ន្ធ (ស្នើដោយ ${
    user?.name || "China Warehouse"
  })`;

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy សារនេះផ្ញើទៅ Admin / Customer Service:", message);
    }
  }

  return (
    <div className="mt-2 border border-signal-red/30 bg-signal-red/5 rounded-md p-3">
      <div className="flex items-start gap-2 text-sm text-signal-red">
        <Icons.UserX size={16} className="shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">Customer Not Found</div>
          <div className="text-signal-red/80 mt-0.5">
            មិនអាចបង្កើត TK បានទេ — TK ត្រូវភ្ជាប់ជាមួយ Customer ID
            ដែលមានស្រាប់។ សូមទាក់ទង Admin ឬ Customer Service ឱ្យបង្កើត Customer
            សិន។
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={copyRequest}
          className="flex items-center gap-1.5 bg-white border border-mist-200 text-sm font-medium text-ink-700 px-3 py-2 rounded-md hover:bg-mist-50"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "បាន Copy សារហើយ" : "Copy សារស្នើសុំ Admin"}
        </button>
        {canOpenCustomers && (
          <Link
            to="/customers"
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3 py-2 rounded-md hover:bg-signal-blue/90"
          >
            <Icons.Users size={14} />
            បើក Customers
          </Link>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/PhotoUploader.jsx
// ------------------------------------------------------------
function PhotoUploader({
  photos,
  setPhotos,
  categories = PHOTO_CATEGORIES,
  emptyHint = "No images yet — ត្រូវការយ៉ាងតិច ១ សន្លឹក",
}) {
  const [category, setCategory] = useState(categories[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const camRef = useRef(null);
  const fileRef = useRef(null);

  async function handleFiles(fileList) {
    setError("");
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    setBusy(true);
    try {
      const added = [];
      for (const f of files) {
        added.push({
          id: makeId(),
          category,
          name: f.name,
          dataUrl: await compressImage(f),
          addedAt: new Date().toISOString(),
        });
      }
      setPhotos((prev) => [...prev, ...added]);
    } catch (err) {
      setError(err.message || "Unable to upload image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <label className={LABEL_CLS}>ប្រភេទរូបភាព</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={INPUT_CLS}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => camRef.current?.click()}
          className="flex items-center justify-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-signal-blue/90 disabled:opacity-60 min-h-[42px]"
        >
          <Icons.Camera size={16} />
          Take photo
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-1.5 bg-white border border-mist-200 text-ink-700 text-sm font-medium px-4 py-2.5 rounded-md hover:bg-mist-50 disabled:opacity-60 min-h-[42px]"
        >
          <Icons.ImagePlus size={16} />
          Upload Photo
        </button>
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-signal-red">{error}</p>}
      {busy && <p className="text-xs text-ink-600/50">Processing image...</p>}

      {photos.length === 0 ? (
        <div className="border border-dashed border-mist-200 rounded-md py-8 flex flex-col items-center text-center">
          <Icons.ImagePlus size={28} className="text-ink-600/20 mb-2" />
          <p className="text-sm text-ink-600/45">{emptyHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {photos.map((p) => (
            <div
              key={p.id}
              className="border border-mist-200 rounded-md overflow-hidden bg-white"
            >
              <div className="relative">
                <img
                  src={p.dataUrl}
                  alt={p.category}
                  className="w-full aspect-square object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPhotos((prev) => prev.filter((x) => x.id !== p.id))
                  }
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-md bg-ink-900/70 text-white flex items-center justify-center hover:bg-signal-red"
                  aria-label="លុបរូបភាព"
                >
                  <Icons.Trash2 size={14} />
                </button>
              </div>
              <select
                value={p.category}
                onChange={(e) =>
                  setPhotos((prev) =>
                    prev.map((x) =>
                      x.id === p.id ? { ...x, category: e.target.value } : x,
                    ),
                  )
                }
                className="w-full text-[11px] px-2 py-1.5 outline-none bg-mist-50 text-ink-700"
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// components/CargoCalculator.jsx
// ------------------------------------------------------------
// Cargo type + size (S/M/L or > L by CBM) + dimensions → the read-only
// calculation card. Everything recomputes on each change; only roles in
// FREIGHT_OVERRIDE_ROLES can override the final fee.
function segBtn(selected) {
  return `flex-1 min-h-[44px] px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
    selected
      ? "bg-signal-blue text-white border-signal-blue"
      : "bg-white text-ink-700 border-mist-200 hover:bg-mist-50"
  }`;
}

function CargoCalculator({
  form,
  setForm,
  calc,
  finalFee,
  canOverride,
  override,
  setOverride,
}) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const dims =
    calc.cbm != null
      ? `${form.length} × ${form.width} × ${form.height} cm`
      : "—";

  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLS}>
          Cargo Type <span className="text-signal-red">*</span>
        </label>
        <div className="flex gap-2">
          {CARGO_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, cargoType: t }))}
              className={segBtn(form.cargoType === t)}
            >
              {t} Cargo
              <span className="block text-[11px] font-normal opacity-75">
                ${CBM_RATES[t]} / CBM
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>
          Size <span className="text-signal-red">*</span>
        </label>
        <div className="flex gap-2">
          {SIZE_CHOICES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm((f) => ({ ...f, sizeClass: s }))}
              className={segBtn(form.sizeClass === s)}
            >
              {s === "OVER" ? "> L" : s}
              <span className="block text-[11px] font-normal opacity-75">
                {s === "OVER" ? "CBM" : money(SIZE_PRICES[s])}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          ["length", "Length (cm)"],
          ["width", "Width (cm)"],
          ["height", "Height (cm)"],
        ].map(([key, label]) => (
          <div key={key}>
            <label className={LABEL_CLS}>
              {label}
              {form.sizeClass === "OVER" && (
                <span className="text-signal-red"> *</span>
              )}
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={form[key]}
              onChange={set(key)}
              className={INPUT_CLS}
              placeholder="0"
            />
          </div>
        ))}
        <div>
          <label className={LABEL_CLS}>Weight (KG)</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.weight}
            onChange={set("weight")}
            className={INPUT_CLS}
            placeholder="12.5"
          />
        </div>
      </div>

      <div className="border border-mist-200 rounded-md bg-mist-50/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-bold text-sm text-ink-900">
            Freight Calculation
          </h4>
          <span className="flex items-center gap-1 text-[11px] text-ink-600/45">
            <Icons.Lock size={12} />
            Auto-calculate
          </span>
        </div>
        <InfoGrid
          items={[
            { label: "Cargo Type", value: form.cargoType || "—" },
            {
              label: "Size",
              value: form.sizeClass ? sizeLabel(form.sizeClass) : "—",
            },
            ...(form.sizeClass === "OVER" || calc.cbm != null
              ? [
                  { label: "Dimension", value: dims },
                  {
                    label: "CBM",
                    value: calc.cbm != null ? `${calc.cbm.toFixed(3)} m³` : "—",
                  },
                ]
              : []),
            {
              label: "Rate",
              value: calc.ok
                ? calc.method === "CBM"
                  ? `$${calc.rate} / CBM`
                  : money(calc.rate)
                : "—",
            },
            {
              label: "Freight Fee",
              value: (
                <span className="text-base font-bold text-signal-blue">
                  {finalFee != null ? money(finalFee) : "—"}
                </span>
              ),
            },
          ]}
        />
        {!calc.ok && (
          <p className="text-xs text-ink-600/50 mt-3">{calc.message}</p>
        )}
        {calc.ok && override.on && (
          <p className="text-xs text-[#B87415] mt-3">
            Override — តម្លៃស្វ័យប្រវត្តិ {money(calc.fee)}
          </p>
        )}

        {canOverride && calc.ok && (
          <div className="mt-3 pt-3 border-t border-mist-200">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={override.on}
                onChange={(e) =>
                  setOverride({
                    on: e.target.checked,
                    value: e.target.checked ? String(calc.fee) : "",
                  })
                }
              />
              Override Freight Fee (Super Admin)
            </label>
            {override.on && (
              <input
                type="number"
                min="0"
                step="any"
                value={override.value}
                onChange={(e) =>
                  setOverride({ on: true, value: e.target.value })
                }
                className={`${INPUT_CLS} mt-2 max-w-[160px]`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/CustomerDetailsCard.jsx
// ------------------------------------------------------------
// Compact "Customer Details" card for the TK detail sidebar — phone,
// email, default receiving address and a quick package count, fetched
// straight from `customers` / `customer_addresses` by customer_id.
function CustomerDetailsCard({ customerId }) {
  const [info, setInfo] = useState(null); // null = loading, false = nothing to show

  useEffect(() => {
    let alive = true;
    setInfo(null);
    if (!supabase || !customerId) {
      setInfo(false);
      return;
    }
    (async () => {
      const [{ data: cust }, { data: addrs }, { count }] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, customer_code, phone, email")
          .eq("id", customerId)
          .maybeSingle(),
        supabase
          .from("customer_addresses")
          .select("address, commune, district, province")
          .eq("customer_id", customerId)
          .order("is_default", { ascending: false })
          .limit(1),
        supabase
          .from("packages")
          .select("id", { count: "exact", head: true })
          .eq("customer_id", customerId),
      ]);
      if (!alive) return;
      setInfo(
        cust
          ? { ...cust, address: addrs?.[0] || null, pkgCount: count ?? 0 }
          : false,
      );
    })();
    return () => {
      alive = false;
    };
  }, [customerId]);

  if (info === false) return null;

  if (info === null) {
    return (
      <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
        <div className="h-4 w-32 bg-mist-100 rounded animate-pulse mb-4" />
        <div className="h-9 w-9 rounded-full bg-mist-100 animate-pulse mb-3" />
        <div className="h-3 w-full bg-mist-100 rounded animate-pulse mb-2" />
        <div className="h-3 w-2/3 bg-mist-100 rounded animate-pulse" />
      </div>
    );
  }

  const addrText = info.address
    ? [
        info.address.address,
        info.address.commune,
        info.address.district,
        info.address.province,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
      <h2 className="flex items-center gap-2 font-display font-bold text-sm text-ink-900 mb-4">
        <Icons.User size={16} className="text-ink-600/60" />
        Customer Information
      </h2>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-signal-blue/10 text-signal-blue flex items-center justify-center text-base font-bold shrink-0">
          {(info.name || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink-900 truncate">
            {info.name || "—"}
          </div>
          <div className="text-xs text-ink-600/50">
            {info.customer_code || "—"}
          </div>
        </div>
        <span className="ml-auto shrink-0 bg-mist-100 text-ink-700 text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap">
          {info.pkgCount} packages
        </span>
      </div>
      <div className="space-y-2">
        {info.phone && (
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <Icons.Phone size={14} className="text-ink-600/40 shrink-0" />
            {info.phone}
          </div>
        )}
        {info.email && (
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <Icons.Mail size={14} className="text-ink-600/40 shrink-0" />
            <span className="truncate">{info.email}</span>
          </div>
        )}
        {addrText && (
          <div className="flex items-start gap-2 text-sm text-ink-700">
            <Icons.MapPin
              size={14}
              className="text-ink-600/40 shrink-0 mt-0.5"
            />
            <span>{addrText}</span>
          </div>
        )}
        {!info.phone && !info.email && !addrText && (
          <div className="text-xs text-ink-600/40">
            មិនទាន់មានព័ត៌មានទំនាក់ទំនងទេ
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoGallery({ tk }) {
  const [photos, setPhotos] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);

  useEffect(() => {
    let alive = true;
    setPhotos(null);
    loadPhotos(tk)
      .then((p) => alive && setPhotos(p))
      .catch(() => alive && setPhotos([]));
    return () => {
      alive = false;
    };
  }, [tk]);

  const active = activeIdx != null && photos ? photos[activeIdx] : null;

  return (
    <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 font-display font-bold text-sm text-ink-900">
          <Icons.Image size={16} className="text-ink-600/60" />
          Product Images
        </h2>
        {photos && (
          <span className="bg-mist-100 text-ink-700 text-xs font-medium px-2 py-1 rounded-md">
            {photos.length} រូប
          </span>
        )}
      </div>
      {photos === null ? (
        <SkeletonPhotoGrid count={3} />
      ) : photos.length === 0 ? (
        <div className="py-8 flex flex-col items-center text-center">
          <Icons.ImageOff size={30} className="text-ink-600/20 mb-2" />
          <p className="text-sm text-ink-600/45">TK នេះNo images yetទេ</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className="text-left border border-mist-200 rounded-md overflow-hidden hover:border-signal-blue"
            >
              <img
                src={p.dataUrl}
                alt={p.category}
                className="w-full aspect-square object-cover"
              />
              <div className="px-2 py-1 text-[10px] text-ink-700 bg-mist-50 truncate">
                {p.category}
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 bg-ink-900/80 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveIdx(null)}
        >
          <div
            className="bg-white rounded-md shadow-lg max-w-3xl w-full max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-mist-200">
              <div className="text-sm font-medium text-ink-900">
                {active.category}
                <span className="text-ink-600/45 font-normal">
                  {" "}
                  — {activeIdx + 1} / {photos.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveIdx(null)}
                className="text-ink-600/40 hover:text-ink-900"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-ink-900/5 flex items-center justify-center">
              <img
                src={active.dataUrl}
                alt={active.category}
                className="max-h-[72vh] max-w-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-mist-200">
              <button
                type="button"
                disabled={activeIdx === 0}
                onClick={() => setActiveIdx((i) => i - 1)}
                className="px-3 py-1.5 text-sm rounded-md border border-mist-200 hover:bg-mist-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={activeIdx >= photos.length - 1}
                onClick={() => setActiveIdx((i) => i + 1)}
                className="px-3 py-1.5 text-sm rounded-md border border-mist-200 hover:bg-mist-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// components/StatusHistoryCard.jsx
// ------------------------------------------------------------
// Append-only log (Status / Date-Time / User / Remark). Stages reached
// before this log existed are filled in from the tracking timeline so
// older TKs still show something. China Warehouse / Admin can also move
// the Inbound Status (Pending → ... → Ready for Shipment) from here.
function StatusHistoryCard({ pkg, timeline }) {
  const { getHistory, updateInboundStatus } = usePackageTracking();
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const logged = getHistory(pkg.tk);
  const loggedStatuses = new Set(logged.map((h) => h.status));
  const fromTimeline = timeline
    .filter(
      (s) => s.state !== "pending" && s.time && !loggedStatuses.has(s.label),
    )
    .map((s) => ({
      status: s.label,
      time: s.time,
      user: s.proceedBy || "System Automation",
      remark: "",
    }));
  const rows = [
    ...fromTimeline,
    ...logged.map((h) => ({
      status: h.status,
      time: formatIso(h.at),
      user: h.user,
      remark: h.remark,
    })),
  ].reverse();

  const canUpdate =
    hasPermission(user, "tk.manage_inbound") &&
    pkg.inbound_status &&
    pkg.status === "Inbound Origin";

  async function handleUpdate() {
    setError("");
    if (!status) return setError("សូមជ្រើសរើស Status");
    setBusy(true);
    try {
      await updateInboundStatus(pkg.tk, status, user?.name || "Admin", remark);
      setStatus("");
      setRemark("");
    } catch (err) {
      setError(err.message || "Unable to update.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-sm text-ink-900">
          Status History
        </h2>
        {pkg.inbound_status && (
          <span className="flex items-center gap-1.5 text-xs text-ink-600/55">
            Inbound Status <StatusBadge label={pkg.inbound_status} />
          </span>
        )}
      </div>

      {canUpdate && (
        <div className="border border-mist-200 rounded-md p-3 mb-4 bg-mist-50/60 space-y-2">
          {error && <p className="text-xs text-signal-red">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${INPUT_CLS} sm:max-w-[200px]`}
            >
              <option value="">Update Inbound Status...</option>
              {INBOUND_STATUSES.filter((s) => s !== pkg.inbound_status).map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Remark (ចាំបាច់សម្រាប់ Exception)"
              className={`${INPUT_CLS} flex-1 min-w-[160px]`}
            />
            <button
              type="button"
              disabled={busy}
              onClick={handleUpdate}
              className="bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
            >
              {busy ? "កំពុង Update..." : "Update"}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-ink-600/45">No history yet.</p>
      ) : (
        <ol className="divide-y divide-mist-100">
          {rows.map((r, i) => (
            <li
              key={i}
              className="py-2.5 flex flex-wrap items-start gap-x-3 gap-y-1"
            >
              <StatusBadge label={r.status} />
              <div className="min-w-0">
                <div className="text-xs text-ink-600/55">
                  {r.time} · {r.user}
                </div>
                {r.remark && (
                  <div className="text-sm text-ink-800 mt-0.5">{r.remark}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// components/AdvancedTkFilters.jsx
// ------------------------------------------------------------
const EMPTY_ADV = {
  inbound: "",
  outbound: "",
  cargo: "",
  size: "",
  warehouse: "",
  from: "",
  to: "",
};

function AdvancedTkFilters({ adv, setAdv, rows }) {
  const warehouses = [...new Set(rows.map((r) => r.warehouse).filter(Boolean))];
  const set = (key) => (e) => setAdv((a) => ({ ...a, [key]: e.target.value }));
  const outboundOptions = ["Not Shipped", ...PACKAGE_STAGES.slice(1)];
  return (
    <div className="px-4 lg:px-5 py-3.5 border-b border-mist-200 bg-mist-50/50">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div>
          <label className={LABEL_CLS}>Inbound Status</label>
          <select
            value={adv.inbound}
            onChange={set("inbound")}
            className={INPUT_CLS}
          >
            <option value="">All</option>
            {INBOUND_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Outbound Status</label>
          <select
            value={adv.outbound}
            onChange={set("outbound")}
            className={INPUT_CLS}
          >
            <option value="">All</option>
            {outboundOptions.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Cargo Type</label>
          <select
            value={adv.cargo}
            onChange={set("cargo")}
            className={INPUT_CLS}
          >
            <option value="">All</option>
            {CARGO_TYPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Size</label>
          <select value={adv.size} onChange={set("size")} className={INPUT_CLS}>
            <option value="">All</option>
            {SIZE_CHOICES.map((s) => (
              <option key={s} value={s}>
                {s === "OVER" ? "> L (CBM)" : s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>China Warehouse</label>
          <select
            value={adv.warehouse}
            onChange={set("warehouse")}
            className={INPUT_CLS}
          >
            <option value="">All</option>
            {warehouses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>ចាប់ពីថ្ងៃ</label>
          <input
            type="date"
            value={adv.from}
            onChange={set("from")}
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>ដល់ថ្ងៃ</label>
          <input
            type="date"
            value={adv.to}
            onChange={set("to")}
            className={INPUT_CLS}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setAdv(EMPTY_ADV)}
            className="w-full text-sm text-ink-700 border border-mist-200 bg-white px-3 py-2 rounded-md hover:bg-mist-50"
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/CreatePackageModal.jsx
// ------------------------------------------------------------
// New TK / Inbound Origin — used by both "Packages / TK" (New TK) and
// "Inbound Origin" (Scan TK). Flow: scan/enter TK → verify Customer ID
// (must already exist) → pick/create Order (THN######) → product +
// photos → cargo type & size or CBM → automatic freight → Save Inbound.
// Saves through the same upsertPackage used everywhere else, so the TK
// shows up in Packages / TK, Inbound Origin, TK Detail and (once "Ready
// for Shipment") Outbound Origin without any copying.
function blankInboundForm(user) {
  return {
    tk: "",
    customer: null,
    order: null,
    product: "",
    warehouse: user?.defaultWarehouse || CHINA_WAREHOUSES[0].code,
    // លំនាំដើម = Ready for Shipment ដើម្បីកុំចាំបាច់ប្តូរច្រើនដង (ប្តូរបាននៅពេលចាំបាច់)
    inboundStatus: "Ready for Shipment",
    cargoType: "",
    sizeClass: "",
    length: "",
    width: "",
    height: "",
    weight: "",
    packageCount: "1",
    // Order ID is NEVER picked or typed: every inbound gets a brand-new
    // Order created at Save. Only the Cambodia receiving branch is chosen.
    khBranch: "",
  };
}

function CreatePackageModal({ open, onClose, onCreated }) {
  const { upsertPackage, syncTimelineToStatus, findPackage, logStatus } =
    usePackageTracking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canOverride = hasPermission(user, "tk.freight_override");

  const [f, setF] = useState(() => blankInboundForm(user));
  const [photos, setPhotos] = useState([]);
  const [override, setOverride] = useState({ on: false, value: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const { rows: whList } = useWarehouses();

  // Read-only preview of the NEW Order ID this inbound will get. Refreshed
  // every time the form opens and after every save ("Scan TK Next").
  const [orderPreview, setOrderPreview] = useState("");
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setOrderPreview("");
    peekNextOrderNo().then((n) => alive && setOrderPreview(n));
    return () => {
      alive = false;
    };
  }, [open, formKey]);

  // Selecting a Customer pre-fills their default China Warehouse / Cambodia
  // Branch (only if still Active). It never touches the Order ID.
  useEffect(() => {
    const code = f.customer?.customer_code;
    if (!open || !code) return;
    let alive = true;
    readCustomerDefaults(code).then((d) => {
      if (!alive) return;
      setF((x) => ({
        ...x,
        khBranch: whIsActive(whList, d.kh, "cambodia") ? d.kh : x.khBranch,
        warehouse: whIsActive(whList, d.china, "china") ? d.china : x.warehouse,
      }));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.customer?.customer_code, open]);

  useEffect(() => {
    if (open) {
      setFormKey((k) => k + 1);
      setF(blankInboundForm(user));
      setPhotos([]);
      setOverride({ on: false, value: "" });
      setError("");
      setDone(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const calc = calcFreight(f);
  const overrideNum = Number(override.value);
  const finalFee = !calc.ok
    ? null
    : override.on && override.value !== "" && overrideNum >= 0
      ? overrideNum
      : calc.fee;
  const tkTrim = f.tk.trim();
  const duplicateTk = tkTrim ? findPackage(tkTrim) : null;

  function resetForNext() {
    setF({ ...blankInboundForm(user), warehouse: f.warehouse });
    setFormKey((k) => k + 1); // → a NEW Order ID preview, never the last one
    setPhotos([]);
    setOverride({ on: false, value: "" });
    setError("");
    setDone(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return; // a double-click must never create two Orders
    setError("");
    if (!tkTrim) return setError("សូមស្កែន ឬបញ្ចូល TK Number");
    if (duplicateTk) return setError(`TK "${tkTrim}" មានរួចហើយក្នុងប្រព័ន្ធ`);
    if (!f.customer)
      return setError(
        "Customer Not Found — សូមផ្ទៀងផ្ទាត់ Customer ID ដែលមានក្នុងប្រព័ន្ធ",
      );
    const routeProblem = validateOrderRoute(f.warehouse, f.khBranch, whList);
    if (routeProblem) return setError(routeProblem);
    if (photos.length === 0)
      return setError("ត្រូវការរូបភាពទំនិញ យ៉ាងតិច ១ សន្លឹក");
    if (!f.cargoType) return setError("សូមជ្រើសរើស Cargo Type");
    if (!f.sizeClass) return setError("សូមជ្រើសរើស Size (S / M / L ឬ > L)");
    const dimsEntered = [f.length, f.width, f.height].some(
      (v) => String(v).trim() !== "",
    );
    if ((dimsEntered || f.sizeClass === "OVER") && calc.cbm == null)
      return setError("Length, Width, Height ត្រូវតែជាលេខវិជ្ជមាន");
    if (f.weight !== "" && !(Number(f.weight) > 0))
      return setError("Weight ត្រូវតែជាលេខវិជ្ជមាន");
    if (
      f.packageCount !== "" &&
      !(Number.isInteger(Number(f.packageCount)) && Number(f.packageCount) >= 1)
    )
      return setError("ចំនួនPackageត្រូវតែជាចំនួនគត់ ចាប់ពី 1 ឡើង");
    if (!calc.ok) return setError(calc.message);
    if (override.on && !(override.value !== "" && overrideNum >= 0))
      return setError("តម្លៃ Override មិនត្រឹមត្រូវ");

    const userName = user?.name || "Admin";
    const nowIso = new Date().toISOString();
    setSaving(true);
    let newOrder = null;
    let saved = null;
    try {
      // EVERY new inbound creates its own brand-new Order (THN######) here,
      // through the existing sequence / local registry — never reused.
      const route = { china: f.warehouse, kh: f.khBranch };
      newOrder = supabase
        ? await createOrderRemote(f.customer, "", route)
        : createLocalOrder(f.customer, "", route);
      saved = await upsertPackage({
        tk: tkTrim,
        customer_id: f.customer.id,
        order_id: newOrder.id,
        order_no: newOrder.order_no,
        origin_wh_code: newOrder.china_wh_code,
        dest_branch_code: newOrder.kh_branch_code,
        customer: `${f.customer.customer_code} · ${f.customer.name}`,
        product_name: f.product.trim(),
        cargo_type: f.cargoType,
        size_class: f.sizeClass,
        length_cm: dimsEntered ? Number(f.length) : null,
        width_cm: dimsEntered ? Number(f.width) : null,
        height_cm: dimsEntered ? Number(f.height) : null,
        weight_kg: f.weight !== "" ? Number(f.weight) : null,
        weight: f.weight !== "" ? `${Number(f.weight)} KG` : "",
        // ចំនួនPackageក្នុង TK នេះ (ទំនិញជាឈុត) — ផ្ញើតែពេល > 1 ដើម្បីមិនបាក់ DB ដែលមិនទាន់មាន column
        ...(Number(f.packageCount) > 1
          ? { package_count: Math.floor(Number(f.packageCount)) }
          : {}),
        cbm: calc.cbm != null ? calc.cbm.toFixed(3) : "",
        pricing_method: calc.method,
        rate: calc.rate,
        freight_fee: finalFee,
        freight_overridden: override.on && finalFee !== calc.fee,
        warehouse: newOrder.china_wh_code || f.warehouse,
        status: "Inbound Origin",
        inbound_status: f.inboundStatus,
        inbound_at: nowIso,
        created_by: userName,
        updated_by: userName,
        updated_at: nowIso,
        // created_at is a server default once Supabase is connected; in
        // UI-only mode the local record needs it for date filtering.
        ...(supabase ? {} : { created_at: nowIso }),
      });

      const photoWarning = await savePhotos(
        {
          tk: tkTrim,
          package_id: saved?.id,
          customer_id: f.customer.id,
          order_no: newOrder.order_no,
        },
        photos,
      );

      syncTimelineToStatus(tkTrim, "Inbound Origin", userName, "Inbound saved");
      logStatus(tkTrim, f.inboundStatus, userName, "Inbound saved");
      onCreated?.(saved);
      setDone({ saved, photoWarning, order: newOrder });
    } catch (err) {
      // TK not saved → don't leave an empty Order behind.
      if (!saved) await rollbackNewOrder(newOrder);
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setSaving(false);
    }
  }

  const shell = (children) => (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-stretch sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      {children}
    </div>
  );

  if (done) {
    return shell(
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white sm:rounded-md shadow-lg w-full max-w-md self-center sm:max-h-[90vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-mist-200 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-signal-teal/10 text-signal-teal flex items-center justify-center">
            <Check size={15} strokeWidth={3} />
          </span>
          <h3 className="font-display font-bold text-base text-ink-900">
            Inbound បានSave
          </h3>
        </div>
        <div className="p-5 space-y-4">
          {done.photoWarning && (
            <div className="flex items-start gap-2 text-sm text-[#B87415] bg-signal-amber/15 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0 mt-0.5" />
              {done.photoWarning}
            </div>
          )}
          <InfoGrid
            items={[
              { label: "TK Number", value: done.saved.tk },
              { label: "Order ID", value: done.order?.order_no || "—" },
              {
                label: "Customer",
                value: `${f.customer.customer_code} · ${f.customer.name}`,
                span: true,
              },
              { label: "Freight Fee", value: money(finalFee) },
              { label: "Inbound Status", value: f.inboundStatus },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-3.5 py-2.5 rounded-md hover:bg-mist-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={resetForNext}
            className="text-sm font-medium bg-white border border-mist-200 text-ink-700 px-3.5 py-2.5 rounded-md hover:bg-mist-50"
          >
            Scan TK Next
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate(`/packages/${done.saved.tk}`);
            }}
            className="text-sm font-medium bg-signal-blue text-white px-3.5 py-2.5 rounded-md hover:bg-signal-blue/90"
          >
            មើល TK Detail
          </button>
        </div>
      </div>,
    );
  }

  return shell(
    <form
      onClick={(e) => e.stopPropagation()}
      onSubmit={handleSubmit}
      className="bg-white sm:rounded-md shadow-lg w-full max-w-2xl sm:max-h-[92vh] overflow-y-auto flex flex-col"
    >
      <div className="px-5 py-4 border-b border-mist-200 flex items-center justify-between sticky top-0 bg-white z-10">
        <h3 className="font-display font-bold text-base text-ink-900">
          New TK — Inbound Origin
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-600/40 hover:text-ink-900"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-6 flex-1">
        {error && (
          <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
            <TriangleAlert size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <section className="space-y-3.5">
          <h4 className="font-display font-bold text-sm text-ink-900">
            TK និង Customer
          </h4>
          <div>
            <label className={LABEL_CLS}>
              TK Number <span className="text-signal-red">*</span>
            </label>
            <div className="flex items-center gap-2 border border-mist-200 rounded-md px-3 py-2 focus-within:border-signal-blue">
              <Icons.ScanLine size={16} className="text-ink-600/40 shrink-0" />
              <input
                autoFocus
                value={f.tk}
                onChange={(e) => setF((x) => ({ ...x, tk: e.target.value }))}
                // A barcode scanner ends with Enter — don't submit the form.
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                className="flex-1 outline-none text-sm bg-transparent"
                placeholder="Scan ឬវាយ TK — 786123456789"
              />
            </div>
            {duplicateTk && (
              <p className="text-xs text-signal-red mt-1">
                TK នេះមានរួចហើយក្នុងប្រព័ន្ធ (
                <Link
                  to={`/packages/${duplicateTk.tk}`}
                  className="underline"
                  onClick={onClose}
                >
                  មើល TK Detail
                </Link>
                )
              </p>
            )}
          </div>
          <CustomerPicker
            strict
            label="Customer ID"
            value={f.customer}
            onChange={(c) => setF((x) => ({ ...x, customer: c }))}
          />
          <div>
            <label className={LABEL_CLS}>Order ID</label>
            <div className="flex items-center justify-between gap-2 border border-mist-200 rounded-md px-3 py-2.5 bg-mist-50">
              <span className="font-display font-bold text-sm text-ink-900">
                {orderPreview || "…"}
              </span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-ink-600/60">
                <Icons.Lock size={12} />
                Auto Generated · Read Only
              </span>
            </div>
            <p className="text-[11px] text-ink-600/50 mt-1">
              រាល់ Inbound ថ្មី ទទួល Order ID ថ្មីជានិច្ច — Customer ដដែលបាន
              Order ច្រើន។ លេខពិតត្រូវបានកំណត់ពេល Save។
            </p>
          </div>
          <WarehouseSelect
            label="Cambodia Receiving Branch"
            hint="សាខាដែលអតិថិជនទទួលទំនិញ"
            type="cambodia"
            value={f.khBranch}
            onChange={(v) => setF((x) => ({ ...x, khBranch: v }))}
            list={whList}
          />
        </section>

        <section className="space-y-3.5">
          <h4 className="font-display font-bold text-sm text-ink-900">
            ទំនិញ និង Warehouse
          </h4>
          <div>
            <label className={LABEL_CLS}>Product Name</label>
            <input
              value={f.product}
              onChange={(e) => setF((x) => ({ ...x, product: e.target.value }))}
              className={INPUT_CLS}
              placeholder="Bluetooth Earbuds Pro"
            />
          </div>
          <div>
            <label className={LABEL_CLS}>
              ចំនួនPackageក្នុង TK (Package Qty)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={f.packageCount}
              onChange={(e) =>
                setF((x) => ({ ...x, packageCount: e.target.value }))
              }
              className={INPUT_CLS}
              placeholder="1"
            />
            <p className="text-[11px] text-ink-600/50 mt-1">
              ទំនិញជាឈុត មាន 2 Packageឡើងទៅ → ស្លាក Print បាន 1/2, 2/2 …
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>China Warehouse</label>
              <select
                value={f.warehouse}
                onChange={(e) =>
                  setF((x) => ({ ...x, warehouse: e.target.value }))
                }
                className={INPUT_CLS}
              >
                {(whList.filter((w) => w.type === "china").length
                  ? whList.filter(
                      (w) =>
                        w.type === "china" &&
                        (w.status === "Active" || w.code === f.warehouse),
                    )
                  : CHINA_WAREHOUSES
                ).map((w) => (
                  <option key={w.code} value={w.code}>
                    {w.code} · {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Inbound Status</label>
              <select
                value={f.inboundStatus}
                onChange={(e) =>
                  setF((x) => ({ ...x, inboundStatus: e.target.value }))
                }
                className={INPUT_CLS}
              >
                {INBOUND_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-3.5">
          <h4 className="font-display font-bold text-sm text-ink-900">
            Product Photos <span className="text-signal-red">*</span>
          </h4>
          <PhotoUploader photos={photos} setPhotos={setPhotos} />
        </section>

        <section className="space-y-3.5">
          <h4 className="font-display font-bold text-sm text-ink-900">
            Cargo និង Freight
          </h4>
          <CargoCalculator
            form={f}
            setForm={setF}
            calc={calc}
            finalFee={finalFee}
            canOverride={canOverride}
            override={override}
            setOverride={setOverride}
          />
        </section>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-ink-700 px-3.5 py-2.5 rounded-md hover:bg-mist-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-4 py-2.5 rounded-md hover:bg-signal-blue/90 disabled:opacity-60 min-h-[42px]"
        >
          <Save size={15} />
          {saving ? "កំពុងSave..." : "Save Inbound"}
        </button>
      </div>
    </form>,
  );
}

// ------------------------------------------------------------
// lib/useShipmentSearch.js + components/ShipmentPicker.jsx
// ------------------------------------------------------------
// Live search against the real `shipments` table, with an optional
// inline "create new Shipment" — shared by Outbound Origin (assign
// packages to a Shipment) and Arrival (select the Shipment that arrived).
function useShipmentSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!supabase) {
      setResults([]);
      return;
    }
    setLoading(true);
    const myRequestId = ++requestId.current;
    timerRef.current = setTimeout(async () => {
      try {
        let req = supabase
          .from("shipments")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8);
        const q = query.trim();
        if (q) req = req.or(`shipment_no.ilike.%${q}%,route.ilike.%${q}%`);
        const { data, error } = await req;
        if (myRequestId !== requestId.current) return;
        setResults(error || !data ? [] : data);
      } catch {
        if (myRequestId === requestId.current) setResults([]);
      } finally {
        if (myRequestId === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return { results, loading };
}

function generateShipmentNo() {
  const y = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SHP-${y}-${rand}`;
}

function ShipmentPicker({ value, onChange, allowCreate = true }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, loading } = useShipmentSearch(query);
  const [creating, setCreating] = useState(false);
  const [route, setRoute] = useState("China → Cambodia");
  const [transport, setTransport] = useState("Sea");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleCreateShipment() {
    setSaving(true);
    setError("");
    try {
      if (supabase) {
        const { data, error: err } = await supabase
          .from("shipments")
          .insert({
            shipment_no: generateShipmentNo(),
            route,
            transport,
            status: "In Transit",
          })
          .select("*")
          .single();
        if (err) throw err;
        onChange(data);
      } else {
        onChange({
          id: `local-${Date.now()}`,
          shipment_no: generateShipmentNo(),
          route,
          transport,
          status: "In Transit",
        });
      }
      setCreating(false);
    } catch (err) {
      setError(err.message || "មិនអាចCreate Shipment បានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={boxRef} className="relative space-y-2">
      <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide">
        Shipment <span className="text-signal-red">*</span>
      </label>
      {value ? (
        <div className="flex items-center justify-between border border-mist-200 rounded-md px-3 py-2 text-sm bg-mist-50">
          <span className="font-medium text-ink-900">
            {value.shipment_no || String(value.id).slice(0, 8)}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-ink-600/50 hover:text-signal-red"
          >
            <X size={14} />
          </button>
        </div>
      ) : creating ? (
        <div className="border border-mist-200 rounded-md p-3 space-y-2">
          {error && <p className="text-xs text-signal-red">{error}</p>}
          <input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="Route"
            className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
          />
          <input
            value={transport}
            onChange={(e) => setTransport(e.target.value)}
            placeholder="Transport (Sea / Land / Air)"
            className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleCreateShipment}
              className="text-sm font-medium bg-signal-blue text-white px-3 py-1.5 rounded-md disabled:opacity-60"
            >
              {saving ? "កំពុងបង្កើត..." : "Create Shipment"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-sm text-ink-700 px-3 py-1.5 rounded-md hover:bg-mist-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search Shipment No / Route..."
            className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
          />
          {open && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-mist-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
              {loading ? (
                <SkeletonDropdownRows />
              ) : results.length > 0 ? (
                results.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      onChange(s);
                      setQuery("");
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-mist-50"
                  >
                    <span className="font-medium text-ink-900">
                      {s.shipment_no || String(s.id).slice(0, 8)}
                    </span>
                    <span className="text-ink-600/55">
                      {" "}
                      · {s.route} · {s.status}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-ink-600/45">
                  No shipment found
                </p>
              )}
              {allowCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setCreating(true);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-signal-blue border-t border-mist-200 hover:bg-mist-50"
                >
                  + Create Shipment ថ្មី
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// components/CreateArrivalModal.jsx
// ------------------------------------------------------------
// Selects a Shipment, creates its Arrival record, then propagates the
// arrival: the Shipment's own status updates, and every Package riding
// on it moves to "Arrived Destination" (see PACKAGE_STAGES) — making
// them ready for Cambodia Warehouse. Direct Shipment -> Arrival, no
// Container hop (Container is Phase 2, per the workflow spec).
function CreateArrivalModal({ open, onClose, onCreated }) {
  const { refetch: refetchPackages } = usePackageTracking();
  const [shipment, setShipment] = useState(null);
  const [port, setPort] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setShipment(null);
      setPort("");
      setArrivalDate("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!shipment) return setError("សូមជ្រើសរើស Shipment");
    if (!port.trim()) return setError("សូមបញ្ចូល Port / Dry Port");
    if (!supabase) {
      setError("Supabase មិនទាន់ត្រូវបានភ្ជាប់ទេ");
      return;
    }
    setSaving(true);
    try {
      const { data, error: err } = await supabase
        .from("arrival")
        .insert({
          shipment_id: shipment.id,
          shipment_no: shipment.shipment_no,
          port: port.trim(),
          arrivalDate: arrivalDate.trim() || formatNowTimestamp(),
          status: "Pending",
        })
        .select("*")
        .single();
      if (err) throw err;

      // Propagate: the shipment has arrived, so every package riding on
      // it advances to "Arrived Destination" and becomes visible for
      // Cambodia Warehouse.
      await supabase
        .from("shipments")
        .update({ status: "Arrived" })
        .eq("id", shipment.id);
      await supabase
        .from("packages")
        .update({ status: "Arrived Destination" })
        .eq("shipment_id", shipment.id);
      await refetchPackages();

      onCreated?.(data);
      onClose();
    } catch (err) {
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            Arrival ថ្មី
          </h3>
        </div>
        <div className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}
          <ShipmentPicker
            value={shipment}
            onChange={setShipment}
            allowCreate={false}
          />
          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Port / Dry Port <span className="text-signal-red">*</span>
            </label>
            <input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
              placeholder="Sihanoukville Port"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Arrival Date
            </label>
            <input
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
              placeholder="05 Oct 2026"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
          >
            {saving ? "កំពុងSave..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm gap-3">
      <span className="text-ink-600/55">{label}</span>
      <span className="font-medium text-ink-900 text-right">{value}</span>
    </div>
  );
}

// The "Transfer Type" selector + search box + live "Information" card,
// shared by both transfer modals below.
function TransferAccountLookup({
  transferType,
  onTransferTypeChange,
  query,
  onQueryChange,
  matched,
  loading,
  noteText,
}) {
  return (
    <div className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
          Transfer Type <span className="text-signal-red">*</span>
        </label>
        <div className="flex border border-mist-200 rounded-md overflow-hidden focus-within:border-signal-blue">
          <div className="relative shrink-0 border-r border-mist-200">
            <select
              value={transferType}
              onChange={(e) => onTransferTypeChange(e.target.value)}
              className="appearance-none bg-white pl-3 pr-7 py-2 text-sm text-ink-900 outline-none cursor-pointer"
            >
              {TRANSFER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-600/40"
            />
          </div>
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-600/40"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={
                transferType === "uid"
                  ? "887"
                  : transferType === "phone"
                    ? "+855..."
                    : "ឈ្មោះ Customer..."
              }
              className="w-full pl-8 pr-3 py-2 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-mist-50 border border-mist-200 rounded-md p-4 space-y-3">
        <h4 className="font-display font-bold text-sm text-signal-blue">
          Information
        </h4>
        {loading ? (
          <SkeletonRegion className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-6">
                <Skeleton className="h-3.5 w-20" delay={i * 80} />
                <Skeleton className="h-3.5 w-32" delay={i * 80 + 40} />
              </div>
            ))}
          </SkeletonRegion>
        ) : matched ? (
          <>
            <InfoRow label="UID" value={matched.id} />
            <InfoRow label="Name" value={matched.name} />
            <InfoRow label="Phone Number" value={matched.phone} />
          </>
        ) : (
          <p className="text-xs text-ink-600/45">
            {query
              ? "រកមិនឃើញគណនីនេះទេ — សូមពិនិត្យម្តងទៀត"
              : "សូមវាយបញ្ចូល UID, ឈ្មោះ ឬPhone number ដើម្បីSearchគណនី"}
          </p>
        )}
        {matched && !loading && noteText && (
          <p className="text-xs text-signal-red font-medium leading-relaxed pt-2 border-t border-mist-200">
            *Note : {noteText}
          </p>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/VerifyScanModal.jsx
// ------------------------------------------------------------
// Generic "scan → verify → confirm" modal, shared by every stage that
// needs a staff member to visually confirm a TK before it moves on
// (Scan Arrive V2 on W.H Arrived, and the Sorting scan below). Confirm
// rebuilds the timeline up to `targetStatus` via syncTimelineToStatus —
// not just the record's status field — so the Package Detail page's
// Tracking Timeline always matches, however the TK got here. "Proceed
// By" on that timeline is the staff member who confirmed it (the
// logged-in user), not the name of the scan flow itself.
function VerifyScanModal({
  open,
  tk,
  title,
  targetStatus,
  onClose,
  onConfirmed,
  allowRemeasure = false,
}) {
  const { findPackage, syncTimelineToStatus, upsertPackage, logStatus } =
    usePackageTracking();
  const { user } = useAuth();
  const canRemeasure = allowRemeasure && hasPermission(user, "tk.remeasure");
  const [edit, setEdit] = useState(false);
  const [dims, setDims] = useState({
    length: "",
    width: "",
    height: "",
    weight: "",
    cargoType: "",
    sizeClass: "",
    reason: "",
  });
  const [checked, setChecked] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Drives the entrance animation: mounts closed (scaled-down/transparent),
  // then flips to open a frame later so the browser actually transitions
  // instead of snapping straight to the final state.
  const [show, setShow] = useState(false);
  const { rows: whList } = useWarehouses();
  const [route, setRoute] = useState({
    china: "",
    kh: "",
    source: "",
    loading: true,
  });

  // The Receiving Branch is never typed by staff: TK → Order → Customer
  // default, first match wins.
  useEffect(() => {
    if (!open || !tk) return;
    let alive = true;
    const p = findPackage(tk);
    setRoute({ china: "", kh: "", source: "", loading: true });
    (async () => {
      let china = p?.origin_wh_code || "";
      let kh = p?.dest_branch_code || "";
      let source = kh ? "TK" : "";
      try {
        if (!kh || !china) {
          const o = await findOrderByNo(p?.order_no);
          if (o) {
            china = china || o.china_wh_code || "";
            if (!kh && o.kh_branch_code) {
              kh = o.kh_branch_code;
              source = "Order";
            }
          }
        }
        if (!kh || !china) {
          const cc = String(p?.customer || "").split(" · ")[0];
          const d = await readCustomerDefaults(cc);
          if (!kh && d.kh) {
            kh = d.kh;
            source = "Customer default";
          }
          china = china || d.china;
        }
      } catch {
        // Fall through with whatever was resolved.
      }
      china = china || p?.warehouse || "";
      if (alive) setRoute({ china, kh, source, loading: false });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tk]);

  useEffect(() => {
    if (open) {
      setChecked(true);
      setSaving(false);
      setError("");
      setEdit(false);
      const p = findPackage(tk);
      setDims({
        length: p?.length_cm ?? "",
        width: p?.width_cm ?? "",
        height: p?.height_cm ?? "",
        weight: p?.weight_kg ?? "",
        cargoType: p?.cargo_type || "",
        sizeClass: p?.size_class || "",
        reason: "",
      });
      setShow(false);
      const raf = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(raf);
    }
    setShow(false);
  }, [open, tk]);

  if (!open || !tk) return null;
  const pkg = findPackage(tk);
  if (!pkg) return null;

  const calc = edit
    ? calcFreight({
        cargoType: dims.cargoType,
        sizeClass: dims.sizeClass,
        length: dims.length,
        width: dims.width,
        height: dims.height,
      })
    : null;

  async function handleConfirm() {
    setError("");
    const userName = user?.name || "Admin";
    if (edit) {
      if (!(Number(dims.weight) > 0))
        return setError("Weight ត្រូវតែជាលេខវិជ្ជមាន");
      if (!calc.ok) return setError(calc.message);
      if (!String(dims.reason).trim())
        return setError("សូមបញ្ចូលReason for adjustment (Reason)");
    }
    setSaving(true);
    try {
      if (edit) {
        const dimsEntered = [dims.length, dims.width, dims.height].some(
          (v) => String(v).trim() !== "",
        );
        // A fee the Super Admin overrode by hand is never silently
        // replaced by the automatic calculation.
        const keepFee = pkg.freight_overridden;
        const newFee = keepFee ? pkg.freight_fee : calc.fee;
        await upsertPackage({
          tk: pkg.tk,
          length_cm: dimsEntered ? Number(dims.length) : null,
          width_cm: dimsEntered ? Number(dims.width) : null,
          height_cm: dimsEntered ? Number(dims.height) : null,
          weight_kg: Number(dims.weight),
          weight: `${Number(dims.weight)} KG`,
          cbm: calc.cbm != null ? calc.cbm.toFixed(3) : "",
          cargo_type: dims.cargoType,
          size_class: dims.sizeClass,
          pricing_method: calc.method,
          rate: calc.rate,
          freight_fee: newFee,
          updated_by: userName,
          updated_at: new Date().toISOString(),
        });
        logStatus(
          pkg.tk,
          pkg.status,
          userName,
          `KH re-verify: ${pkg.weight || "—"} → ${Number(dims.weight)} KG · CBM ${
            pkg.cbm || "—"
          } → ${calc.cbm != null ? calc.cbm.toFixed(3) : "—"} · Size ${
            pkg.size_class || "—"
          } → ${dims.sizeClass} · Fee ${money(pkg.freight_fee)} → ${money(
            newFee,
          )}${keepFee ? " (manual override kept)" : ""} · Reason: ${String(
            dims.reason,
          ).trim()}`,
        );
      }
      if (REQUIRE_BRANCH_ON_ARRIVAL && !route.kh)
        throw new Error(
          "រកមិនឃើញ Receiving Branch — សូមឱ្យ Admin/Customer Service កំណត់នៅ Order សិន",
        );
      // Write the inherited warehouses onto the TK so lists/detail match.
      if (
        (route.kh && !pkg.dest_branch_code) ||
        (route.china && !pkg.origin_wh_code)
      )
        await upsertPackage({
          tk: pkg.tk,
          ...(route.kh ? { dest_branch_code: route.kh } : {}),
          ...(route.china ? { origin_wh_code: route.china } : {}),
        });
      const branchLabel = route.kh ? whName(whList, route.kh) : "";
      await syncTimelineToStatus(
        pkg.tk,
        targetStatus,
        userName,
        branchLabel
          ? `Receiving Branch: ${branchLabel}`
          : "Receiving Branch: not set",
      );
      onConfirmed?.(pkg.tk, {
        branch: branchLabel,
        customer: pkg.customer,
        orderNo: pkg.order_no,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Unable to confirm.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-colors duration-200 ${
        show ? "bg-ink-900/40" : "bg-ink-900/0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-md shadow-lg w-full max-w-2xl max-h-[85vh] overflow-y-auto transition-all duration-200 ease-out ${
          show ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md border border-mist-200 text-ink-600/60 hover:bg-mist-50"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div
            className={`rounded-md border px-4 py-3 ${
              route.kh
                ? "border-signal-blue/30 bg-signal-blue/5"
                : "border-signal-amber/40 bg-signal-amber/10"
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-600/55">
              Receiving Branch (Cambodia)
            </div>
            {route.loading ? (
              <SkeletonRegion className="mt-1.5">
                <Skeleton className="h-5 w-44" />
              </SkeletonRegion>
            ) : route.kh ? (
              <>
                <div className="text-base font-bold text-ink-900 mt-0.5">
                  {whName(whList, route.kh)}
                </div>
                <div className="text-xs text-ink-600/55 mt-0.5">
                  Origin: {route.china ? whName(whList, route.china) : "—"}
                  {route.source && route.source !== "TK"
                    ? ` · ពី ${route.source}`
                    : ""}
                </div>
              </>
            ) : (
              <div className="text-sm text-[#B87415] mt-0.5">
                មិនទាន់មាន Receiving Branch លើ Order/Customer នេះ — សូមឱ្យ Admin
                ឬ Customer Service កំណត់នៅ Order
              </div>
            )}
          </div>

          <div className="border border-mist-200 rounded-md overflow-hidden">
            <div className="bg-mist-50 px-4 py-2.5 text-xs font-semibold text-ink-600/55 uppercase tracking-wide">
              Order details
            </div>
            <div className="p-4">
              <InfoGrid
                items={[
                  {
                    label: "Order ID",
                    value: pkg.order_no || pkg.order || "—",
                  },
                  { label: "Tracking Number", value: pkg.tk },
                  { label: "Customer", value: pkg.customer || "—" },
                  {
                    label: "Status",
                    value: <StatusBadge label={pkg.status || "—"} />,
                  },
                  { label: "Shipping Method", value: pkg.method || "Land" },
                  {
                    label: "Total Parcel / Total Quantity",
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        1 / 1 Pcs
                        <span className="inline-flex items-center gap-1 text-signal-teal text-xs font-semibold">
                          <Check size={12} /> Verified
                        </span>
                      </span>
                    ),
                  },
                  {
                    label: "Total Weight / Total CBM",
                    value: `${pkg.weight || "—"} / ${pkg.cbm || "—"}`,
                  },
                  { label: "Warehouse", value: pkg.warehouse || "—" },
                  { label: "Product", value: pkg.product_name || "—" },
                  {
                    label: "Cargo / Size",
                    value: pkg.cargo_type
                      ? `${pkg.cargo_type} · ${sizeLabel(pkg.size_class)}`
                      : "—",
                  },
                  {
                    label: "Freight",
                    value:
                      pkg.freight_fee !== undefined &&
                      pkg.freight_fee !== null &&
                      pkg.freight_fee !== ""
                        ? money(pkg.freight_fee)
                        : "—",
                  },
                ]}
              />
            </div>
          </div>

          {canRemeasure && (
            <div className="border border-mist-200 rounded-md overflow-hidden">
              <div className="flex items-center justify-between bg-mist-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-ink-900">
                  ផ្ទៀងផ្ទាត់ Size / Weight ឡើងវិញ
                </span>
                <button
                  type="button"
                  onClick={() => setEdit((v) => !v)}
                  className="text-xs font-medium text-signal-blue border border-mist-200 bg-white px-2.5 py-1 rounded-md hover:bg-mist-50"
                >
                  {edit ? "Cancel changes" : "Adjust Size / Weight"}
                </button>
              </div>
              {edit && (
                <div className="p-4 space-y-3">
                  <div className="text-xs text-ink-600/60">
                    ពីចិន: {pkg.weight || "—"} · CBM {pkg.cbm || "—"} · Size{" "}
                    {sizeLabel(pkg.size_class)} · Fee{" "}
                    {pkg.freight_fee != null ? money(pkg.freight_fee) : "—"}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      ["length", "Length (cm)"],
                      ["width", "Width (cm)"],
                      ["height", "Height (cm)"],
                      ["weight", "Weight (KG)"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className={LABEL_CLS}>{label}</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={dims[key]}
                          onChange={(e) =>
                            setDims((d) => ({ ...d, [key]: e.target.value }))
                          }
                          className={INPUT_CLS}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLS}>Cargo Type</label>
                      <select
                        value={dims.cargoType}
                        onChange={(e) =>
                          setDims((d) => ({ ...d, cargoType: e.target.value }))
                        }
                        className={INPUT_CLS}
                      >
                        <option value="">— ជ្រើសរើស —</option>
                        {CARGO_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL_CLS}>Size</label>
                      <select
                        value={dims.sizeClass}
                        onChange={(e) =>
                          setDims((d) => ({ ...d, sizeClass: e.target.value }))
                        }
                        className={INPUT_CLS}
                      >
                        <option value="">— ជ្រើសរើស —</option>
                        {SIZE_CHOICES.map((z) => (
                          <option key={z} value={z}>
                            {sizeLabel(z)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Reason for adjustment *</label>
                    <input
                      value={dims.reason}
                      onChange={(e) =>
                        setDims((d) => ({ ...d, reason: e.target.value }))
                      }
                      placeholder="ឧ. ចិនវាស់ខុស / ថ្លឹងលើកទីពីរ"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div className="text-xs rounded-md bg-mist-50 px-3 py-2 text-ink-700">
                    {calc?.ok ? (
                      <>
                        CBM ថ្មី:{" "}
                        <b>{calc.cbm != null ? calc.cbm.toFixed(3) : "—"}</b> ·
                        Freight ថ្មី:{" "}
                        <b>
                          {pkg.freight_overridden
                            ? `${money(pkg.freight_fee)} (Override — Save)`
                            : money(calc.fee)}
                        </b>
                      </>
                    ) : (
                      <span className="text-signal-red">{calc?.message}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border border-mist-200 rounded-md overflow-hidden">
            <div className="flex items-center justify-between bg-mist-50 px-4 py-2.5">
              <span className="text-sm font-semibold text-ink-900">
                Split by Packages{" "}
                <span className="text-ink-600/45 font-normal">
                  ({checked ? 1 : 0}/1 Selected)
                </span>
              </span>
              <label className="flex items-center gap-1.5 text-xs text-ink-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                Select All
              </label>
            </div>
            <div className="p-4 flex items-start gap-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-1"
              />
              <Package size={18} className="text-signal-blue mt-0.5" />
              <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                <div className="col-span-3 font-medium text-ink-900">
                  Parcel #1
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                    Qty
                  </div>
                  <div className="text-ink-900">1</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                    Weight
                  </div>
                  <div className="text-ink-900">{pkg.weight || "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                    Status
                  </div>
                  <StatusBadge label={pkg.status || "—"} />
                </div>
              </div>
            </div>
          </div>
          <PhotoGallery tk={pkg.tk} />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-700 border border-mist-200 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !checked || route.loading}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
          >
            <Check size={14} />
            {saving ? "Confirming..." : edit ? "Save & Confirm" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/TkScanField.jsx  (+ useScanFeedback hook)
// ------------------------------------------------------------
// Warehouse-style scan input shared by every "scan a TK" box. UI only —
// it never decides whether a TK is valid; the page calls scan.begin() /
// scan.succeed() / scan.fail() with the result of its own (unchanged)
// validation, and this component just animates it:
//   idle → scanning (blue glow, pulsing icon, sweeping scan line)
//        → success  (green glow, icon morphs into a drawn checkmark)
//        → error    (red state, short shake, clear message)
// After success/error the input is re-focused (and on error the old text
// is selected so the next scan simply overwrites it), which keeps
// back-to-back barcode/QR scanning hands-free. Colours come from
// currentColor, so they follow the signal-blue/teal/red theme tokens.
// All motion is 200–350ms and is switched off for reduced-motion users.
const SCAN_CSS = `
.cb-scan {
  position: relative;
  overflow: hidden;
  transition: border-color .2s ease, box-shadow .2s ease,
    background-color .2s ease, color .2s ease;
}
.cb-scan--scanning {
  border-color: currentColor;
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 16%, transparent);
}
.cb-scan--success {
  border-color: currentColor;
  background-color: color-mix(in srgb, currentColor 5%, white);
  animation: cb-scan-glow .35s ease-out both;
}
.cb-scan--error {
  border-color: currentColor;
  background-color: color-mix(in srgb, currentColor 5%, white);
  box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 14%, transparent);
}
.cb-scan--error.cb-scan-shake-a { animation: cb-scan-shake-a .3s ease-in-out both; }
.cb-scan--error.cb-scan-shake-b { animation: cb-scan-shake-b .3s ease-in-out both; }

/* sweeping scan line (only visible while scanning) */
.cb-scan__line {
  position: absolute;
  inset: 0;
  width: 100%;
  pointer-events: none;
  opacity: 0;
  transition: opacity .2s ease;
  background: linear-gradient(
    90deg,
    transparent 38%,
    color-mix(in srgb, currentColor 20%, transparent) 48.5%,
    currentColor 50%,
    color-mix(in srgb, currentColor 20%, transparent) 51.5%,
    transparent 62%
  );
}
.cb-scan--scanning .cb-scan__line {
  opacity: .55;
  animation: cb-scan-sweep .35s ease-in-out infinite;
}

/* icon stack: scanner → check / alert */
.cb-scan__icon { position: relative; width: 18px; height: 18px; flex-shrink: 0; }
.cb-scan__icon > * {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: scale(.6);
  transition: opacity .2s ease, transform .25s cubic-bezier(.34,1.4,.64,1);
}
.cb-scan--idle .cb-ico-scan { opacity: .4; transform: none; }
.cb-scan--scanning .cb-ico-scan {
  opacity: 1; transform: none;
  animation: cb-scan-pulse .7s ease-in-out infinite;
}
.cb-scan--success .cb-ico-check { opacity: 1; transform: none; }
.cb-scan--success .cb-ico-check path {
  stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: cb-scan-draw .28s .08s ease-out forwards;
}
.cb-scan--error .cb-ico-err { opacity: 1; transform: none; }

.cb-scan-msg { animation: cb-scan-msg .2s ease-out both; }
.cb-scan-row-in {
  animation: cb-scan-row-in .3s cubic-bezier(.2,.8,.2,1) both,
    cb-scan-row-flash .9s ease-out both;
}

@keyframes cb-scan-sweep { from { transform: translateX(-50%); } to { transform: translateX(50%); } }
@keyframes cb-scan-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.85); opacity: .6; } }
@keyframes cb-scan-glow {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 35%, transparent); }
  60%  { box-shadow: 0 0 0 7px color-mix(in srgb, currentColor 18%, transparent); }
  100% { box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 14%, transparent); }
}
@keyframes cb-scan-shake-a { 0%,100% { transform: none; } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
@keyframes cb-scan-shake-b { 0%,100% { transform: none; } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
@keyframes cb-scan-draw { to { stroke-dashoffset: 0; } }
@keyframes cb-scan-msg { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
@keyframes cb-scan-row-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes cb-scan-row-flash { from { background-color: rgba(20,184,166,.14); } to { background-color: transparent; } }

@media (prefers-reduced-motion: reduce) {
  .cb-scan, .cb-scan *, .cb-scan-msg, .cb-scan-row-in { animation: none !important; transition: none !important; }
}
`;

// How long the green success state is held before going back to idle.
const SCAN_SUCCESS_HOLD_MS = 1100;
// Pause between the success animation and the Verify modal opening, so the
// operator actually sees the green check before the modal covers it.
// Set to 0 to open the modal instantly like before.
const SCAN_SUCCESS_DELAY_MS = 380;

function useScanFeedback() {
  const [phase, setPhase] = useState("idle"); // idle | scanning | success | error
  const [message, setMessage] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function focusInput(selectText = false) {
    setTimeout(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      if (selectText) el.select();
    }, 40);
  }
  function begin() {
    clearTimeout(timerRef.current);
    setPhase("scanning");
    setMessage("");
  }
  function reset() {
    clearTimeout(timerRef.current);
    setPhase("idle");
    setMessage("");
  }
  function succeed(text = "") {
    clearTimeout(timerRef.current);
    setPhase("success");
    setMessage(text);
    timerRef.current = setTimeout(() => {
      setPhase("idle");
      setMessage("");
    }, SCAN_SUCCESS_HOLD_MS);
    focusInput(false);
  }
  // Errors stay on screen until the next scan starts (a busy operator may
  // look away for a moment), and the bad text is selected for overwrite.
  function fail(text, refocus = true) {
    clearTimeout(timerRef.current);
    setPhase("error");
    setMessage(text);
    setShakeKey((k) => k + 1);
    if (refocus) focusInput(true);
  }
  // Call from the input's onChange with the new value.
  function onInput(value) {
    if (value.trim()) begin();
    else reset();
  }

  return {
    phase,
    message,
    shakeKey,
    inputRef,
    focusInput,
    begin,
    reset,
    succeed,
    fail,
    onInput,
  };
}

const SCAN_PHASE_LABEL = {
  idle: "Ready to scan",
  scanning: "Scanning…",
  success: "Verified",
  error: "Failed",
};

function TkScanField({
  label = "Scan Tracking Number",
  value,
  onChange,
  placeholder,
  scan,
}) {
  const { phase, message, shakeKey, inputRef } = scan;
  const tone =
    phase === "scanning"
      ? "text-signal-blue"
      : phase === "success"
        ? "text-signal-teal"
        : phase === "error"
          ? "text-signal-red"
          : "text-ink-600";
  const shake =
    phase === "error"
      ? shakeKey % 2
        ? "cb-scan-shake-a"
        : "cb-scan-shake-b"
      : "";

  return (
    <div className="space-y-1.5">
      <style>{SCAN_CSS}</style>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide">
          {label}
        </label>
        <span
          className={`text-[11px] font-medium transition-colors duration-200 ${tone} ${
            phase === "idle" ? "opacity-50" : ""
          }`}
        >
          {SCAN_PHASE_LABEL[phase]}
        </span>
      </div>
      <div
        className={`cb-scan cb-scan--${phase} ${shake} ${tone} flex items-center gap-2.5 bg-white border border-mist-200 rounded-md px-3 py-2.5 focus-within:border-signal-blue`}
      >
        <span className="cb-scan__icon" aria-hidden="true">
          <Icons.ScanLine className="cb-ico-scan" size={18} />
          <svg
            className="cb-ico-check"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9.5" strokeOpacity=".35" />
            <path d="M7.5 12.5l3 3 6-6.5" pathLength="1" />
          </svg>
          <Icons.TriangleAlert className="cb-ico-err" size={18} />
        </span>
        <input
          ref={inputRef}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 outline-none text-[15px] font-medium tracking-wide text-ink-900 bg-transparent placeholder:font-normal placeholder:tracking-normal"
        />
        <span className="cb-scan__line" aria-hidden="true" />
      </div>
      {/* Fixed-height message slot so the cards below never jump while scanning. */}
      <div className="min-h-[38px] pt-1.5" aria-live="polite">
        {message && (
          <div
            key={`${phase}-${shakeKey}-${message}`}
            className={`cb-scan-msg flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
              phase === "error"
                ? "text-signal-red bg-signal-red/10"
                : "text-signal-teal bg-signal-teal/10"
            }`}
          >
            {phase === "error" ? (
              <TriangleAlert size={14} className="shrink-0" />
            ) : (
              <Check size={14} className="shrink-0" />
            )}
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// pages/ScanConfirmPage.jsx
// ------------------------------------------------------------
// Generic "scan a TK that's already at `fromStatus` → Verify → Confirm
// to `toStatus`" screen, shared by every stage that needs a staff member
// to scan+confirm a TK by hand: W.H Arrived (Destination)'s Scan Arrive
// V2 (Outbound Origin -> Arrived Destination) and Sorting's scan
// (Shipping To Branch -> Inbound Warehouse). Only page copy/labels and
// the two statuses differ between them — see WHArrivedPage/SortingPage
// below for how each one configures it.
function ScanConfirmPage({
  pageTitle,
  scanTabLabel,
  modalTitle,
  fromStatus,
  toStatus,
  alreadyDoneMessage,
  scanPlaceholder,
  // Optional: lets the Listing tab's rows carry a one-click button that
  // jumps a TK straight to `nextStatus` (e.g. "Arrived Destination" ->
  // "Shipping To Branch") without opening Order Detail first. Omit both
  // to leave the Listing tab read-only, as before.
  nextStatus,
  nextStatusLabel,
  allowRemeasure = false,
}) {
  const { packages, findPackage, syncTimelineToStatus } = usePackageTracking();
  const { user } = useAuth();
  const [tab, setTab] = useState("scan");
  const [tkInput, setTkInput] = useState("");
  const [queue, setQueue] = useState([]);
  const [verifyTk, setVerifyTk] = useState(null);
  const [updatingTk, setUpdatingTk] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [notice, setNotice] = useState(null);
  const scan = useScanFeedback();
  const verifyTimer = useRef(null);
  const debounceTimer = useRef(null);
  useEffect(
    () => () => {
      clearTimeout(verifyTimer.current);
      clearTimeout(debounceTimer.current);
    },
    [],
  );

  const doneRows = packages.filter((p) => p.status === toStatus);
  const queueRows = queue.map((tk) => findPackage(tk)).filter(Boolean);

  // "Update to <nextStatus>" button on a Listing row — skips Order Detail
  // entirely for the common case of just advancing a TK one stage.
  async function handleAdvanceFromListing(tk) {
    setRowError(null);
    setUpdatingTk(tk);
    try {
      await syncTimelineToStatus(tk, nextStatus, user?.name || "Admin");
    } catch (err) {
      setRowError(
        `TK "${tk}" មិនអាច Update ទៅ ${nextStatus} បានទេ: ${
          err.message || "សូមព្យាយាមម្តងទៀត"
        }`,
      );
    } finally {
      setUpdatingTk(null);
    }
  }

  // Runs the same lookup/validate/queue logic as handleScan below, but
  // callable from anywhere (Enter key or auto-scan) with a plain value.
  function processScan(rawValue) {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const pkg = findPackage(trimmed);
    if (!pkg) {
      scan.fail(`TK not found "${trimmed}" ទេ`);
      return;
    }
    if (pkg.status !== fromStatus) {
      scan.fail(
        pkg.status === toStatus
          ? `TK "${trimmed}" ${alreadyDoneMessage}`
          : `TK "${trimmed}" មិនទាន់ ${fromStatus} ទេ (Status: ${pkg.status})`,
      );
      return;
    }
    if (queue.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      scan.fail(`TK "${trimmed}" ស្កែនរួចហើយ ខាងក្រោម`);
      return;
    }
    setQueue((q) => [...q, pkg.tk]);
    setTkInput("");
    scan.succeed(`${pkg.tk} — ស្កែនជោគជ័យ`);
    // Match the real system: a valid scan pops the Verify screen straight
    // away instead of waiting for a manual "Verify" click — just after a
    // short beat so the green success animation is visible first.
    clearTimeout(verifyTimer.current);
    verifyTimer.current = setTimeout(
      () => setVerifyTk(pkg.tk),
      SCAN_SUCCESS_DELAY_MS,
    );
  }

  function handleScan(e) {
    e.preventDefault();
    // Enter handles the scan right now — cancel the pending auto-fire so
    // the same TK isn't processed twice.
    clearTimeout(debounceTimer.current);
    processScan(tkInput);
  }

  // A barcode/USB scanner "types" the whole TK almost instantly and then
  // usually — but not always — sends Enter, so waiting on the form submit
  // alone can leave a scan sitting in the box. Auto-fire once typing has
  // paused for a beat instead, the same trick most scan-to-list screens
  // use to skip the Enter press entirely.
  useEffect(() => {
    const trimmed = tkInput.trim();
    if (!trimmed) return;
    debounceTimer.current = setTimeout(() => processScan(trimmed), 250);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tkInput]);

  function removeFromQueue(tk) {
    setQueue((q) => q.filter((t) => t !== tk));
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display font-bold text-xl text-ink-900">
        {pageTitle}
      </h1>

      {notice && (
        <div className="flex items-start justify-between gap-3 bg-signal-teal/10 border border-signal-teal/30 rounded-md px-4 py-3 text-sm">
          <div className="space-y-0.5">
            <div className="font-semibold text-signal-teal flex items-center gap-1.5">
              <Check size={14} /> Shipment Arrived
            </div>
            <div className="text-ink-800">
              TK <b>{notice.tk}</b> · Order <b>{notice.orderNo || "—"}</b>
            </div>
            <div className="text-ink-800">
              Customer: {notice.customer || "—"}
            </div>
            <div className="text-ink-800">
              Receiving Branch: <b>{notice.branch || "មិនទាន់កំណត់"}</b> ·
              Arrival Date: {notice.at}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-ink-600/50 hover:text-ink-900"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-5 border-b border-mist-200">
        <button
          onClick={() => setTab("listing")}
          className={`flex items-center gap-1.5 text-sm font-semibold pb-3 border-b-2 -mb-px ${
            tab === "listing"
              ? "text-signal-blue border-signal-blue"
              : "text-ink-600/50 border-transparent hover:text-ink-800"
          }`}
        >
          Listing
          <span className="bg-mist-100 text-ink-600/60 text-[11px] px-1.5 py-0.5 rounded-sm">
            {doneRows.length}
          </span>
        </button>
        <button
          onClick={() => setTab("scan")}
          className={`text-sm font-semibold pb-3 border-b-2 -mb-px ${
            tab === "scan"
              ? "text-signal-blue border-signal-blue"
              : "text-ink-600/50 border-transparent hover:text-ink-800"
          }`}
        >
          {scanTabLabel}
        </button>
      </div>

      {tab === "listing" ? (
        <div className="cb-surface cb-card">
          {rowError && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2 m-4 mb-0">
              <TriangleAlert size={14} className="shrink-0" />
              {rowError}
            </div>
          )}
          <DataTable
            columns={[
              {
                key: "tk",
                label: "TK Number",
                strong: true,
                linkTo: (row) => `/packages/${row.tk}`,
              },
              { key: "customer", label: "Customer" },
              { key: "weight", label: "Weight" },
              { key: "warehouse", label: "China WH" },
              {
                key: "dest_branch_code",
                label: "Receiving Branch",
                render: (row) => row.dest_branch_code || "—",
              },
              SHIPPING_FEE_COL,
              { key: "status", label: "Status", status: true },
              nextStatus && {
                key: "actions",
                label: "",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => handleAdvanceFromListing(row.tk)}
                    disabled={updatingTk === row.tk}
                    className="flex items-center gap-1.5 bg-signal-blue text-white text-xs font-medium px-2.5 py-1.5 rounded-md hover:bg-signal-blue/90 disabled:opacity-60 whitespace-nowrap"
                  >
                    <ArrowRight size={13} />
                    {updatingTk === row.tk
                      ? "កំពុង Update..."
                      : nextStatusLabel || `Update → ${nextStatus}`}
                  </button>
                ),
              },
            ].filter(Boolean)}
            rows={doneRows}
          />
        </div>
      ) : (
        <>
          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
            <form onSubmit={handleScan}>
              <TkScanField
                value={tkInput}
                onChange={(v) => {
                  setTkInput(v);
                  scan.onInput(v);
                }}
                placeholder={scanPlaceholder}
                scan={scan}
              />
            </form>
          </div>

          <div className="cb-surface cb-card">
            <div className="flex items-center gap-2 px-4 lg:px-5 py-3.5 border-b border-mist-200">
              <h2 className="text-sm font-semibold text-ink-900">
                Order and package size listing
              </h2>
              <span className="bg-mist-100 text-ink-700 text-xs font-medium px-2 py-1 rounded-md">
                {queueRows.length} orders
              </span>
              <span className="bg-signal-blue/10 text-signal-blue text-xs font-medium px-2 py-1 rounded-md">
                {queueRows.length} packages
              </span>
            </div>
            {queueRows.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <PackageCheck size={36} className="text-ink-600/20 mb-3" />
                <p className="text-sm text-ink-600/45">
                  you don't have any data available yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-mist-100">
                {queueRows.map((row) => (
                  <div
                    key={row.tk}
                    className="cb-scan-row-in flex items-center justify-between gap-4 px-4 lg:px-5 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/packages/${row.tk}`}
                        className="font-medium text-signal-blue hover:underline"
                      >
                        {row.tk}
                      </Link>
                      <div className="text-xs text-ink-600/50 mt-0.5">
                        {row.customer} · {row.weight || "—"} ·{" "}
                        {row.dest_branch_code
                          ? `→ ${row.dest_branch_code}`
                          : "Branch —"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge label={row.status} />
                      <button
                        onClick={() => setVerifyTk(row.tk)}
                        className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3 py-1.5 rounded-md hover:bg-signal-blue/90"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => removeFromQueue(row.tk)}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-mist-200 text-ink-600/60 hover:bg-mist-50"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <VerifyScanModal
        open={!!verifyTk}
        tk={verifyTk}
        title={modalTitle}
        targetStatus={toStatus}
        allowRemeasure={allowRemeasure}
        onClose={() => {
          setVerifyTk(null);
          scan.focusInput();
        }}
        onConfirmed={(tk, info) => {
          scan.focusInput();
          removeFromQueue(tk);
          if (toStatus === "Arrived Destination")
            setNotice({ tk, ...info, at: formatNowTimestamp() });
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------
// pages/WarehouseManagementPage.jsx
// ------------------------------------------------------------
// Admin → Warehouse Management. Two tabs: China Warehouses (where
// suppliers send goods) and Cambodia Branches (where customers receive
// goods). Only WAREHOUSE_ADMIN_ROLES can create/edit/disable; everyone
// else who can open the page gets a read-only view.
function WarehouseFormModal({ open, type, existing, onClose, onSave }) {
  const [v, setV] = useState(blankWarehouse(type));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setV(
        existing
          ? { ...blankWarehouse(type), ...existing }
          : blankWarehouse(type),
      );
      setError("");
    }
  }, [open, existing, type]);

  if (!open) return null;
  const isKh = type === "cambodia";
  const fields = isKh
    ? [
        ["code", "Branch Code *"],
        ["name", "Branch Name *"],
        ["province", "Province *"],
        ["district", "District"],
        ["commune", "Commune"],
        ["address", "Full Address"],
        ["map_url", "Google Map / Location (URL)"],
        ["contact_person", "Contact Person"],
        ["phone", "Phone Number"],
        ["opening_hours", "Opening Hours"],
      ]
    : [
        ["code", "Warehouse Code *"],
        ["name", "Warehouse Name *"],
        ["province", "Province / City"],
        ["address", "Full Address"],
        ["contact_person", "Contact Person"],
        ["phone", "Phone Number"],
      ];

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...v, type }, existing);
      onClose();
    } catch (err) {
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-md shadow-lg w-full max-w-lg max-h-[88vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            {existing ? "កែ" : "បង្កើត"}{" "}
            {isKh ? "Cambodia Branch" : "China Warehouse"}
          </h3>
        </div>
        <div className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}
          {fields.map(([key, label]) => (
            <div key={key}>
              <label className={LABEL_CLS}>{label}</label>
              <input
                value={v[key] ?? ""}
                disabled={key === "code" && !!existing}
                onChange={(e) => setV((x) => ({ ...x, [key]: e.target.value }))}
                className={`${INPUT_CLS} disabled:bg-mist-50 disabled:text-ink-600/60`}
              />
              {key === "code" && existing && (
                <p className="text-[11px] text-ink-600/50 mt-1">
                  Code មិនអាចប្តូរបានទេ ព្រោះ Order/TK ប្រើវាជាឯកសារយោង
                </p>
              )}
            </div>
          ))}
          <div>
            <label className={LABEL_CLS}>Status</label>
            <select
              value={v.status}
              onChange={(e) => setV((x) => ({ ...x, status: e.target.value }))}
              className={INPUT_CLS}
            >
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
          >
            {saving ? "កំពុងSave..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Customers whose DEFAULT China Warehouse / Cambodia Branch is this one.
// Assigning only changes the customer's default — never old orders.
function AssignedCustomers({ kind, wh, canManage }) {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = React.useCallback(async () => {
    setRows(await listCustomersByDefault(kind, wh.code));
  }, [kind, wh.code]);

  useEffect(() => {
    load();
  }, [load]);

  async function assign(customerCode, code) {
    setBusy(true);
    setError("");
    try {
      const old = await readCustomerDefaults(customerCode);
      await saveCustomerDefaults(customerCode, { [kind]: code });
      await logWarehouseChange({
        entity_type: "customer",
        ref: customerCode,
        field: kind === "kh" ? "default_kh_branch" : "default_china_wh",
        old_code: old[kind],
        new_code: code,
        changed_by: user?.name || "Admin",
        reason: code
          ? "Assigned from Warehouse Management"
          : "Removed from Warehouse Management",
      });
      setPicked(null);
      await load();
    } catch (err) {
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-signal-red">{error}</p>}
      {canManage && (
        <div className="border border-mist-200 rounded-md p-3 space-y-2">
          <CustomerPicker
            label="Assign Customer"
            strict
            value={picked}
            onChange={setPicked}
          />
          <button
            type="button"
            disabled={!picked || busy}
            onClick={() => assign(picked.customer_code, wh.code)}
            className="text-sm font-medium bg-signal-blue text-white px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {busy ? "កំពុង Assign..." : "Assign"}
          </button>
        </div>
      )}
      {rows === null ? (
        <SkeletonRegion className="border border-mist-200 rounded-md divide-y divide-mist-100">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-3.5 w-24" delay={i * 80} />
              <Skeleton className="h-3.5 w-40" delay={i * 80 + 40} />
            </div>
          ))}
        </SkeletonRegion>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-600/45">
          មិនទាន់មាន Customer ត្រូវបាន Assign ទេ
        </p>
      ) : (
        <div className="border border-mist-200 rounded-md divide-y divide-mist-100">
          {rows.map((c) => (
            <div
              key={c.customer_code}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <span className="text-ink-900">
                <b>{c.customer_code}</b>
                {c.name ? ` · ${c.name}` : ""}
              </span>
              {canManage && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => assign(c.customer_code, "")}
                  className="text-xs text-signal-red hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniTkTable({ rows }) {
  return (
    <div className="border border-mist-200 rounded-md overflow-hidden">
      <DataTable
        columns={[
          {
            key: "tk",
            label: "TK Number",
            strong: true,
            linkTo: (r) => `/packages/${r.tk}`,
          },
          { key: "customer", label: "Customer" },
          {
            key: "order_no",
            label: "Order ID",
            render: (r) => r.order_no || "—",
          },
          { key: "status", label: "Status", status: true },
        ]}
        rows={rows.slice(0, 20)}
      />
      {rows.length > 20 && (
        <div className="px-4 py-2 text-xs text-ink-600/50 border-t border-mist-100">
          បង្ហាញ 20 ក្នុងចំណោម {rows.length}
        </div>
      )}
    </div>
  );
}

function WarehouseDetailModal({ wh, canManage, onClose }) {
  const { packages } = usePackageTracking();
  const [tab, setTab] = useState("info");
  useEffect(() => setTab("info"), [wh?.id]);
  if (!wh) return null;

  const isKh = wh.type === "cambodia";
  const mine = packages.filter((p) =>
    isKh
      ? p.dest_branch_code === wh.code
      : p.origin_wh_code === wh.code ||
        (!p.origin_wh_code && p.warehouse === wh.code),
  );
  const early = ["Inbound Origin", "Outbound Origin"];
  const incoming = mine.filter((p) => early.includes(p.status));
  const arrived = mine.filter((p) => !early.includes(p.status));
  const tabs = isKh
    ? [
        ["info", "Details"],
        ["customers", "Assigned customers"],
        ["incoming", `Incoming (${incoming.length})`],
        ["arrived", `Arrived (${arrived.length})`],
      ]
    : [
        ["info", "Details"],
        ["customers", "Assigned customers"],
        ["tks", `TK (${mine.length})`],
      ];

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-3xl max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200">
          <div>
            <h3 className="font-display font-bold text-base text-ink-900">
              {wh.code} · {wh.name}
            </h3>
            <p className="text-xs text-ink-600/50 mt-0.5">
              {isKh ? "Cambodia Receiving Branch" : "China Warehouse"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge label={wh.status} />
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-mist-200 text-ink-600/60 hover:bg-mist-50"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex gap-1 px-5 pt-3 border-b border-mist-200 overflow-x-auto">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`text-sm px-3 py-2 border-b-2 whitespace-nowrap ${
                tab === key
                  ? "border-signal-blue text-signal-blue font-medium"
                  : "border-transparent text-ink-600/60 hover:text-ink-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "info" && (
            <InfoGrid
              items={[
                { label: "Code", value: wh.code },
                { label: "Country", value: wh.country || "—" },
                { label: "Province / City", value: wh.province || "—" },
                ...(isKh
                  ? [
                      { label: "District", value: wh.district || "—" },
                      { label: "Commune", value: wh.commune || "—" },
                    ]
                  : []),
                { label: "Full Address", value: wh.address || "—", span: true },
                ...(isKh
                  ? [
                      {
                        label: "Google Map",
                        value: wh.map_url ? (
                          <a
                            href={wh.map_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-signal-blue hover:underline"
                          >
                            បើកផែនទី
                          </a>
                        ) : (
                          "—"
                        ),
                      },
                      {
                        label: "Opening Hours",
                        value: wh.opening_hours || "—",
                      },
                    ]
                  : []),
                { label: "Contact Person", value: wh.contact_person || "—" },
                { label: "Phone", value: wh.phone || "—" },
                { label: "Created", value: formatIso(wh.created_at) },
                { label: "Updated", value: formatIso(wh.updated_at) },
              ]}
            />
          )}
          {tab === "customers" && (
            <AssignedCustomers
              kind={isKh ? "kh" : "china"}
              wh={wh}
              canManage={canManage}
            />
          )}
          {tab === "incoming" && <MiniTkTable rows={incoming} />}
          {tab === "arrived" && <MiniTkTable rows={arrived} />}
          {tab === "tks" && <MiniTkTable rows={mine} />}
        </div>
      </div>
    </div>
  );
}

function WarehouseManagementPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, "warehouse.manage");
  const wh = useWarehouses();
  const [tab, setTab] = useState("china");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null); // { existing }
  const [viewing, setViewing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const q = search.trim().toLowerCase();
  const rows = wh.rows.filter(
    (w) =>
      w.type === tab &&
      (!q ||
        [w.code, w.name, w.province, w.district, w.contact_person]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );
  const count = (t) => wh.rows.filter((w) => w.type === t).length;

  async function toggle(w) {
    setBusyId(w.id);
    setError("");
    try {
      await wh.setWarehouseStatus(
        w,
        w.status === "Active" ? "Disabled" : "Active",
      );
    } catch (err) {
      setError(err.message || "មិនអាចប្តូរ Status បានទេ");
    } finally {
      setBusyId(null);
    }
  }

  const linkBtn = "text-xs font-medium text-signal-blue hover:underline";
  const columns = [
    {
      key: "code",
      label: tab === "china" ? "Warehouse Code" : "Branch Code",
      strong: true,
    },
    { key: "name", label: "Name" },
    tab === "china"
      ? {
          key: "province",
          label: "Province / City",
          render: (r) => r.province || "—",
        }
      : {
          key: "location",
          label: "Province / District",
          render: (r) =>
            [r.province, r.district].filter(Boolean).join(" · ") || "—",
        },
    {
      key: "contact_person",
      label: "Contact",
      render: (r) => r.contact_person || "—",
    },
    { key: "phone", label: "Phone", render: (r) => r.phone || "—" },
    { key: "status", label: "Status", status: true },
    {
      key: "updated_at",
      label: "Updated",
      render: (r) => formatIso(r.updated_at),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={linkBtn}
            onClick={() => setViewing(r)}
          >
            View
          </button>
          {canManage && (
            <>
              <button
                type="button"
                className={linkBtn}
                onClick={() => setForm({ existing: r })}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                className={`text-xs font-medium hover:underline disabled:opacity-50 ${
                  r.status === "Active" ? "text-signal-red" : "text-signal-teal"
                }`}
                onClick={() => toggle(r)}
              >
                {r.status === "Active" ? "Disable" : "Activate"}
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-xl text-ink-900">
            Warehouse Management
          </h1>
          <p className="text-sm text-ink-600/55 mt-0.5">
            China Warehouse = ទីតាំងដែល Supplier ផ្ញើទំនិញមក · Cambodia Branch =
            ទីតាំងដែល Customer ទទួលទំនិញ
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setForm({ existing: null })}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90"
          >
            <Plus size={14} />
            {tab === "china" ? "China New Warehouse" : "Cambodia Branch ថ្មី"}
          </button>
        )}
      </div>

      {supabase && !wh.tableReady && !wh.loading && (
        <div className="flex items-start gap-2 text-sm text-[#8A5A12] bg-signal-amber/10 rounded-md px-3 py-2.5">
          <TriangleAlert size={14} className="shrink-0 mt-0.5" />
          {WH_TABLE_HINT} — កំពុងបង្ហាញទិន្នន័យគំរូ (មិនអាច Save បានទេ)។
        </div>
      )}
      {!canManage && (
        <div className="text-xs text-ink-600/55 bg-mist-50 rounded-md px-3 py-2">
          អ្នកមើលបានតែប៉ុណ្ណោះ — មានតែ Super Admin ទេដែលអាចបង្កើត/កែ/Disable។
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
          <TriangleAlert size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="cb-surface cb-card">
        <div className="flex items-center justify-between gap-3 flex-wrap px-4 lg:px-5 pt-3 border-b border-mist-200">
          <div className="flex gap-1">
            {[
              ["china", "China Warehouses"],
              ["cambodia", "Cambodia Branches"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`text-sm px-3 py-2 border-b-2 whitespace-nowrap ${
                  tab === key
                    ? "border-signal-blue text-signal-blue font-medium"
                    : "border-transparent text-ink-600/60 hover:text-ink-900"
                }`}
              >
                {label}{" "}
                <span className="ml-1 bg-mist-100 text-ink-700 text-[11px] px-1.5 py-0.5 rounded-md">
                  {count(key)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border border-mist-200 rounded-md px-3 py-1.5 mb-2 focus-within:border-signal-blue">
            <Search size={14} className="text-ink-600/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Code, Name, Province..."
              className="outline-none text-sm bg-transparent w-56"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={!wh.ready}
          skeletonRows={5}
        />
      </div>

      <WarehouseFormModal
        open={!!form}
        type={tab}
        existing={form?.existing || null}
        onClose={() => setForm(null)}
        onSave={wh.saveWarehouse}
      />
      <WarehouseDetailModal
        wh={viewing}
        canManage={canManage}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

// ------------------------------------------------------------
// pages/KhWarehousePage.jsx
// ------------------------------------------------------------
// Sidebar → Cambodia → "Cambodia Warehouse". This is the master list of
// Cambodia RECEIVING BRANCHES (សាខាទទួលទំនិញ). Customers must pick one of
// these Active branches when they create an address in the customer app
// (see Addresses in CustomerApp), and it becomes their default Receiving
// Branch for new orders.
function KhWarehousePage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, "warehouse.manage");
  const wh = useWarehouses();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null); // { existing }
  const [viewing, setViewing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const all = wh.rows.filter((w) => w.type === "cambodia");
  const q = search.trim().toLowerCase();
  const rows = all.filter(
    (w) =>
      !q ||
      [w.code, w.name, w.province, w.district, w.commune, w.address]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );

  async function toggle(w) {
    setBusyId(w.id);
    setError("");
    try {
      await wh.setWarehouseStatus(
        w,
        w.status === "Active" ? "Disabled" : "Active",
      );
    } catch (err) {
      setError(err.message || "មិនអាចប្តូរ Status បានទេ");
    } finally {
      setBusyId(null);
    }
  }

  const linkBtn = "text-xs font-medium text-signal-blue hover:underline";
  const columns = [
    { key: "name", label: "Name", strong: true },
    { key: "code", label: "Code" },
    { key: "province", label: "Province", render: (r) => r.province || "—" },
    {
      key: "address",
      label: "Address",
      render: (r) =>
        r.address ||
        [r.commune, r.district, r.province].filter(Boolean).join(", ") ||
        "—",
    },
    { key: "phone", label: "Phone", render: (r) => r.phone || "—" },
    { key: "status", label: "Status", status: true },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={linkBtn}
            onClick={() => setViewing(r)}
          >
            View
          </button>
          {canManage && (
            <>
              <button
                type="button"
                className={linkBtn}
                onClick={() => setForm({ existing: r })}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                className={`text-xs font-medium hover:underline disabled:opacity-50 ${
                  r.status === "Active" ? "text-signal-red" : "text-signal-teal"
                }`}
                onClick={() => toggle(r)}
              >
                {r.status === "Active" ? "Disable" : "Activate"}
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-xl text-ink-900">
            Cambodia Warehouse
          </h1>
          <p className="text-sm text-ink-600/55 mt-0.5">
            សាខាទទួលទំនិញនៅកម្ពុជា — Customer ត្រូវជ្រើសរើសសាខាទាំងនេះ
            នៅពេលបង្កើតអាសយដ្ឋាន
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setForm({ existing: null })}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90"
          >
            <Plus size={14} />
            Create
          </button>
        )}
      </div>

      {supabase && !wh.tableReady && !wh.loading && (
        <div className="flex items-start gap-2 text-sm text-[#8A5A12] bg-signal-amber/10 rounded-md px-3 py-2.5">
          <TriangleAlert size={14} className="shrink-0 mt-0.5" />
          {WH_TABLE_HINT} — កំពុងបង្ហាញទិន្នន័យគំរូ (មិនអាច Save បានទេ)។
        </div>
      )}
      {!canManage && (
        <div className="text-xs text-ink-600/55 bg-mist-50 rounded-md px-3 py-2">
          អ្នកមើលបានតែប៉ុណ្ណោះ — មានតែ Admin ទេដែលអាចបង្កើត/កែ/Disable។
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
          <TriangleAlert size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="cb-surface cb-card">
        <div className="flex items-center justify-between gap-3 flex-wrap px-4 lg:px-5 py-3 border-b border-mist-200">
          <div className="flex items-center gap-2 border border-mist-200 rounded-md px-3 py-1.5 focus-within:border-signal-blue">
            <Search size={14} className="text-ink-600/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name, Code, Province..."
              className="outline-none text-sm bg-transparent w-64"
            />
          </div>
          <span className="text-xs text-ink-600/55">
            {all.filter((w) => w.status === "Active").length} Active ·{" "}
            {all.length} Total
          </span>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          loading={!wh.ready}
          skeletonRows={5}
        />
      </div>

      <WarehouseFormModal
        open={!!form}
        type="cambodia"
        existing={form?.existing || null}
        onClose={() => setForm(null)}
        onSave={wh.saveWarehouse}
      />
      <WarehouseDetailModal
        wh={viewing}
        canManage={canManage}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

// ------------------------------------------------------------
// pages/WHArrivedPage.jsx
// ------------------------------------------------------------
// "W.H Arrived (Destination)" — Scan Arrive V2. A TK must already be at
// "Outbound Origin" (scanned out from the China warehouse — see
// QuickOutboundScan) before it can arrive here; scanning it queues it
// below, and Verify -> Confirm moves it to "Arrived Destination" (the
// same status CreateArrivalModal sets in bulk by Shipment). This is a
// per-TK alternative to that bulk flow, not a replacement for it.
function WHArrivedPage() {
  return (
    <ScanConfirmPage
      pageTitle="Warehouse Arrived (Destination)"
      scanTabLabel="Scan Arrive V2"
      modalTitle="Verify Scan Arrived"
      fromStatus="Outbound Origin"
      toStatus="Arrived Destination"
      alreadyDoneMessage="បានមកដល់រួចហើយ"
      scanPlaceholder="e.g. TK202609250041"
      nextStatus="Shipping To Branch"
      nextStatusLabel="Update → Shipping To Branch"
      allowRemeasure
    />
  );
}

// ------------------------------------------------------------
// pages/SortingPage.jsx
// ------------------------------------------------------------
// Cambodia-side receiving scan: confirms a TK that's just been driven in
// from the destination warehouse ("Shipping To Branch") as physically
// received at this branch, same scan -> Verify -> Confirm flow as
// W.H Arrived, moving it to "Inbound Warehouse" instead.
function SortingPage() {
  return (
    <ScanConfirmPage
      pageTitle="Sorting"
      scanTabLabel="Scan Sorting V2"
      modalTitle="Verify Scan Sorting"
      fromStatus="Shipping To Branch"
      toStatus="Inbound Warehouse"
      alreadyDoneMessage="ត្រូវបានទទួលរួចហើយ"
      scanPlaceholder="e.g. TK202609250041"
    />
  );
}

// ------------------------------------------------------------
// components/TransferOrderModal.jsx
// ------------------------------------------------------------
// Opens from an Order's detail page (see OrderDetail below). Typing a
// UID / Name / Phone shows the matched account's Information right
// away — no separate search step. Save reassigns the order's customer
// immediately, so the order disappears from the old customer and shows
// under the new one the moment it's confirmed.
function TransferOrderModal({ open, order, onClose, onTransferred }) {
  const [transferType, setTransferType] = useState("uid");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { matched, loading } = useCustomerLookup(transferType, query);

  useEffect(() => {
    if (open) {
      setTransferType("uid");
      setQuery("");
      setError("");
    }
  }, [open]);

  if (!open || !order) return null;

  const currentId = (order.customer || "").split(" · ")[0];
  const sameCustomer = Boolean(matched && matched.id === currentId);
  const canSubmit = Boolean(matched && !sameCustomer && !loading);

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const toLabel = `${matched.id} · ${matched.name}`;
      if (supabase) {
        const { error: updErr } = await supabase
          .from("orders")
          .update({ customer: toLabel })
          .eq("id", order.id);
        if (updErr) throw updErr;
      } else {
        // UI-only mode — there's no "/orders" list-page module anymore
        // (removed from the sidebar/MODULES), so just update the Order
        // Detail page's own mock record; nothing else needs to stay in
        // sync.
        if (ORDER_DETAILS[order.id]) {
          ORDER_DETAILS[order.id].customer = toLabel;
          ORDER_DETAILS[order.id].uid = matched.id.replace(/[^\d]/g, "");
        }
      }
      onTransferred(toLabel);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to transfer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-lg text-ink-900">
            Transfer Order
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-600/40 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <TransferAccountLookup
            transferType={transferType}
            onTransferTypeChange={(t) => {
              setTransferType(t);
              setQuery("");
            }}
            query={query}
            onQueryChange={setQuery}
            matched={matched}
            loading={loading}
            noteText="ការបញ្ជាទិញនេះឈានដល់ស្ថានភាព arrived destination។ បើអ្នកបានផ្ទេរវាទៅ User ផ្សេង សូម print ស្លាកPackage (order sticker) ម្តងទៀត។"
          />

          {matched && sameCustomer && (
            <p className="text-xs text-signal-red">
              This is already the same customer — please choose a different
              customer.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-700 border border-mist-200 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSubmit || saving}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {saving ? "Transferring..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/StatusBadge.jsx
// ------------------------------------------------------------
const RULES = [
  {
    tone: "teal",
    words: [
      "delivered",
      "released",
      "resolved",
      "done",
      "completed",
      "confirmed",
      "active",
      "cleared",
      "ready",
      "checked",
    ],
  },
  {
    tone: "red",
    words: [
      "missing",
      "damaged",
      "failed",
      "hold",
      "lost",
      "open",
      "rejected",
      "exception",
    ],
  },
  {
    tone: "amber",
    words: [
      "pending",
      "processing",
      "transit",
      "loading",
      "investigating",
      "inspection",
      "draft",
      "measuring",
    ],
  },
  {
    tone: "blue",
    words: [
      "inbound",
      "outbound",
      "created",
      "assigned",
      "scanned",
      "out for",
      "received",
    ],
  },
];

const TONE_CLASS = {
  teal: "bg-signal-teal/10 text-signal-teal",
  red: "bg-signal-red/10 text-signal-red",
  amber: "bg-signal-amber/15 text-[#B87415]",
  blue: "bg-signal-blue/10 text-signal-blue",
  gray: "bg-ink-900/5 text-ink-700",
};

function toneFor(label) {
  const l = (label || "").toLowerCase();
  for (const rule of RULES) {
    if (rule.words.some((w) => l.includes(w))) return rule.tone;
  }
  return "gray";
}

function StatusBadge({ label }) {
  const tone = toneFor(label);
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-sm whitespace-nowrap ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

// ------------------------------------------------------------
// components/DataTable.jsx
// ------------------------------------------------------------
function DataTable({
  columns,
  rows,
  loading = false,
  skeletonRows = 6,
  rowActions,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-mist-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left font-semibold text-[11px] uppercase tracking-wide text-ink-600/45 px-4 py-3 whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
            {rowActions && <th className="w-24 px-4 py-3" />}
          </tr>
        </thead>
        <tbody
          key={loading ? "sk" : "data"}
          aria-busy={loading || undefined}
          className={`divide-y divide-mist-100 ${loading ? "" : "cb-fade-in"}`}
        >
          {loading && (
            <SkeletonTableRows columns={columns} rows={skeletonRows} />
          )}
          {!loading &&
            rows.map((row, i) => (
              <tr key={i} className="hover:bg-mist-50/70 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 whitespace-nowrap text-ink-800"
                  >
                    {col.render ? (
                      col.render(row)
                    ) : col.status ? (
                      <StatusBadge label={row[col.key]} />
                    ) : col.linkTo ? (
                      <Link
                        to={col.linkTo(row)}
                        className="font-medium text-signal-blue hover:underline"
                      >
                        {row[col.key]}
                      </Link>
                    ) : col.strong ? (
                      <span className="font-medium text-ink-900">
                        {row[col.key]}
                      </span>
                    ) : (
                      row[col.key]
                    )}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (rowActions ? 1 : 0)}
                className="px-4 py-10 text-center text-ink-600/40 text-sm"
              >
                No data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------
// components/InfoGrid.jsx
// ------------------------------------------------------------
function InfoGrid({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
      {items.map((item) => (
        <div key={item.label} className={item.span ? "col-span-2" : ""}>
          <dt className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
            {item.label}
          </dt>
          <dd className="text-sm text-ink-900 font-medium mt-0.5">
            {item.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ------------------------------------------------------------
// components/Timeline.jsx
// ------------------------------------------------------------
const DOT_STYLE = {
  done: "bg-signal-teal border-signal-teal text-white",
  active: "bg-signal-blue border-signal-blue text-white",
  pending: "bg-white border-mist-200 text-transparent",
};

const LINE_STYLE = {
  done: "bg-signal-teal",
  active: "bg-mist-200",
  pending: "bg-mist-200",
};

function Timeline({ steps }) {
  return (
    <div>
      {steps.map((step, i) => (
        <div key={step.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${DOT_STYLE[step.state]} ${
                step.state === "active" ? "animate-pulse" : ""
              }`}
            >
              {step.state === "done" && <Check size={13} strokeWidth={3} />}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-0.5 flex-1 min-h-[28px] ${LINE_STYLE[step.state]}`}
              />
            )}
          </div>
          <div
            className={`pb-6 ${step.state === "pending" ? "opacity-45" : ""}`}
          >
            <div
              className={`text-sm ${
                step.state === "pending"
                  ? "text-ink-600"
                  : "font-medium text-ink-900"
              }`}
            >
              {step.label}
            </div>
            {step.time && (
              <div className="text-xs text-ink-600/50 mt-0.5">{step.time}</div>
            )}
            {step.state !== "pending" && (
              <div className="text-xs text-ink-600/40 mt-0.5">
                Proceed By: {step.proceedBy || "NA"}
              </div>
            )}
            {step.state === "active" && (
              <div className="text-xs text-signal-blue mt-0.5">
                កំពុងដំណើរការ
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// components/QRPlaceholder.jsx
// ------------------------------------------------------------
const SIZE = 7;

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function buildMatrix(seed) {
  const h = hashCode(seed);
  const matrix = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const finders = [
    [0, 0],
    [0, SIZE - 3],
    [SIZE - 3, 0],
  ];
  finders.forEach(([r, c]) => {
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) matrix[r + i][c + j] = true;
  });
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const inFinder = finders.some(
        ([fr, fc]) => r >= fr && r < fr + 3 && c >= fc && c < fc + 3,
      );
      if (inFinder) continue;
      matrix[r][c] = Math.abs(h * (r * 31 + c + 7)) % 5 < 2;
    }
  }
  return matrix;
}

function QRPlaceholder({ seed, size = 96 }) {
  const matrix = buildMatrix(seed);
  return (
    <div
      className="bg-white p-2 rounded-sm border border-mist-200 shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className="grid w-full h-full gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
      >
        {matrix.flat().map((filled, i) => (
          <div
            key={i}
            className={filled ? "bg-ink-900 rounded-[1px]" : "bg-white"}
          />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/StatCard.jsx
// ------------------------------------------------------------
const TONES = {
  blue: "bg-signal-blue/10 text-signal-blue",
  amber: "bg-signal-amber/10 text-[#B87415]",
  teal: "bg-signal-teal/10 text-signal-teal",
  red: "bg-signal-red/10 text-signal-red",
  ink: "bg-ink-900/5 text-ink-800",
};

function StatCard({ icon, label, value, unit, tone = "ink", delta }) {
  const Icon = Icons[icon] || Icons.Circle;
  return (
    <div className="cb-surface cb-card cb-stat p-4 shadow-panel">
      <div className="flex items-start justify-between">
        <div
          className={`w-9 h-9 rounded-sm flex items-center justify-center ${TONES[tone]}`}
        >
          <Icon size={18} strokeWidth={2.25} />
        </div>
        {delta && (
          <span
            className={`text-[11px] font-medium px-1.5 py-0.5 rounded-sm ${
              delta.startsWith("-")
                ? "bg-signal-red/10 text-signal-red"
                : "bg-signal-teal/10 text-signal-teal"
            }`}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="font-display text-2xl font-extrabold text-ink-900 tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-xs text-ink-600/50 font-medium">{unit}</span>
        )}
      </div>
      <div className="text-sm text-ink-600/60 mt-0.5">{label}</div>
    </div>
  );
}

// ------------------------------------------------------------
// components/RouteFlow.jsx
// ------------------------------------------------------------
// Previously a fixed 7-stage banner (Inbound Origin/QC/Outbound
// Origin/Transit/Cambodia Arrival/Customs/Delivery) with a hardcoded
// "Transit — 86 active" badge and hardcoded done/active/pending states.
// QC, Customs and "Cambodia Arrival" as separate stages, and the
// "Delivery" label, don't correspond to anything actually tracked
// anywhere else in this app (see PACKAGE_STAGES, used everywhere from
// Package Detail's Tracking Timeline to VERIFY_GATED_STAGES) — so there
// was no real data that could ever back them. This now mirrors
// PACKAGE_STAGES exactly, with each bubble showing the real live count of
// packages currently sitting at that stage.
const STATE_STYLE = {
  done: "bg-signal-teal border-signal-teal text-white",
  active: "bg-signal-blue border-signal-blue text-white",
  pending: "bg-white border-mist-200 text-ink-600/40",
};

function RouteFlow() {
  const { packages } = usePackageTracking();
  const stages = PACKAGE_STAGES.filter((label) => label !== "Completed");

  const counts = stages.reduce((acc, label) => {
    acc[label] = packages.filter((p) => p.status === label).length;
    return acc;
  }, {});

  // The stage the banner calls out as "active" is the furthest-along
  // stage that currently has any live packages sitting in it.
  let activeIndex = 0;
  for (let i = stages.length - 1; i >= 0; i--) {
    if (counts[stages[i]] > 0) {
      activeIndex = i;
      break;
    }
  }
  const activeLabel = stages[activeIndex];
  const activeCount = counts[activeLabel];

  return (
    <div className="cb-route p-5 lg:p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-white font-display font-bold text-base">
            China → Cambodia Pipeline
          </div>
          <div className="text-mist-100/45 text-xs mt-0.5">
            Current cross-border shipment status
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-signal-blue bg-signal-blue/15 px-2.5 py-1 rounded-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-blue animate-pulse" />
          {activeLabel} — {activeCount} active
        </div>
      </div>

      <div className="flex items-center min-w-[720px]">
        {stages.map((label, i) => {
          const state =
            i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <div
              key={label}
              className="flex items-center flex-1 last:flex-none"
            >
              <div className="flex flex-col items-center gap-2 w-24 shrink-0">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold tabular-nums ${STATE_STYLE[state]}`}
                >
                  {counts[label]}
                </div>
                <span className="text-[11px] text-center leading-tight text-mist-100/70">
                  {label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded-full ${
                    state === "done" ? "bg-signal-teal" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/Sidebar.jsx
// ------------------------------------------------------------
function Icon({ name, ...props }) {
  const Cmp = Icons[name] || Icons.Circle;
  return <Cmp {...props} />;
}

function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  return (
    <>
      {/* mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`cb-sidebar fixed z-40 inset-y-0 left-0 w-64 text-mist-100 flex flex-col
          transform transition-transform duration-200 lg:static lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-sm bg-signal-blue flex items-center justify-center">
            <Icons.Waypoints size={18} className="text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-white text-sm tracking-tight">
              Cargo Bridge
            </div>
            <div className="text-[11px] text-mist-100/50">
              CN → KH Logistics
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_SECTIONS.map((section, i) => {
            const items = section.items.filter(
              (item) =>
                user?.allowedPaths === "*" ||
                user?.allowedPaths?.includes(item.path),
            );
            if (items.length === 0) return null;
            return (
              <div key={i}>
                {section.label && (
                  <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mist-100/35">
                    {section.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                          isActive
                            ? "cb-active text-white font-medium"
                            : "text-mist-100/70 hover:bg-white/5 hover:text-white"
                        }`
                      }
                    >
                      <Icon
                        name={item.icon}
                        size={16}
                        strokeWidth={2}
                        className="shrink-0"
                      />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-white/10 text-[11px] text-mist-100/40">
          v0.1 · Frontend skeleton
        </div>
      </aside>
    </>
  );
}

// ------------------------------------------------------------
// components/Topbar.jsx
// ------------------------------------------------------------
function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const menuRef = useRef(null);

  // Global "TK, Order, Container" search — sends the query to Shipment
  // Lookup, which does the actual matching (TK, Customer ID, Order ID,
  // Shipment ID) and renders the results as an Order List.
  function handleGlobalSearch(e) {
    e.preventDefault();
    const q = globalSearch.trim();
    if (!q) return;
    navigate(`/shipment-lookup?q=${encodeURIComponent(q)}`);
  }

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="cb-topbar h-16 shrink-0 flex items-center gap-4 px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-sm hover:bg-mist-100 text-ink-800"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="cb-page-title font-display font-bold text-lg text-ink-900 hidden sm:block">
        {title}
      </h1>

      <div className="flex-1" />

      <form
        onSubmit={handleGlobalSearch}
        className="hidden md:flex items-center gap-2 bg-mist-100 rounded-md px-3 py-2 w-64"
      >
        <button
          type="submit"
          className="shrink-0 text-ink-600/50 hover:text-ink-900"
          aria-label="Search"
        >
          <Search size={16} />
        </button>
        <input
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="bg-transparent outline-none text-sm text-ink-900 placeholder:text-ink-600/40 w-full"
          placeholder="Search TK, Order, Container..."
        />
      </form>

      <button
        onClick={() => navigate("/notifications")}
        className="relative p-2 rounded-sm hover:bg-mist-100 text-ink-700"
      >
        <Bell size={19} />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-signal-red" />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-mist-100"
        >
          <div className="w-8 h-8 rounded-full bg-ink-800 text-white text-xs font-semibold flex items-center justify-center">
            {initials}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="text-sm font-medium text-ink-900 capitalize">
              {displayName}
            </div>
            <div className="text-[11px] text-ink-600/50">Admin</div>
          </div>
          <ChevronDown size={15} className="text-ink-600/50 hidden sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-mist-200 rounded-md shadow-lg py-1.5 z-50">
            <div className="px-3.5 py-2 border-b border-mist-100">
              <div className="text-sm font-medium text-ink-900 truncate">
                {displayName}
              </div>
              <div className="text-xs text-ink-600/50 truncate">
                {user?.email}
              </div>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                setShowAccount(true);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-mist-50 text-left"
            >
              <UserRound size={15} />
              My Account
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-signal-red hover:bg-signal-red/5 text-left"
            >
              <LogOut size={15} />
              Log out
            </button>
          </div>
        )}
      </div>

      {showAccount && (
        <div
          className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
          onClick={() => setShowAccount(false)}
        >
          <div
            className="bg-white rounded-md shadow-lg w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-base text-ink-900 mb-4">
              My Account
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-ink-800 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-ink-900 capitalize truncate">
                  {displayName}
                </div>
                <div className="text-xs text-ink-600/55 truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAccount(false)}
              className="w-full text-sm font-medium text-center border border-mist-200 py-2 rounded-md hover:bg-mist-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

// ------------------------------------------------------------
// components/Layout.jsx
// ------------------------------------------------------------
function useCurrentTitle() {
  const { pathname } = useLocation();
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.path === pathname) return item.label;
    }
  }
  return "Dashboard";
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = useCurrentTitle();

  return (
    <div className="cb-app h-screen flex bg-[#f4f7fb]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/ProtectedRoute.jsx
// ------------------------------------------------------------
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AppShellSkeleton />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowed =
    user.allowedPaths === "*" ||
    user.allowedPaths?.includes(location.pathname) ||
    // detail pages (e.g. /containers/MSCU1234567) follow their list page
    user.allowedPaths?.some(
      (p) => p !== "/" && location.pathname.startsWith(`${p}/`),
    );

  if (!allowed) {
    // Send the user to the first page their role can open (no redirect loop
    // when even the Dashboard is not allowed).
    const fallback = firstAllowedPath(user);
    if (fallback && fallback !== location.pathname)
      return <Navigate to={fallback} replace />;
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-mist-50 gap-2">
        <span className="text-sm text-ink-600/70">
          You do not have permission to view this page.
        </span>
        <span className="text-xs text-ink-600/45">
          Contact a Super Admin to update your role.
        </span>
      </div>
    );
  }

  return children;
}

// ------------------------------------------------------------
// lib/tableData.js
// ------------------------------------------------------------
// Every module path maps 1:1 to a Supabase table (e.g. "/customer-accounts"
// -> table "customer_accounts"). Create these tables in your Supabase
// project (see supabase/schema.sql) with columns matching each module's
// `columns` config in MODULES above.
function pathToTable(path) {
  return path.replace(/^\//, "").replace(/-/g, "_");
}

// The `customers` table's real primary key is a uuid `id` — the
// human-readable, sequential Customer ID (KH-000001, KH-000002, ...)
// that should actually be shown/searched everywhere lives in its own
// `customer_code` column, generated by the DB trigger described in
// supabase/schema.sql. Alias it onto `id` in every customers query so
// the rest of the app (columns config, DataTable, CreateRowModal, the
// transfer lookups) can keep reading `row.id` without knowing the
// difference — and never fetch the raw uuid for display.
const CUSTOMERS_DISPLAY_SELECT =
  "id:customer_code, name, email, phone, warehouse, status, created_at";

// Loads rows for a module from Supabase. If Supabase isn't configured, or
// the table doesn't exist yet / errors out, it falls back to the mock rows
// from MODULES so the UI never breaks.
function useTableRows(path, fallbackRows) {
  const tableName = pathToTable(path);
  const isCustomers = path === "/customers";
  const [rows, setRows] = usePersistentState(
    `cargo_bridge_${tableName}`,
    fallbackRows,
  );
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(!supabase); // first fetch finished
  const [usingLiveData, setUsingLiveData] = useState(false);

  const refetch = React.useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select(isCustomers ? CUSTOMERS_DISPLAY_SELECT : "*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    setReady(true);
    if (!error && data) {
      setRows(data);
      setUsingLiveData(true);
    }
    // On error (e.g. table not created yet), silently keep showing the
    // mock rows — no need to break the page over a missing table.
  }, [tableName, isCustomers]);

  useEffect(() => {
    setReady(!supabase);
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  async function addRow(values) {
    if (supabase) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(values)
        .select(isCustomers ? CUSTOMERS_DISPLAY_SELECT : "*")
        .single();
      if (error) throw error;
      setRows((prev) => [data, ...prev]);
      setUsingLiveData(true);
      return data;
    }
    // UI-only mode: just prepend locally so the page still feels alive.
    setRows((prev) => [values, ...prev]);
    return values;
  }

  function prependRow(row) {
    setRows((prev) => [row, ...prev]);
  }

  // Super Admin edit/delete (permission is enforced in the UI; add RLS in
  // Supabase for real protection). Customers are keyed by `customer_code`
  // (aliased onto `id`), every other table by its `id`.
  const keyColumn = isCustomers ? "customer_code" : "id";
  const sameRow = (a, b) => a === b || (a?.id !== undefined && a?.id === b?.id);

  async function updateRow(row, patch) {
    if (supabase && row?.id !== undefined) {
      const { data, error } = await supabase
        .from(tableName)
        .update(patch)
        .eq(keyColumn, row.id)
        .select(isCustomers ? CUSTOMERS_DISPLAY_SELECT : "*")
        .single();
      if (error) throw error;
      setRows((prev) => prev.map((r) => (sameRow(r, row) ? data : r)));
      return data;
    }
    const merged = { ...row, ...patch };
    setRows((prev) => prev.map((r) => (sameRow(r, row) ? merged : r)));
    return merged;
  }

  async function deleteRow(row) {
    if (supabase && row?.id !== undefined) {
      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq(keyColumn, row.id)
        .select();
      if (error) throw error;
      if (!data?.length)
        throw new Error("Server មិនអនុញ្ញាតឱ្យលុបទេ (គ្មានសិទ្ធិ Super Admin)");
    }
    setRows((prev) => prev.filter((r) => !sameRow(r, row)));
  }

  return {
    rows,
    loading,
    ready,
    usingLiveData,
    refetch,
    addRow,
    prependRow,
    updateRow,
    deleteRow,
    tableName,
  };
}

function exportRowsToCSV(filename, columns, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(r[c.key])).join(","))
    .join("\n");
  const blob = new Blob([`${header}\n${body}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const PAGE_SIZE = 10;

// ------------------------------------------------------------
// components/CreateRowModal.jsx
// ------------------------------------------------------------
function CreateRowModal({
  open,
  title,
  columns,
  existingRows,
  onClose,
  onSubmit,
}) {
  const editableColumns = columns.filter((c) => c.key !== "id");
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function statusOptions(key) {
    return [...new Set(existingRows.map((r) => r[key]).filter(Boolean))];
  }

  useEffect(() => {
    if (open) {
      // Pre-select the first status option for any status column so a
      // freshly scanned/created row never sits with a blank Status badge.
      const defaults = {};
      editableColumns.forEach((c) => {
        if (c.status) {
          const opts = statusOptions(c.key);
          if (opts.length > 0) defaults[c.key] = opts[0];
        }
      });
      setValues(defaults);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            {title}
          </h3>
        </div>
        <div className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}
          {editableColumns.map((c) => {
            const options = c.status ? statusOptions(c.key) : null;
            return (
              <div key={c.key}>
                <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
                  {c.label}
                </label>
                {options && options.length > 0 ? (
                  <select
                    value={values[c.key] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [c.key]: e.target.value }))
                    }
                    className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
                  >
                    <option value="" disabled>
                      ជ្រើសរើស...
                    </option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={values[c.key] ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [c.key]: e.target.value }))
                    }
                    className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
          >
            {saving ? "កំពុងSave..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// components/CreateStaffUserModal.jsx
// ------------------------------------------------------------
// Used only for the /users module. Unlike CreateRowModal (which inserts
// straight into a table), this calls the "create-staff-user" Edge
// Function so the Auth account (Email + Password) and the `users`
// profile row get created together, atomically, with the service_role
// key staying server-side. See supabase/functions/create-staff-user.
function CreateStaffUserModal({ open, existingRows, onClose, onCreated }) {
  const [values, setValues] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();
  useRoles(); // re-render when roles change
  const { rows: whRows } = useWarehouses();
  // Super Admin: any role. Others: only roles below their own level.
  const roleOptions = assignableRoles(user);
  const selectedRole = roleOptions.find((r) => r.name === values.role);
  const selectedDept = DEPARTMENTS.find((d) => d.name === values.department);
  const whOptions = whRows.filter(
    (w) =>
      w.status !== "Inactive" &&
      (!selectedDept?.country || w.type === selectedDept.country),
  );

  useEffect(() => {
    if (open) {
      setValues({ status: "Active" });
      setError("");
    }
  }, [open]);

  if (!open) return null;

  function set(key, val) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      requirePermission(user, "user.create");
      assertCanAssignRole(user, values.role);
      if (selectedRole && selectedRole.scope !== "GLOBAL" && !values.department)
        throw new Error("សូមជ្រើសរើស Department");
      if (
        selectedRole &&
        ["WAREHOUSE", "BRANCH", "TEAM", "SELF"].includes(selectedRole.scope) &&
        !values.warehouse_code
      )
        throw new Error("សូមជ្រើសរើស Warehouse / Branch");
      if (!supabase) {
        // UI-only mode: no Edge Function to call — just add it locally
        // like every other mock module so the page still feels alive.
        onCreated({
          name: values.name,
          role: values.role,
          department: values.department || "",
          warehouse_code: values.warehouse_code || "",
          email: values.email,
          status: values.status || "Active",
        });
        onClose();
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-staff-user",
        {
          body: values,
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`,
          },
        },
      );
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Department / warehouse scope (needs users.department and
      // users.warehouse_code columns — see lib/permissions.js).
      await supabase
        .from("users")
        .update({
          department: values.department || null,
          warehouse_code: values.warehouse_code || null,
        })
        .eq("email", values.email);
      onCreated({
        ...data.data,
        department: values.department || "",
        warehouse_code: values.warehouse_code || "",
      });
      onClose();
    } catch (err) {
      setError(err.message || "មិនអាចបង្កើត user បានទេ");
    } finally {
      setSaving(false);
    }
  }

  const statusOptions = [
    ...new Set(existingRows.map((r) => r.status).filter(Boolean)),
  ];

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            New User
          </h3>
        </div>
        <div className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Name
            </label>
            <input
              required
              value={values.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Role
            </label>
            <select
              required
              value={values.role ?? ""}
              onChange={(e) => set("role", e.target.value)}
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            >
              <option value="" disabled>
                ជ្រើសរើស...
              </option>
              {roleOptions.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.level == null ? r.name : `${r.name} (Level ${r.level})`}
                </option>
              ))}
            </select>
            {selectedRole && (
              <p className="text-xs text-ink-600/45 mt-1">
                Data scope: {selectedRole.scope} —{" "}
                {SCOPE_HINT[selectedRole.scope]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Department
            </label>
            <select
              required={!!selectedRole && selectedRole.scope !== "GLOBAL"}
              value={values.department ?? ""}
              onChange={(e) => {
                const d = DEPARTMENTS.find((x) => x.name === e.target.value);
                setValues((v) => ({
                  ...v,
                  department: e.target.value,
                  // drop a warehouse that no longer matches the department
                  warehouse_code:
                    d?.country &&
                    whRows.find((w) => w.code === v.warehouse_code)?.type !==
                      d.country
                      ? ""
                      : v.warehouse_code,
                }));
              }}
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            >
              <option value="">—</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Warehouse / Branch
            </label>
            <select
              required={
                !!selectedRole &&
                ["WAREHOUSE", "BRANCH", "TEAM", "SELF"].includes(
                  selectedRole.scope,
                )
              }
              value={values.warehouse_code ?? ""}
              onChange={(e) => set("warehouse_code", e.target.value)}
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            >
              <option value="">—</option>
              {whOptions.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Email
            </label>
            <input
              required
              type="email"
              value={values.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Password
            </label>
            <div className="relative">
              <input
                required
                minLength={8}
                type={showPassword ? "text" : "password"}
                value={values.password ?? ""}
                onChange={(e) => set("password", e.target.value)}
                placeholder="យ៉ាងតិច 8 តួអក្សរ"
                className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 pr-9 text-sm outline-none focus:border-signal-blue"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-600/40 hover:text-ink-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-ink-600/45 mt-1">
              ផ្តល់ password នេះទៅ staff ដោយផ្ទាល់ (SMS/Telegram) — កុំផ្ញើតាម
              email ធម្មតា។
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              value={values.status ?? "Active"}
              onChange={(e) => set("status", e.target.value)}
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            >
              {(statusOptions.length
                ? statusOptions
                : ["Active", "Suspended"]
              ).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
          >
            {saving ? "កំពុងបង្កើត..." : "បង្កើត User"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// components/CreateTransferModal.jsx
// ------------------------------------------------------------
// Used only for /customer-transfer. The admin must look up the TK (to
// find its current customer) and pick a NEW customer from a live search
// list — free-typing an unmatched customer never enables Confirm. On
// submit this both logs the transfer row AND moves the package's own
// `customer` field, so the TK stops showing under the old customer
// immediately instead of only appearing in a separate transfer log.
// Moves a TK to another customer. Updates the label (packages.customer),
// the real owner (packages.customer_id — what the customer sidebar, the
// customer app and RLS read) and the TK's Order. The Order moves only when
// no other TK of that order stays with the previous customer; otherwise it
// stays where it is. Returns { orderNo, orderMoved }.
async function moveTkToCustomer({
  tk,
  toCustomer,
  toLabel,
  upsertPackage,
  packages,
}) {
  const newId = toCustomer?.uuid || null;
  if (supabase) {
    const { data: before, error: readErr } = await supabase
      .from("packages")
      .select("order_no")
      .eq("tk", tk)
      .maybeSingle();
    if (readErr) throw readErr;
    const patch = { customer: toLabel };
    if (newId) patch.customer_id = newId;
    const { error: updErr } = await supabase
      .from("packages")
      .update(patch)
      .eq("tk", tk);
    if (updErr) throw updErr;
    if (newId)
      await supabase
        .from("cargo_photos")
        .update({ customer_id: newId })
        .eq("tk", tk);
    const orderNo = before?.order_no || null;
    if (!orderNo || !newId) return { orderNo, orderMoved: false };
    const { count } = await supabase
      .from("packages")
      .select("tk", { count: "exact", head: true })
      .eq("order_no", orderNo)
      .neq("tk", tk)
      .neq("customer_id", newId);
    if (count) return { orderNo, orderMoved: false };
    const { error: ordErr } = await supabase
      .from("orders")
      .update({ customer_id: newId, customer: toLabel })
      .eq("order_no", orderNo);
    if (ordErr) throw ordErr;
    return { orderNo, orderMoved: true };
  }

  // UI-only mode
  const pkg = (packages || []).find((x) => x.tk === tk);
  await upsertPackage({
    tk,
    customer: toLabel,
    ...(newId ? { customer_id: newId } : {}),
  });
  const orderNo = pkg?.order_no || null;
  if (!orderNo) return { orderNo, orderMoved: false };
  const stays = (packages || []).some(
    (x) => x.order_no === orderNo && x.tk !== tk && x.customer !== toLabel,
  );
  if (stays) return { orderNo, orderMoved: false };
  writeLocalOrders(
    readLocalOrders().map((o) =>
      o.order_no === orderNo
        ? { ...o, customer: toLabel, ...(newId ? { customer_id: newId } : {}) }
        : o,
    ),
  );
  return { orderNo, orderMoved: true };
}

function CreateTransferModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const { findPackage, upsertPackage, packages } = usePackageTracking();
  const [tk, setTk] = useState("");
  const [tkChecked, setTkChecked] = useState(false);
  const [fromLabel, setFromLabel] = useState(null);
  const [reason, setReason] = useState("");
  const [transferType, setTransferType] = useState("uid");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { matched: selectedCustomer, loading: customerLoading } =
    useCustomerLookup(transferType, query);

  useEffect(() => {
    if (open) {
      setTk("");
      setTkChecked(false);
      setFromLabel(null);
      setReason("");
      setTransferType("uid");
      setQuery("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  // Find which customer currently owns this TK — matches the
  // "KH-000582 · Sothon Shop" combined format /packages already uses.
  async function checkTk() {
    if (!tk.trim()) return;
    if (supabase) {
      const { data } = await supabase
        .from("packages")
        .select("customer")
        .eq("tk", tk.trim())
        .maybeSingle();
      setFromLabel(data?.customer || null);
    } else {
      // Read from the live shared registry (same source Packages/TK and
      // Package Detail read from) instead of the static MODULES mock
      // rows — otherwise a real scanned TK (not one of the 5 sample rows)
      // is never found here even though it's visible everywhere else.
      const record = findPackage(tk.trim());
      setFromLabel(record?.customer || null);
    }
    setTkChecked(true);
  }

  // selectedCustomer comes from useCustomerLookup above — same UID /
  // Name / Phone lookup as the per-order Transfer modal, querying the
  // real customers table when Supabase is connected.
  const toLabel = selectedCustomer
    ? `${selectedCustomer.id} · ${selectedCustomer.name}`
    : null;
  const sameCustomer = Boolean(toLabel && fromLabel && toLabel === fromLabel);
  const canSubmit = Boolean(
    tkChecked &&
    fromLabel &&
    selectedCustomer &&
    !sameCustomer &&
    !customerLoading,
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        tk: tk.trim(),
        from: fromLabel,
        to: toLabel,
        reason: reason || null,
        approvedBy: user?.name || null,
        status: "Resolved",
      };

      if (supabase) {
        // Move the package (and its order) to the new customer first...
        await moveTkToCustomer({
          tk: tk.trim(),
          toCustomer: selectedCustomer,
          toLabel,
        });

        // ...then log the transfer for audit history.
        const { data: row, error: insErr } = await supabase
          .from("customer_transfer")
          .insert(payload)
          .select()
          .single();
        if (insErr) throw insErr;
        onCreated(row);
      } else {
        // UI-only mode: write the new customer onto the shared package
        // registry (same store Packages/TK and Package Detail read from
        // via usePackageTracking/findPackage) instead of mutating the
        // static MODULES mock rows, which nothing actually renders from.
        await moveTkToCustomer({
          tk: tk.trim(),
          toCustomer: selectedCustomer,
          toLabel,
          upsertPackage,
          packages,
        });
        onCreated(payload);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Unable to transfer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            New Transfer
          </h3>
        </div>
        <div className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              TK Number
            </label>
            <input
              required
              value={tk}
              onChange={(e) => {
                setTk(e.target.value);
                setTkChecked(false);
                setFromLabel(null);
              }}
              onBlur={checkTk}
              placeholder="TK202609250041"
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            />
            {tkChecked && (
              <p
                className={`text-xs mt-1 ${fromLabel ? "text-ink-600/55" : "text-signal-red"}`}
              >
                {fromLabel
                  ? `From: ${fromLabel}`
                  : "TK not found នេះទេ — សូមពិនិត្យលេខម្តងទៀត"}
              </p>
            )}
          </div>

          <TransferAccountLookup
            transferType={transferType}
            onTransferTypeChange={(t) => {
              setTransferType(t);
              setQuery("");
            }}
            query={query}
            onQueryChange={setQuery}
            matched={selectedCustomer}
            loading={customerLoading}
            noteText="This transfer takes effect immediately — the TK will be removed from the original customer and appear under the new customer."
          />
          {selectedCustomer && sameCustomer && (
            <p className="text-xs text-signal-red">
              This is already the same customer — please choose a different
              customer.
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Reason
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Wrong Customer ID..."
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Transferring..." : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// components/ListPage.jsx
// ------------------------------------------------------------
// Packages / TK, Inbound Origin, Outbound Origin and Sorting describe the
// same physical TKs at different stages, so — unlike every other module
// here, which owns its own independent mock table — these four read and
// write the one shared package registry (see PackageTrackingContext)
// instead of a separate table per page.
const LINKED_TK_PATHS = [
  "/packages",
  "/inbound-origin",
  "/outbound-origin",
  "/sorting",
];

// Each of these three pages is a live, stage-specific slice of the same
// registry — a TK sits on exactly ONE of them at a time (matching its
// current `status`), and drops off automatically once advance() moves it
// past that stage (see PackageTrackingContext). "/packages" is the one
// exception: it's the master directory, so it always lists every TK
// regardless of stage.
//
// Arrival, Customs, Cambodia Warehouse and Delivery are NOT included
// here: their columns (container/port/arrivalDate, declaration/office,
// container/expected/scanned, delivery-id/driver) describe a container,
// customs declaration, or delivery batch — not an individual TK — so a
// package's own status advancing has no single row on those pages to
// move into. Wiring them the same way would mean redesigning each of
// those pages into a per-TK list first.
const STAGE_LIST_PAGES = {
  "/inbound-origin": "Inbound Origin",
  "/outbound-origin": "Outbound Origin",
  "/sorting": "Inbound Warehouse",
};

// ------------------------------------------------------------
// components/QuickOutboundScan.jsx
// ------------------------------------------------------------
// Outbound Origin scan flow:
//   Scan TK → Validate TK → Select existing Container OR Create new
//   Container (auto CNT number) → Assign TK → TK becomes Outbound Origin
//
// No Container Number is typed by hand. Validation reuses the Container
// module's own TK rules (checkTkForContainer), the container list only
// offers containers that can still accept TKs, and the actual writes go
// through the existing store (addTks / createContainer) and the existing
// stage write path (addRow → addLinkedRow), so TK status rules and the
// Container lifecycle are untouched. Container status and TK status stay
// separate: assigning never moves a container, and the TK only ever goes
// to Outbound Origin here (never Arrived / any Cambodia status).
const OB_CSS = `
@keyframes cb-ob-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.cb-ob-in{animation:cb-ob-in .22s cubic-bezier(.2,.7,.2,1) both}
@media (prefers-reduced-motion:reduce){.cb-ob-in{animation:none}}
`;

const pad0 = (n, w = 2) => String(n).padStart(w, "0");

// CNT + YYYYMMDD + 3-digit daily sequence, e.g. CNT20260930001.
// `skip` lets the caller step past a number that turned out to be taken.
function generateContainerNumber(containers, skip = 0) {
  const d = new Date();
  const prefix = `CNT${d.getFullYear()}${pad0(d.getMonth() + 1)}${pad0(d.getDate())}`;
  let max = 0;
  (containers || []).forEach((c) => {
    const no = String(c.container_number || "").toUpperCase();
    if (!no.startsWith(prefix)) return;
    const n = parseInt(no.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${pad0(max + 1 + skip, 3)}`;
}

// Containers that can still take a TK at Outbound Origin: not cancelled /
// departed / arrived / sealed, and both warehouses still Active (the same
// things departChina and addTks insist on).
function eligibleOutboundContainers(containers, whRows) {
  const okWh = (code, type) => !whRows.length || whIsActive(whRows, code, type);
  return (containers || [])
    .filter((c) => {
      if (!CONTAINER_TK_EDITABLE.includes(normContainerStatus(c.status)))
        return false;
      if (c.departed_at || c.sealed_at || c.seal_number) return false;
      if (!String(c.container_number || "").trim()) return false;
      return (
        okWh(c.origin_wh_code, "china") && okWh(c.dest_wh_code, "cambodia")
      );
    })
    .sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || "")),
    );
}

// TK-only validation (no container chosen yet). Same rules as adding a TK
// to a container, plus: a TK sitting in any active container the user
// can't see is still "already assigned".
function checkTkForOutbound({ raw, packages, activeItems, containers }) {
  const key = tkKey(raw);
  const pkg = packages.find((p) => tkKey(p.tk) === key);
  const stray = pkg && activeItems.find((i) => tkKey(i.tk) === key);
  if (stray) {
    const c = containers.find((x) => x.id === stray.container_id);
    if (!c || c.status !== "Cancelled")
      return {
        ok: false,
        pkg,
        error: `TK ${pkg.tk} ត្រូវបានដាក់ក្នុង Container ${c?.container_number || "ផ្សេង"} រួចហើយ`,
      };
  }
  return checkTkForContainer({
    raw,
    container: { id: null, container_number: "", status: "Empty" },
    packages,
    activeItems,
    containers,
  });
}

function outboundContainerDefaults(pkg, whRows) {
  const china = whRows.filter(
    (w) => w.type === "china" && w.status === "Active",
  );
  const kh = whRows.filter(
    (w) => w.type === "cambodia" && w.status === "Active",
  );
  const o = pkg?.origin_wh_code || pkg?.warehouse;
  const d = pkg?.dest_branch_code;
  return {
    origin_wh_code: china.some((w) => w.code === o)
      ? o
      : china.length === 1
        ? china[0].code
        : "",
    dest_wh_code: kh.some((w) => w.code === d)
      ? d
      : kh.length === 1
        ? kh[0].code
        : "",
    container_type: "40HQ",
    shipping_method: "Sea",
  };
}

function OutboundStepper({ idx }) {
  const steps = ["Scan TK", "Container", "Outbound"];
  return (
    <ol className="flex items-center gap-1.5 text-[11px] font-medium">
      {steps.map((label, i) => {
        const done = i < idx || idx === 2;
        const active = i === idx && idx !== 2;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border transition-colors duration-200 ${
                done
                  ? "bg-signal-teal/10 text-signal-teal border-signal-teal/25"
                  : active
                    ? "bg-signal-blue/10 text-signal-blue border-signal-blue/30"
                    : "bg-white text-ink-600/45 border-mist-200"
              }`}
            >
              {done ? <Check size={11} /> : <span>{i + 1}</span>}
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="w-3 h-px bg-mist-200" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function QuickOutboundScan({ addRow, initialTk = "", focusKey = 0 }) {
  const { user } = useAuth();
  const store = useContainerStore();
  const { packages } = usePackageTracking();
  const canAssign = hasPermission(user, "container.manage");
  const scan = useScanFeedback();

  const [value, setValue] = useState(initialTk);
  const [stage, setStage] = useState("scan"); // scan | assign
  const [pkg, setPkg] = useState(null);
  const [mode, setMode] = useState("existing"); // existing | new
  const [pickId, setPickId] = useState("");
  const [lastId, setLastId] = useState(""); // last container used this session
  const [q, setQ] = useState("");
  const [form, setForm] = useState(() =>
    outboundContainerDefaults(null, store.whRows),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [justDone, setJustDone] = useState(false);
  const debounceTimer = useRef(null);
  const doneTimer = useRef(null);
  const validatedKey = pkg ? tkKey(pkg.tk) : "";

  useEffect(() => () => clearTimeout(doneTimer.current), []);
  // The page's "Scan TK" button just puts the cursor back in the scan box.
  useEffect(() => {
    if (focusKey) scan.focusInput(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const eligible = React.useMemo(
    () => eligibleOutboundContainers(store.containers, store.whRows),
    [store.containers, store.whRows],
  );
  const cards = React.useMemo(
    () =>
      eligible.map((c) => ({
        c,
        s: summarizeTks(tkRowsFor(c, store.activeItems, packages)),
      })),
    [eligible, store.activeItems, packages],
  );
  const shown = q.trim()
    ? cards.filter(({ c }) =>
        `${c.container_number} ${c.origin_wh_code} ${c.dest_wh_code}`
          .toLowerCase()
          .includes(q.trim().toLowerCase()),
      )
    : cards;
  const picked = eligible.find((c) => c.id === pickId) || null;
  const chinaWh = store.whRows.filter(
    (w) => w.type === "china" && w.status === "Active",
  );
  const khWh = store.whRows.filter(
    (w) => w.type === "cambodia" && w.status === "Active",
  );

  function backToScan() {
    setStage("scan");
    setPkg(null);
    setPickId("");
    setQ("");
    setErr("");
  }

  async function validate(raw) {
    const trimmed = raw.trim();
    if (!trimmed || busy) return;
    if (stage === "assign" && tkKey(trimmed) === validatedKey) return;
    if (supabase && !store.tableReady) {
      scan.fail(CONTAINER_TABLE_HINT, false);
      return;
    }
    if (!store.ready) {
      scan.fail("កំពុងផ្ទុកទិន្នន័យ Container… សូមរង់ចាំបន្តិច", false);
      return;
    }
    scan.begin();
    setErr("");
    const r = checkTkForOutbound({
      raw: trimmed,
      packages,
      activeItems: store.activeItems,
      containers: store.containers,
    });
    if (!r.ok) {
      backToScan();
      scan.fail(r.error);
      return;
    }
    if (!canAssign) {
      backToScan();
      scan.fail("អ្នកគ្មានសិទ្ធិជ្រើសរើស ឬបង្កើត Container ទេ");
      return;
    }
    setPkg(r.pkg);
    setStage("assign");
    setForm(outboundContainerDefaults(r.pkg, store.whRows));
    setMode(eligible.length ? "existing" : "new");
    setPickId(eligible.some((c) => c.id === lastId) ? lastId : "");
    scan.succeed(`TK "${r.pkg.tk}" ត្រឹមត្រូវ — ជ្រើស ឬបង្កើត Container`);
  }

  // A scanner's burst of characters pauses briefly once done typing.
  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    debounceTimer.current = setTimeout(() => validate(trimmed), 250);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Container first, then the existing Outbound Origin write. If the second
  // step fails the TK is taken back out so nothing is half-assigned.
  async function assignTo(container) {
    const tk = pkg.tk;
    const r = await store.addTks(container, [tk]);
    if (r.failed.length || !r.added.length)
      throw new Error(
        r.failed[0]?.error || "មិនអាចដាក់ TK ចូល Container បានទេ",
      );
    try {
      await addRow({
        tk,
        method: container.shipping_method || "Sea",
        container_no: container.container_number,
      });
    } catch (e) {
      try {
        await store.removeTk(
          container,
          tk,
          "Outbound Origin មិនជោគជ័យ — rollback ស្វ័យប្រវត្តិ",
        );
      } catch {
        throw new Error(
          `${e.message} — TK ស្ថិតក្នុង ${container.container_number} តែមិនទាន់ Outbound សូមពិនិត្យ`,
        );
      }
      throw e;
    }
    setLastId(container.id);
    setValue("");
    backToScan();
    setJustDone(true);
    clearTimeout(doneTimer.current);
    doneTimer.current = setTimeout(() => setJustDone(false), 1600);
    scan.succeed(
      `TK "${tk}" → ${container.container_number} · Outbound Origin`,
    );
    // Straight back to the scan box for the next package.
    scan.focusInput(false);
  }

  async function confirm() {
    if (busy || !pkg) return;
    setErr("");
    setBusy(true);
    try {
      if (mode === "existing") {
        if (!picked) throw new Error("សូមជ្រើសរើស Container");
        await assignTo(picked);
        return;
      }
      if (!form.origin_wh_code || !form.dest_wh_code)
        throw new Error("សូមជ្រើសរើស China Warehouse និង Cambodia Branch");
      let created = null;
      for (let i = 0; i < 6 && !created; i++) {
        try {
          created = await store.createContainer({
            ...form,
            container_number: generateContainerNumber(store.containers, i),
          });
        } catch (e) {
          if (!/មានរួចហើយ/.test(e.message || "")) throw e;
        }
      }
      if (!created)
        throw new Error(
          "មិនអាចបង្កើតលេខ Container ថ្មីបានទេ សូមព្យាយាមម្តងទៀត",
        );
      try {
        await assignTo(created);
      } catch (e) {
        // Keep the new (empty) container selectable instead of orphaning it.
        setMode("existing");
        setPickId(created.id);
        throw new Error(
          `បង្កើត ${created.container_number} រួច ប៉ុន្តែដាក់ TK មិនបាន: ${e.message}`,
        );
      }
    } catch (e) {
      setErr(e.message || "មិនអាចSaveបានទេ");
    } finally {
      setBusy(false);
    }
  }

  const stepIdx = stage === "assign" ? 1 : justDone ? 2 : 0;
  const nextNo = generateContainerNumber(store.containers);
  const canConfirm = !busy && (mode === "new" || !!picked);
  const tkInfo = pkg ? tkCustomerParts(pkg) : null;

  return (
    <div className="cb-surface cb-card">
      <style>{OB_CSS}</style>
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 border-b border-mist-200">
        <div>
          <h2 className="font-display font-bold text-sm text-ink-900">
            Scan &amp; Assign
          </h2>
          <p className="text-xs text-ink-600/55">
            Scan TK → Container → Outbound Origin
          </p>
        </div>
        <OutboundStepper idx={stepIdx} />
      </div>

      <div className="p-5 grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] items-start">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            clearTimeout(debounceTimer.current);
            validate(value);
          }}
          className="space-y-3"
        >
          <TkScanField
            value={value}
            onChange={(v) => {
              if (stage === "assign" && tkKey(v) !== validatedKey) backToScan();
              setValue(v);
              scan.onInput(v);
            }}
            placeholder="e.g. TK202609250041"
            scan={scan}
          />
          {pkg && (
            <div className="cb-ob-in rounded-md border border-mist-200 bg-mist-50 px-3.5 py-3 text-xs grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-ink-600/50 uppercase tracking-wide text-[10px] font-semibold">
                  Customer
                </p>
                <p className="text-ink-900 font-medium truncate">
                  {tkInfo.id} · {tkInfo.name}
                </p>
              </div>
              <div>
                <p className="text-ink-600/50 uppercase tracking-wide text-[10px] font-semibold">
                  Order ID
                </p>
                <p className="text-ink-900 font-medium">
                  {pkg.order_no || "—"}
                </p>
              </div>
              <div>
                <p className="text-ink-600/50 uppercase tracking-wide text-[10px] font-semibold">
                  Receiving Branch
                </p>
                <p className="text-ink-900 font-medium">
                  {pkg.dest_branch_code || "—"}
                </p>
              </div>
              <div>
                <p className="text-ink-600/50 uppercase tracking-wide text-[10px] font-semibold">
                  Weight · CBM
                </p>
                <p className="text-ink-900 font-medium">
                  {pkg.weight_kg ?? pkg.weight ?? "—"} KG · {pkg.cbm ?? "—"}
                </p>
              </div>
            </div>
          )}
        </form>

        {stage !== "assign" ? (
          <div className="hidden lg:flex items-center justify-center min-h-[9rem] rounded-md border border-dashed border-mist-200 text-xs text-ink-600/45 text-center px-6">
            Container ជ្រើសរើសបានNextពី TK ត្រឹមត្រូវ
          </div>
        ) : (
          <div className="cb-ob-in space-y-3">
            <div className="inline-flex rounded-md border border-mist-200 bg-mist-50 p-0.5 text-xs font-medium">
              {[
                ["existing", `Existing Container (${eligible.length})`],
                ["new", "+ New Container"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setMode(k);
                    setErr("");
                  }}
                  className={`px-3 py-1.5 rounded transition-colors ${
                    mode === k
                      ? "bg-white text-ink-900 shadow-sm"
                      : "text-ink-600/60 hover:text-ink-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "existing" ? (
              eligible.length === 0 ? (
                <p className="text-xs text-ink-600/55 rounded-md border border-dashed border-mist-200 px-4 py-6 text-center">
                  មិនមាន Container ដែលអាចដាក់ TK បានទេ — សូមបង្កើត Container
                  ថ្មី
                </p>
              ) : (
                <div className="space-y-2">
                  {cards.length > 5 && (
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search Container..."
                      className="w-full bg-white border border-mist-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-signal-blue"
                    />
                  )}
                  <div
                    role="radiogroup"
                    className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5"
                  >
                    {shown.map(({ c, s }) => {
                      const on = c.id === pickId;
                      const st = normContainerStatus(c.status);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setPickId(c.id)}
                          className={`w-full text-left flex items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
                            on
                              ? "border-signal-blue bg-signal-blue/5"
                              : "border-mist-200 bg-white hover:bg-mist-50"
                          }`}
                        >
                          <span
                            className={`shrink-0 w-4 h-4 rounded-full border flex items-center justify-center ${
                              on ? "border-signal-blue" : "border-mist-200"
                            }`}
                          >
                            {on && (
                              <span className="w-2 h-2 rounded-full bg-signal-blue" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-ink-900 tracking-wide">
                                {c.container_number}
                              </span>
                              <span
                                className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${
                                  st === "Loading"
                                    ? "bg-signal-blue/10 text-signal-blue"
                                    : "bg-mist-100 text-ink-700"
                                }`}
                              >
                                {st}
                              </span>
                              {c.id === lastId && (
                                <span className="text-[10px] text-ink-600/45">
                                  ប្រើចុងក្រោយ
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] text-ink-600/55 truncate">
                              {c.container_type} · {c.shipping_method || "—"} ·{" "}
                              {c.origin_wh_code} → {c.dest_wh_code}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-[11px] text-ink-600/60 leading-tight">
                            <span className="block font-medium text-ink-900">
                              {s.tk} TK
                            </span>
                            {s.cbm.toFixed(2)} m³
                          </span>
                        </button>
                      );
                    })}
                    {shown.length === 0 && (
                      <p className="text-xs text-ink-600/45 px-3 py-2">
                        រកមិនឃើញ Container
                      </p>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="rounded-md border border-mist-200 p-3.5 space-y-3">
                <div className="flex items-center justify-between rounded-md bg-mist-50 px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-600/50">
                    Container Number
                  </span>
                  <span className="text-sm font-semibold tracking-wide text-ink-900">
                    {nextNo}
                    <span className="ml-2 text-[10px] font-medium text-signal-teal">
                      AUTO
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ["origin_wh_code", "China Warehouse", chinaWh, true],
                    ["dest_wh_code", "Cambodia Branch", khWh, true],
                  ].map(([k, label, list]) => (
                    <div key={k}>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide text-ink-600/50 mb-1">
                        {label} <span className="text-signal-red">*</span>
                      </label>
                      <select
                        value={form[k]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [k]: e.target.value }))
                        }
                        className={INPUT_CLS}
                      >
                        <option value="">—</option>
                        {list.map((w) => (
                          <option key={w.code} value={w.code}>
                            {w.code} — {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-ink-600/50 mb-1">
                      Type
                    </label>
                    <select
                      value={form.container_type}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          container_type: e.target.value,
                        }))
                      }
                      className={INPUT_CLS}
                    >
                      {CONTAINER_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-ink-600/50 mb-1">
                      Shipping Method
                    </label>
                    <select
                      value={form.shipping_method}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          shipping_method: e.target.value,
                        }))
                      }
                      className={INPUT_CLS}
                    >
                      {SHIPPING_METHODS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {err && (
              <div className="flex items-start gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
                <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                {err}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setValue("");
                  scan.reset();
                  backToScan();
                  scan.focusInput(false);
                }}
                className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md hover:bg-mist-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={confirm}
                className="inline-flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
              >
                {busy
                  ? "កំពុងSave..."
                  : mode === "new"
                    ? `Create ${nextNo} & Assign`
                    : picked
                      ? `Assign to ${picked.container_number}`
                      : "Assign to Container"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/RowEditModal.jsx + RowDeleteModal.jsx  (Super Admin)
// ------------------------------------------------------------
// Select used by RowEditModal for columns that have fixed options (Users:
// role / department) or that pick from the warehouse master.
function WarehouseOptions({ value, onChange }) {
  const { rows } = useWarehouses();
  return (
    <select
      className={INPUT_CLS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {value && !rows.some((w) => w.code === value) && (
        <option value={value}>{value}</option>
      )}
      {rows
        .filter((w) => w.status !== "Inactive")
        .map((w) => (
          <option key={w.code} value={w.code}>
            {w.code} — {w.name}
          </option>
        ))}
    </select>
  );
}

function OptionSelect({ column, value, onChange }) {
  if (column.optionsFrom === "warehouses")
    return <WarehouseOptions value={value} onChange={onChange} />;
  const opts = column.options || [];
  return (
    <select
      className={INPUT_CLS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {value && !opts.includes(value) && <option value={value}>{value}</option>}
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function RowEditModal({ row, columns, onSave, onClose }) {
  const editable = columns.filter(
    (c) => c.key !== "id" && !c.render && !c.linkTo,
  );
  const [f, setF] = useState(() =>
    Object.fromEntries(editable.map((c) => [c.key, row?.[c.key] ?? ""])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!row) return null;

  async function submit(e) {
    e.preventDefault();
    const patch = {};
    editable.forEach((c) => {
      if (String(f[c.key] ?? "") !== String(row[c.key] ?? ""))
        patch[c.key] = f[c.key];
    });
    if (Object.keys(patch).length === 0) return onClose();
    setSaving(true);
    setError("");
    try {
      await onSave(patch);
      onClose();
    } catch (err) {
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-lg text-ink-900">
            Edit {row.id ?? ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-600/40 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-signal-red">{error}</p>}
          {editable.map((c) => (
            <div key={c.key}>
              <label className={LABEL_CLS}>{c.label}</label>
              {c.options || c.optionsFrom ? (
                <OptionSelect
                  column={c}
                  value={f[c.key] ?? ""}
                  onChange={(val) => setF((v) => ({ ...v, [c.key]: val }))}
                />
              ) : (
                <input
                  className={INPUT_CLS}
                  value={f[c.key] ?? ""}
                  onChange={(e) =>
                    setF((v) => ({ ...v, [c.key]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-4 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-signal-blue text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
          >
            {saving ? "កំពុងSave..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RowDeleteModal({ label, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!label) return null;
  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-sm"
      >
        <div className="px-5 py-4 border-b border-mist-200 flex items-center gap-2 text-signal-red">
          <TriangleAlert size={18} />
          <h3 className="font-display font-bold text-lg">Delete</h3>
        </div>
        <div className="px-5 py-4 text-sm text-ink-700 space-y-2">
          <p>
            Are you sure you want to permanently delete <b>{label}</b>{" "}
            ជាអចិន្ត្រៃយ៍មែនទេ? This action cannot be undone.
          </p>
          {error && <p className="text-xs text-signal-red">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-4 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onConfirm();
                onClose();
              } catch (err) {
                setError(err.message || "Unable to delete.");
              } finally {
                setBusy(false);
              }
            }}
            className="bg-signal-red text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-signal-red/90 disabled:opacity-50"
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Stat cards on list pages are computed from the live server data (never
// typed in). `metric` keys come from MODULES[path].stats.
const STAT_NUM = (n, max = 0) =>
  Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: max });

function computeListStat(metric, { packages, stageRows, rows }) {
  const today = new Date();
  const status = (r) => String(r?.status || "");
  switch (metric) {
    case "total":
      return STAT_NUM(rows.length);
    case "atChina":
      return STAT_NUM(
        packages.filter((p) => !p.status || p.status === "Inbound Origin")
          .length,
      );
    case "inTransit":
      return STAT_NUM(
        packages.filter((p) => IN_TRANSIT_STATUSES.includes(p.status)).length,
      );
    case "delivered":
      return STAT_NUM(packages.filter((p) => p.status === "Completed").length);
    case "receivedToday":
      return STAT_NUM(
        packages.filter((p) =>
          isSameCalendarDay(p.inbound_at || p.created_at, today),
        ).length,
      );
    case "awaitingQc":
      return STAT_NUM(
        packages.filter(
          (p) =>
            (!p.status || p.status === "Inbound Origin") &&
            ["Pending", "Received", "Measuring", "Checked"].includes(
              p.inbound_status,
            ),
        ).length,
      );
    case "notFound":
      return STAT_NUM(
        packages.filter(
          (p) =>
            (!p.status || p.status === "Inbound Origin") &&
            tkCustomerParts(p).id === "—",
        ).length,
      );
    case "totalCbm":
      return STAT_NUM(
        stageRows.reduce((s, r) => s + (Number(r.cbm) || 0), 0),
        2,
      );
    case "totalWeight":
      return STAT_NUM(
        stageRows.reduce(
          (s, r) => s + (Number(r.weight_kg ?? r.weight) || 0),
          0,
        ),
        2,
      );
    case "shipInTransit":
      return STAT_NUM(rows.filter((r) => status(r) === "In Transit").length);
    case "shipArrived":
      return STAT_NUM(rows.filter((r) => status(r) === "Arrived").length);
    case "khScanned":
      return STAT_NUM(rows.reduce((s, r) => s + (Number(r.scanned) || 0), 0));
    case "khMissing":
      return STAT_NUM(rows.reduce((s, r) => s + (Number(r.missing) || 0), 0));
    case "dlvOut":
      return STAT_NUM(
        rows.filter((r) => status(r) === "Out for Delivery").length,
      );
    case "dlvDone":
      return STAT_NUM(rows.filter((r) => status(r) === "Delivered").length);
    case "dlvFailed":
      return STAT_NUM(rows.filter((r) => /^Failed/i.test(status(r))).length);
    case "newThisMonth":
      return STAT_NUM(
        rows.filter((r) => {
          const d = new Date(r.created_at);
          return (
            !Number.isNaN(d.getTime()) &&
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth()
          );
        }).length,
      );
    default:
      return "—";
  }
}

function ListPage({
  title,
  subtitle,
  stats,
  columns,
  rows: mockRows,
  primaryAction,
  path,
}) {
  const isLinkedTk = LINKED_TK_PATHS.includes(path);
  const { user } = useAuth();
  const {
    rows: tableRows,
    ready: tableReady,
    addRow: addTableRow,
    refetch,
    prependRow,
    updateRow,
    deleteRow,
  } = useTableRows(path, []);
  const {
    packages,
    ready: packagesReady,
    upsertPackage,
    deletePackage,
    syncTimelineToStatus,
  } = usePackageTracking();
  // Edit / delete follow the module's own permission (Super Admin always).
  const canEditRows = hasPermission(user, PATH_ACTIONS[path]?.edit);
  const canDeleteRows = hasPermission(user, PATH_ACTIONS[path]?.delete);
  const [editingRow, setEditingRow] = useState(null);
  const [deletingRow, setDeletingRow] = useState(null);
  const isUsersModule = path === "/users";
  const isTransferModule = path === "/customer-transfer";
  // Exceptions has no mock table of its own — it's just whichever real
  // packages (see PackageTrackingContext) currently have an `exception`
  // set, the same source the Dashboard's Exception Alerts card reads.
  const isExceptionsModule = path === "/exceptions";
  const exceptionRows = isExceptionsModule
    ? packages
        .filter((p) => p.exception)
        .map((p) => ({
          tk: p.tk,
          customer: p.customer || "—",
          status: p.exception.type,
          detail: p.exception.detail || "—",
        }))
    : [];

  // Each linked page only shows TKs currently AT its stage — once a TK
  // advances past it, it disappears from here (and shows up on whichever
  // page matches its new stage, if that page is wired to this registry).
  const stageForThisPage = STAGE_LIST_PAGES[path];
  const stageRows = stageForThisPage
    ? packages.filter((p) => p.status === stageForThisPage)
    : packages;
  // A Customer only ever sees their own TKs; everyone else sees the
  // stage list. decoratePackageRow adds display-only flat fields.
  const linkedRows = stageRows
    .filter(
      (p) =>
        user?.role !== "Customer" ||
        (user?.customerId && customerIdOf(p) === user.customerId),
    )
    .map(decoratePackageRow);

  // Scanning a TK on any of the three stage pages (Inbound/Outbound
  // Origin, Sorting) writes to the shared registry (by `tk`) instead of a
  // page-local table, so the same TK — and its Status — shows up
  // consistently across all of them. The TK itself must already exist
  // (created via Packages / TK, see CreatePackageModal) — these pages only
  // search for it and advance its stage, per the workflow spec.
  async function addLinkedRow(values) {
    const tk = String(values.tk || "").trim();
    if (!tk) throw new Error("សូមបញ្ចូល TK Number");
    const existing = packages.find(
      (p) => String(p.tk).trim().toLowerCase() === tk.toLowerCase(),
    );
    if (!existing) {
      throw new Error(
        path === "/inbound-origin"
          ? `TK not found "${tk}" ទេ — សូមបង្កើត TK នៅ Packages / TK សិន`
          : path === "/sorting"
            ? `TK not found "${tk}" ទេ — TK នេះមិនទាន់មកដល់ឃ្លាំងកម្ពុជាទេ`
            : `TK not found "${tk}" ទេ — សូម Scan TK នៅ Inbound Origin សិន`,
      );
    }

    // Outbound Origin: Container Number is mandatory, and a TK created
    // through the New TK flow must have finished inbound processing.
    if (path === "/outbound-origin") {
      if (!String(values.container_no || "").trim())
        throw new Error("Container Number ត្រូវការ ដើម្បីចេញ Outbound Origin");
      if (
        existing.inbound_status &&
        existing.inbound_status !== "Ready for Shipment"
      )
        throw new Error(
          `TK "${tk}" មិនទាន់ Ready for Shipment ទេ (Inbound Status: ${existing.inbound_status})`,
        );
    }

    const nextStatus =
      path === "/inbound-origin"
        ? "Inbound Origin"
        : path === "/outbound-origin"
          ? "Outbound Origin"
          : "Inbound Warehouse";

    // Save this stage's own operation/history row (inbound_origin /
    // outbound_origin / sorting), referencing the shared package — keeps
    // per-stage details (supplier, method, location, ...) without
    // cramming them onto the `packages` table itself.
    if (supabase) {
      await supabase
        .from(pathToTable(path))
        .insert({ ...values, tk: existing.tk, package_id: existing.id });
    }

    return upsertPackage({
      ...values,
      tk: existing.tk,
      status: nextStatus,
      ...(path === "/outbound-origin"
        ? {
            outboundAt: formatNowTimestamp(),
            updated_by: user?.name || "Admin",
            updated_at: new Date().toISOString(),
          }
        : {}),
    }).then((saved) => {
      // Keep the Package Detail Tracking Timeline in step with this scan
      // too — upsertPackage alone only moves the record's `status`, the
      // timeline is separate state (see syncTimelineToStatus) and would
      // otherwise still show the previous stage as "active".
      syncTimelineToStatus(
        existing.tk,
        nextStatus,
        user?.name || "Admin",
        values.container_no ? `Container ${values.container_no}` : undefined,
      );
      return saved;
    });
  }

  const displayRows = isLinkedTk
    ? linkedRows
    : isExceptionsModule
      ? exceptionRows
      : tableRows;
  const addRow = (values) => {
    if (!canCreate) throw new Error(NO_PERM_MSG); // guard the action itself
    return (isLinkedTk ? addLinkedRow : addTableRow)(values);
  };
  // Skeleton only while the FIRST server fetch is running.
  const listLoading =
    isLinkedTk || isExceptionsModule ? !packagesReady : !tableReady;
  // Real numbers only: TKs this user may see (customers: only their own).
  const visiblePackages = packages.filter(
    (p) =>
      user?.role !== "Customer" ||
      (user?.customerId && customerIdOf(p) === user.customerId),
  );
  const liveStats = (stats || []).map((s) => ({
    ...s,
    value: computeListStat(s.metric, {
      packages: visiblePackages,
      stageRows: linkedRows,
      rows: isLinkedTk ? linkedRows : tableRows,
    }),
  }));
  // A freshly scanned TK should default to "Inbound Origin" / a real
  // outbound status, not whatever status happens to be first among
  // whatever's already in the registry.
  const statusSeedRows = isLinkedTk
    ? stageForThisPage
      ? [{ status: stageForThisPage }]
      : [{ status: "Inbound Origin" }, { status: "Hold" }]
    : displayRows;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [page, setPage] = useState(0);
  // Package Detail's "Move to Outbound" button lands here with ?tk=...
  const [searchParams] = useSearchParams();
  const prefillTk =
    path === "/outbound-origin" ? searchParams.get("tk") || "" : "";
  // Outbound Origin has no modal any more: "Scan TK" focuses the inline scanner.
  const [showCreate, setShowCreate] = useState(
    !!prefillTk && path !== "/outbound-origin",
  );
  const [scanFocusKey, setScanFocusKey] = useState(0);
  const [adv, setAdv] = useState(EMPTY_ADV);
  const [showAdv, setShowAdv] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target))
        setShowFilterMenu(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const statusColumn = columns.find((c) => c.status);
  const statusOptions = statusColumn
    ? [...new Set(displayRows.map((r) => r[statusColumn.key]).filter(Boolean))]
    : [];

  const advCount = Object.values(adv).filter(Boolean).length;
  const filteredRows = displayRows.filter((row) => {
    const q = search.toLowerCase();
    // TK lists search Customer ID / Name, Order ID, TK and Container even
    // when a column isn't on screen; other modules search visible columns.
    const matchesSearch =
      !search ||
      (isLinkedTk
        ? [row.tk, row.customer, row.order_no, row.container_no, row.container]
        : columns.map((c) => row[c.key])
      ).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      );
    const matchesStatus =
      !statusFilter || row[statusColumn?.key] === statusFilter;
    if (!isLinkedTk) return matchesSearch && matchesStatus;
    const day = String(row.inbound_at || row.created_at || "").slice(0, 10);
    const matchesAdv =
      (!adv.inbound || row.inbound_status === adv.inbound) &&
      (!adv.outbound || outboundStatusOf(row) === adv.outbound) &&
      (!adv.cargo || row.cargo_type === adv.cargo) &&
      (!adv.size || row.size_class === adv.size) &&
      (!adv.warehouse || row.warehouse === adv.warehouse) &&
      (!adv.from || (day && day >= adv.from)) &&
      (!adv.to || (day && day <= adv.to));
    return matchesSearch && matchesStatus && matchesAdv;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedRows = filteredRows.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  // Only warehouse/admin roles create TKs and outbound scans; Customer
  // Service, Customer and the rest get the list read-only.
  // Create needs the module's own "create" permission (Super Admin always).
  const canCreate = hasPermission(user, PATH_ACTIONS[path]?.create);

  function resetToFirstPage(fn) {
    return (...args) => {
      setPage(0);
      fn(...args);
    };
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-xl text-ink-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-ink-600/55 mt-0.5">{subtitle}</p>
          )}
        </div>
        {primaryAction && canCreate && (
          <button
            onClick={() =>
              path === "/outbound-origin"
                ? setScanFocusKey((k) => k + 1)
                : setShowCreate(true)
            }
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 transition-colors"
          >
            <Plus size={16} />
            {primaryAction}
          </button>
        )}
      </div>

      {liveStats.length > 0 &&
        (listLoading ? (
          <StatCardsSkeleton
            count={liveStats.length}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {liveStats.map(({ metric, ...s }) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        ))}

      {path === "/outbound-origin" && canCreate && (
        <QuickOutboundScan
          addRow={addRow}
          initialTk={prefillTk}
          focusKey={scanFocusKey}
        />
      )}

      <div className="cb-surface cb-card">
        <div className="flex items-center gap-2 px-4 lg:px-5 py-3.5 border-b border-mist-200 flex-wrap">
          <div className="flex items-center gap-2 bg-mist-100 rounded-md px-3 py-2 flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="text-ink-600/40" />
            <input
              value={search}
              onChange={resetToFirstPage((e) => setSearch(e.target.value))}
              className="bg-transparent outline-none text-sm w-full placeholder:text-ink-600/40"
              placeholder="Search..."
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu((v) => !v)}
              disabled={!statusColumn}
              className="flex items-center gap-1.5 text-sm text-ink-700 border border-mist-200 px-3 py-2 rounded-md hover:bg-mist-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Filter size={14} />
              {statusFilter || "ត្រង"}
            </button>
            {showFilterMenu && statusColumn && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-mist-200 rounded-md shadow-lg py-1 z-20">
                <button
                  onClick={resetToFirstPage(() => {
                    setStatusFilter("");
                    setShowFilterMenu(false);
                  })}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-mist-50 text-ink-600/60"
                >
                  All
                </button>
                {statusOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={resetToFirstPage(() => {
                      setStatusFilter(opt);
                      setShowFilterMenu(false);
                    })}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-mist-50 text-ink-800"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isLinkedTk && (
            <button
              onClick={() => setShowAdv((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-ink-700 border border-mist-200 px-3 py-2 rounded-md hover:bg-mist-50"
            >
              <Icons.SlidersHorizontal size={14} />
              តម្រងលម្អិត
              {advCount > 0 && (
                <span className="bg-signal-blue text-white text-[11px] px-1.5 rounded-sm">
                  {advCount}
                </span>
              )}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() =>
              exportRowsToCSV(`${title}.csv`, columns, filteredRows)
            }
            className="flex items-center gap-1.5 text-sm text-ink-700 border border-mist-200 px-3 py-2 rounded-md hover:bg-mist-50"
          >
            <Download size={14} />
            នាំចេញ
          </button>
        </div>
        {isLinkedTk && showAdv && (
          <AdvancedTkFilters
            adv={adv}
            setAdv={(fn) => {
              setPage(0);
              setAdv(fn);
            }}
            rows={displayRows}
          />
        )}
        <DataTable
          columns={columns}
          rows={pagedRows}
          loading={listLoading}
          skeletonRows={8}
          rowActions={
            (canEditRows || canDeleteRows) &&
            !isExceptionsModule &&
            !isTransferModule
              ? (row) => (
                  <div className="inline-flex items-center gap-1">
                    {canEditRows &&
                      (isLinkedTk ? (
                        <Link
                          to={`/packages/${encodeURIComponent(row.tk)}`}
                          title="Edit"
                          className="p-1.5 rounded-md text-ink-600/50 hover:text-signal-blue hover:bg-mist-100"
                        >
                          <Icons.Pencil size={14} />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setEditingRow(row)}
                          className="p-1.5 rounded-md text-ink-600/50 hover:text-signal-blue hover:bg-mist-100"
                        >
                          <Icons.Pencil size={14} />
                        </button>
                      ))}
                    {canDeleteRows && (
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeletingRow(row)}
                        className="p-1.5 rounded-md text-ink-600/50 hover:text-signal-red hover:bg-signal-red/5"
                      >
                        <Icons.Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )
              : undefined
          }
        />
        {canEditRows && editingRow && (
          <RowEditModal
            key={editingRow.id ?? "row"}
            row={editingRow}
            columns={
              isUsersModule
                ? columns.map((c) =>
                    c.key === "role"
                      ? {
                          ...c,
                          options: assignableRoles(user).map((r) => r.name),
                        }
                      : c.key === "department"
                        ? { ...c, options: DEPARTMENTS.map((d) => d.name) }
                        : c.key === "warehouse_code"
                          ? { ...c, optionsFrom: "warehouses" }
                          : c,
                  )
                : columns
            }
            onSave={(patch) => {
              if (!canEditRows) throw new Error(NO_PERM_MSG);
              if (isUsersModule) {
                // Role / department / warehouse changes need user.assign_role.
                if ("role" in patch) assertCanAssignRole(user, patch.role);
                else if ("department" in patch || "warehouse_code" in patch)
                  requirePermission(user, "user.assign_role");
              }
              return updateRow(editingRow, patch);
            }}
            onClose={() => setEditingRow(null)}
          />
        )}
        {canDeleteRows && deletingRow && (
          <RowDeleteModal
            label={
              isLinkedTk
                ? deletingRow.tk
                : String(deletingRow.id ?? deletingRow.name ?? "")
            }
            onConfirm={() => {
              if (!canDeleteRows) throw new Error(NO_PERM_MSG);
              return isLinkedTk
                ? deletePackage(deletingRow.tk)
                : deleteRow(deletingRow);
            }}
            onClose={() => setDeletingRow(null)}
          />
        )}
        <div className="flex items-center justify-between px-4 lg:px-5 py-3 border-t border-mist-200 text-xs text-ink-600/50">
          {listLoading ? (
            <Skeleton className="h-3 w-40" />
          ) : (
            <span>
              បង្ហាញ {pagedRows.length} នៃ {filteredRows.length} លទ្ធផល
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-2.5 py-1 rounded-sm border border-mist-200 hover:bg-mist-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-2.5 py-1 rounded-sm bg-signal-blue text-white">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-2.5 py-1 rounded-sm border border-mist-200 hover:bg-mist-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isUsersModule ? (
        <CreateStaffUserModal
          open={showCreate}
          existingRows={tableRows}
          onClose={() => setShowCreate(false)}
          onCreated={(row) => (supabase ? refetch() : prependRow(row))}
        />
      ) : isTransferModule ? (
        <CreateTransferModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={(row) => (supabase ? refetch() : prependRow(row))}
        />
      ) : path === "/packages" || path === "/inbound-origin" ? (
        <CreatePackageModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />
      ) : path === "/outbound-origin" ? null : path === "/arrival" ? (
        <CreateArrivalModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={(row) => (supabase ? refetch() : prependRow(row))}
        />
      ) : (
        <CreateRowModal
          open={showCreate}
          title={primaryAction || title}
          columns={columns}
          existingRows={statusSeedRows}
          onClose={() => setShowCreate(false)}
          onSubmit={addRow}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------
// context/AuthContext.jsx
// ------------------------------------------------------------
const AuthContext = createContext(null);
const MOCK_KEY = "cargo_bridge_mock_user";

// Merge the Supabase auth user with their row in `customers` (name, phone,
// customer_code...) so the rest of the app only ever deals with one shape.
async function hydrateProfile(authUser) {
  if (!authUser) return null;

  // Staff first: match by auth_user_id if already linked, else by email
  // on their very first login — then stamp auth_user_id onto that row.
  // department / warehouse_code are new columns — fall back to the old
  // select if the migration has not been run yet so nobody gets locked out.
  const staffFilter = `auth_user_id.eq.${authUser.id},email.eq.${authUser.email}`;
  let { data: staffRow, error: staffErr } = await supabase
    .from("users")
    .select(
      "id, auth_user_id, name, role, email, status, department, warehouse_code",
    )
    .or(staffFilter)
    .maybeSingle();
  if (staffErr) {
    ({ data: staffRow } = await supabase
      .from("users")
      .select("id, auth_user_id, name, role, email, status")
      .or(staffFilter)
      .maybeSingle());
  }

  if (staffRow) {
    if (!staffRow.auth_user_id) {
      await supabase
        .from("users")
        .update({ auth_user_id: authUser.id })
        .eq("id", staffRow.id);
    }
    // Load the shared role matrix BEFORE the first render so the user never
    // flashes a wrong "no access" page.
    await syncRolesFromServer();
    return {
      id: authUser.id,
      email: authUser.email,
      name: staffRow.name || authUser.email?.split("@")[0],
      role: staffRow.role,
      department: staffRow.department || null,
      warehouse: staffRow.warehouse_code || null,
      isStaff: true,
      allowedPaths: [], // recomputed live from the role matrix (withLivePaths)
    };
  }

  // Fall back to the existing customer profile flow.
  const { data } = await supabase
    .from("customers")
    .select("name, phone, customer_code, warehouse")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    email: authUser.email,
    name: data?.name || authUser.email?.split("@")[0],
    phone: data?.phone || null,
    customerId: data?.customer_code || null,
    defaultWarehouse: data?.warehouse || null,
    role: "Customer",
    isStaff: false,
    allowedPaths: "*", // customers aren't restricted by this menu system
  };
}

export function AuthProvider({ children }) {
  const [baseUser, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Permissions are resolved LIVE from the role store: editing a role in
  // Role Management updates every signed-in user of that role at once.
  const rolesSnapshot = useRoles();
  const user = React.useMemo(
    () => withLivePaths(baseUser),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseUser, rolesSnapshot, rolesStore.version],
  );

  useEffect(() => {
    if (!supabase) {
      // UI-only mode: no backend configured yet, restore a mock session if one exists
      const saved = localStorage.getItem(MOCK_KEY);
      if (saved) setUser(JSON.parse(saved));
      setLoading(false);
      return;
    }

    // Always leave the loading state — even if restoring the session or the
    // profile fails — so a refresh can never get stuck on the skeleton.
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setUser(await hydrateProfile(data.session?.user));
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(await hydrateProfile(session?.user));
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    if (!supabase) {
      // No Supabase configured — accept any credentials so the UI is usable end-to-end.
      // Defaults to Super Admin so Process-Status actions stay testable before
      // the `users` table (with real roles) is wired up.
      const mockUser = {
        email,
        name: email.split("@")[0],
        role: "Super Admin",
        allowedPaths: "*",
      };
      localStorage.setItem(MOCK_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      return { error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error };
    setUser(await hydrateProfile(data.user));
    return { error: null };
  }

  // Customer self-registration (blueprint section 3). Creates the auth
  // user, then a matching row in `customers` — the Customer ID comes back
  // from the `customer_code` column, generated server-side by the trigger
  // in supabase/schema.sql.
  async function signUp({ name, phone, email, password }) {
    if (!supabase) {
      const customerId = generateMockCustomerId();
      const mockUser = { email, name, phone, customerId };
      localStorage.setItem(MOCK_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      return { error: null, customerId };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };

    if (!data.session) {
      // Email confirmation is required before a session exists — the
      // customers row (and its Customer ID) gets created on first login
      // instead, once the account is confirmed.
      return { error: null, pendingConfirmation: true };
    }

    const { data: row, error: insertError } = await supabase
      .from("customers")
      .insert({
        auth_user_id: data.user.id,
        name,
        phone,
        email,
        warehouse: "CN-GZ-01",
      })
      .select("customer_code")
      .single();

    if (insertError) return { error: insertError };

    setUser({
      id: data.user.id,
      email,
      name,
      phone,
      customerId: row.customer_code,
    });
    return { error: null, customerId: row.customer_code };
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem(MOCK_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signUp, logout, isMock: !supabase }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ------------------------------------------------------------
// pages/Login.jsx
// ------------------------------------------------------------
const STAGE_DOTS = ["🇨🇳", "🚢", "🇰🇭"];

function Login() {
  const { user, login, isMock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    const { error } = await login(email, password);
    setSubmitting(false);
    if (error) {
      setError(error.message || "Incorrect email or password.");
      return;
    }
    navigate(location.state?.from?.pathname || "/", { replace: true });
  }

  return (
    <div className="cb-login-page min-h-screen relative overflow-hidden bg-[#f6f9fd] flex items-center justify-center px-5 py-8 sm:px-8">
      {/* Animated background */}
      <style>{`
        @keyframes cb-float-a {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          50% { transform: translate3d(38px, 26px, 0) rotate(7deg) scale(1.04); }
        }
        @keyframes cb-float-b {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          50% { transform: translate3d(-34px, 24px, 0) rotate(-8deg) scale(1.06); }
        }
        @keyframes cb-float-c {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .36; }
          50% { transform: translate3d(0, -32px, 0) scale(1.12); opacity: .58; }
        }
        @keyframes cb-pulse {
          0%, 100% { transform: scale(1); opacity: .22; }
          50% { transform: scale(1.16); opacity: .38; }
        }
        @keyframes cb-drift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, 16px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .cb-blob-a { animation: cb-float-a 14s ease-in-out infinite; }
        .cb-blob-b { animation: cb-float-b 17s ease-in-out infinite; }
        .cb-blob-c { animation: cb-float-c 11s ease-in-out infinite; }
        .cb-pulse { animation: cb-pulse 8s ease-in-out infinite; }
        .cb-drift { animation: cb-drift 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cb-blob-a, .cb-blob-b, .cb-blob-c, .cb-pulse, .cb-drift { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute -top-52 -right-48 h-[680px] w-[680px] rounded-full bg-[#2563eb]/10 blur-2xl cb-blob-a" />
      <div className="pointer-events-none absolute -bottom-56 -left-44 h-[620px] w-[620px] rounded-full bg-[#0f2a55]/10 blur-2xl cb-blob-b" />
      <div className="pointer-events-none absolute top-[8%] left-[10%] h-24 w-24 rounded-full bg-[#60a5fa]/25 blur-xl cb-pulse" />
      <div className="pointer-events-none absolute right-[10%] bottom-[12%] h-32 w-32 rounded-full bg-[#93c5fd]/30 blur-2xl cb-blob-c" />

      {/* Decorative flowing shapes behind the card */}
      <div className="pointer-events-none absolute -right-24 top-1/2 h-[430px] w-[760px] -translate-y-1/2 rounded-[48%] border-[42px] border-[#2563eb]/[0.07] rotate-[-12deg] cb-drift" />
      <div className="pointer-events-none absolute -left-28 top-[18%] h-[300px] w-[540px] rounded-[48%] border-[30px] border-[#0f2a55]/[0.05] rotate-[18deg] cb-drift" />

      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute left-[7%] top-[28%] h-2 w-2 rounded-full bg-[#2563eb] cb-pulse" />
        <div className="absolute left-[15%] top-[68%] h-1.5 w-1.5 rounded-full bg-[#60a5fa] cb-drift" />
        <div className="absolute right-[14%] top-[25%] h-2.5 w-2.5 rounded-full bg-[#2563eb] cb-pulse" />
        <div className="absolute right-[7%] bottom-[24%] h-1.5 w-1.5 rounded-full bg-[#0f2a55] cb-drift" />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-[440px]">
        <div className="rounded-[24px] border border-white/80 bg-white/95 p-7 shadow-[0_24px_80px_rgba(15,42,85,0.12)] backdrop-blur-xl sm:p-9">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-blue shadow-lg shadow-blue-500/20">
              <Waypoints size={27} className="text-white" />
            </div>
            <div className="font-display text-xl font-extrabold tracking-tight text-ink-900">
              Cargo Bridge
            </div>
            <h2 className="mt-5 font-display text-[26px] font-bold leading-tight text-ink-900">
              Sign in
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-600/55">
              Sign in to access your logistics management workspace.
            </p>
          </div>

          {isMock && (
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-signal-amber/10 px-3 py-2.5 text-xs leading-relaxed text-[#8A5A12]">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              <span>
                Demo mode — Supabase is not connected. Enter any email and
                password to preview the interface.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-ink-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cargobridge.com"
                className="w-full rounded-xl border border-mist-200 bg-[#fbfcfe] px-4 py-3 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-600/35 focus:border-signal-blue focus:bg-white focus:ring-4 focus:ring-signal-blue/10"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-semibold text-ink-700">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-medium text-signal-blue transition-colors hover:text-blue-700"
                  onClick={() =>
                    setError("Contact an Admin to reset your password.")
                  }
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-mist-200 bg-[#fbfcfe] px-4 py-3 pr-11 text-sm text-ink-900 outline-none transition-all placeholder:text-ink-600/35 focus:border-signal-blue focus:bg-white focus:ring-4 focus:ring-signal-blue/10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-600/40 transition-colors hover:text-ink-700"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-mist-200 text-signal-blue focus:ring-signal-blue"
              />
              Remember me
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-signal-red/10 px-3 py-2.5 text-sm text-signal-red">
                <TriangleAlert size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal-blue py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-signal-blue/90 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {submitting ? "Signing in..." : "Sign in"}
              {!submitting && <ArrowRight size={17} />}
            </button>
          </form>
        </div>

        <div className="mt-5 text-center text-[11px] text-ink-600/40">
          © 2026 Cargo Bridge Logistics
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// pages/Register.jsx
// ------------------------------------------------------------
const DEFAULT_WAREHOUSE = {
  id: "CN-GZ-01",
  name: "Guangzhou Warehouse",
  address: "广东省广州市白云区京广铁路装卸区 8号仓库",
};

function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("form"); // 'form' | 'success' | 'pending'
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customerId, setCustomerId] = useState("");

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.phone || !form.email || !form.password) {
      setError("សូមបំពេញគ្រប់ចន្លោះAll");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      name: form.name,
      phone: form.phone,
      email: form.email,
      password: form.password,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error.message || "Registration failed.");
      return;
    }
    if (result.pendingConfirmation) {
      setStep("pending");
      return;
    }

    setCustomerId(result.customerId);
    setStep("success");
  }

  const recipient = `${form.name} ${customerId}`;

  async function copyAddress() {
    const text = [
      `Recipient: ${recipient}`,
      `Warehouse: ${DEFAULT_WAREHOUSE.name}`,
      `Phone: +86 XXX XXX XXXX`,
      `Address: ${DEFAULT_WAREHOUSE.address}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy. Please copy it manually.");
    }
  }

  if (step === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist-50 px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-signal-blue/10 text-signal-blue flex items-center justify-center mb-4 mx-auto">
            <CircleCheck size={24} />
          </div>
          <h1 className="font-display font-bold text-xl text-ink-900">
            Please confirm your email
          </h1>
          <p className="text-sm text-ink-600/55 mt-2 leading-relaxed">
            We sent a confirmation link to{" "}
            <span className="text-ink-900 font-medium">{form.email}</span>។ Open
            the link and sign in again to receive your Customer ID and warehouse
            address warehouse address.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-signal-blue hover:underline mt-6"
          >
            Back to Login
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mist-50 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-signal-teal/10 text-signal-teal flex items-center justify-center mb-3">
              <CircleCheck size={24} />
            </div>
            <h1 className="font-display font-bold text-xl text-ink-900">
              Registration successful!
            </h1>
            <p className="text-sm text-ink-600/55 mt-1">
              Your account has been created — here is your Customer ID and China
              Warehouse address
            </p>
          </div>

          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5 flex items-center gap-4">
            <QRPlaceholder seed={customerId} />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                Customer ID
              </div>
              <div className="font-display font-extrabold text-2xl text-ink-900 tracking-tight">
                {customerId}
              </div>
              <div className="text-sm text-ink-600/60 truncate mt-0.5">
                {form.name}
              </div>
            </div>
          </div>

          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-sm text-ink-900">
                {DEFAULT_WAREHOUSE.name}
              </h2>
              <span className="text-[11px] font-medium bg-signal-blue/10 text-signal-blue px-2 py-0.5 rounded-sm">
                {DEFAULT_WAREHOUSE.id}
              </span>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                  Recipient
                </dt>
                <dd className="font-medium text-ink-900 mt-0.5">{recipient}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                  Phone
                </dt>
                <dd className="text-ink-900 mt-0.5">+86 XXX XXX XXXX</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-600/40 font-semibold">
                  Address
                </dt>
                <dd className="text-ink-900 mt-0.5">
                  {DEFAULT_WAREHOUSE.address}
                </dd>
              </div>
            </dl>

            <button
              onClick={copyAddress}
              className="w-full flex items-center justify-center gap-1.5 mt-4 border border-mist-200 text-sm font-medium text-ink-800 py-2.5 rounded-md hover:bg-mist-50 transition-colors"
            >
              {copied ? (
                <Check size={15} className="text-signal-teal" />
              ) : (
                <Copy size={15} />
              )}
              {copied ? "Copied!" : "Copy Address"}
            </button>
            <p className="text-xs text-ink-600/45 mt-2 text-center">
              Copy this address into Taobao, 1688, Tmall, Pinduoduo, or JD
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-1.5 bg-signal-blue text-white text-sm font-medium py-2.5 rounded-md hover:bg-signal-blue/90 transition-colors mt-5"
          >
            Go to Dashboard
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mist-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-sm bg-signal-blue flex items-center justify-center">
            <Waypoints size={18} className="text-white" />
          </div>
          <div className="font-display font-extrabold text-ink-900">
            Cargo Bridge
          </div>
        </div>

        <h1 className="font-display font-bold text-2xl text-ink-900">
          Create a new account
        </h1>
        <p className="text-sm text-ink-600/55 mt-1.5">
          Create a customer account to receive your Customer ID and China
          warehouse address.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Full name / Shop name
            </label>
            <input
              value={form.name}
              onChange={update("name")}
              placeholder="Sothon Shop"
              className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Phone number
            </label>
            <input
              value={form.phone}
              onChange={update("phone")}
              placeholder="012 345 678"
              className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="you@email.com"
              className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="••••••••"
                className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-signal-blue transition-colors"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-600/40 hover:text-ink-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={update("confirm")}
              placeholder="••••••••"
              className="w-full bg-white border border-mist-200 rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-signal-blue transition-colors"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 bg-signal-blue text-white text-sm font-medium py-2.5 rounded-md hover:bg-signal-blue/90 transition-colors disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Sign up"}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-ink-600/60 hover:text-ink-900 mt-6"
        >
          <ArrowLeft size={14} />
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// pages/Dashboard.jsx
// ------------------------------------------------------------
// Everything below used to be static demo numbers (STATS/RECENT/
// EXCEPTIONS arrays with fixed values like "1,245" / "+8.2%"). All of it
// is now derived at render time from the one real, shared registry
// (usePackageTracking().packages — see PackageTrackingContext), the same
// data source Packages/TK, Inbound Origin, Outbound Origin etc. already
// read and write. No more separate hardcoded copies for the Dashboard.
//
// Two things intentionally have NO card anymore because there is no real
// field or table backing them anywhere in this app yet:
//   - "Customs Pending" — there's no Customs stage/status tracked on a
//     package (PACKAGE_STAGES has no such stage), so there's nothing real
//     to count. Add it back once a real customs-hold concept exists.
//   - Delta chips ("+8.2%", "-3") — there's no stored "yesterday" baseline
//     to diff against, so a delta can't be computed honestly. Once daily
//     snapshots exist, wire real deltas back in via the `delta` prop
//     StatCard already supports.

// A package counts toward "In Transit" for any status between having left
// origin and having actually been received into the Cambodia warehouse.
const IN_TRANSIT_STATUSES = [
  "Outbound Origin",
  "Arrived Destination",
  "Shipping To Branch",
];

function isSameCalendarDay(iso, reference) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

// Coarse "N min/hr/d ago" label for whatever real timestamp a package row
// happens to carry (updated_at from Supabase if present, else the most
// recent stage-specific timestamp it has).
function timeAgoLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMin = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return `${Math.round(diffHr / 24)} d ago`;
}

// Most-recent real timestamp a package row carries, whichever stage it
// came from — used both to sort "Recent Activity" and to label it.
function lastActivityAt(pkg) {
  return pkg.updated_at || pkg.outboundAt || pkg.created_at || null;
}

function packageCustomerLabel(pkg) {
  const id = pkg.customer_id || pkg.customerId;
  return id
    ? `${id} · ${pkg.customer || "—"}`
    : pkg.customer || "Unknown Customer";
}

function statusTone(pkg) {
  if (pkg.exception) return "red";
  if (pkg.status === "Completed") return "teal";
  if (pkg.status === "Inbound Origin") return "blue";
  return "ink";
}

const DOT = {
  blue: "bg-signal-blue",
  teal: "bg-signal-teal",
  red: "bg-signal-red",
  amber: "bg-signal-amber",
  ink: "bg-ink-600",
};

function Dashboard() {
  const navigate = useNavigate();
  const { packages, ready: dashReady } = usePackageTracking();
  const today = new Date();

  const stats = [
    {
      icon: "LogIn",
      label: "Inbound (today)",
      value: String(
        packages.filter((p) => isSameCalendarDay(p.created_at, today)).length,
      ),
      tone: "blue",
    },
    {
      icon: "LogOut",
      label: "Outbound (today)",
      value: String(
        packages.filter((p) => isSameCalendarDay(p.outboundAt, today)).length,
      ),
      tone: "ink",
    },
    {
      icon: "Ship",
      label: "In Transit",
      value: String(
        packages.filter((p) => IN_TRANSIT_STATUSES.includes(p.status)).length,
      ),
      tone: "amber",
    },
    {
      icon: "Warehouse",
      label: "KH Warehouse Stock",
      value: String(
        packages.filter((p) => p.status === "Inbound Warehouse").length,
      ),
      tone: "teal",
    },
    {
      icon: "TriangleAlert",
      label: "Open Exceptions",
      value: String(packages.filter((p) => p.exception).length),
      tone: "red",
    },
  ];

  const recent = [...packages]
    .filter((p) => lastActivityAt(p))
    .sort((a, b) => new Date(lastActivityAt(b)) - new Date(lastActivityAt(a)))
    .slice(0, 5);

  const exceptions = packages.filter((p) => p.exception);

  return (
    <div className="space-y-5">
      <RouteFlow />

      {dashReady ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 cb-fade-in">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      ) : (
        <StatCardsSkeleton
          count={5}
          className="grid grid-cols-2 lg:grid-cols-5 gap-3"
        />
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-mist-200 rounded-md shadow-panel">
          <div className="flex items-center justify-between px-4 lg:px-5 py-3.5 border-b border-mist-200">
            <h2 className="font-display font-bold text-sm text-ink-900">
              Recent Activity
            </h2>
            <button
              onClick={() => navigate("/packages")}
              className="text-xs font-medium text-signal-blue hover:underline"
            >
              View all
            </button>
          </div>
          {!dashReady ? (
            <SkeletonListRows rows={5} />
          ) : recent.length === 0 ? (
            <p className="text-sm text-ink-600/45 px-4 lg:px-5 py-6 text-center">
              No recent activity yet.
            </p>
          ) : (
            <div className="divide-y divide-mist-100 cb-fade-in">
              {recent.map((p) => (
                <div
                  key={p.tk}
                  className="flex items-center gap-3 px-4 lg:px-5 py-3"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${DOT[statusTone(p)]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/packages/${p.tk}`}
                      className="text-sm font-medium text-ink-900 hover:text-signal-blue truncate block"
                    >
                      {p.tk}
                    </Link>
                    <div className="text-xs text-ink-600/55 truncate">
                      {packageCustomerLabel(p)}
                    </div>
                  </div>
                  <div className="text-xs text-ink-700 font-medium hidden sm:block">
                    {p.status || "—"}
                  </div>
                  <div className="text-xs text-ink-600/40 shrink-0 w-16 text-right">
                    {timeAgoLabel(lastActivityAt(p))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cb-surface cb-card">
          <div className="flex items-center justify-between px-4 lg:px-5 py-3.5 border-b border-mist-200">
            <h2 className="font-display font-bold text-sm text-ink-900">
              Exception Alerts
            </h2>
            <TriangleAlert size={16} className="text-signal-red" />
          </div>
          {!dashReady ? (
            <SkeletonListRows rows={3} />
          ) : exceptions.length === 0 ? (
            <p className="text-sm text-ink-600/45 px-4 lg:px-5 py-6 text-center">
              No open exceptions.
            </p>
          ) : (
            <div className="divide-y divide-mist-100 cb-fade-in">
              {exceptions.map((p) => (
                <div key={p.tk} className="px-4 lg:px-5 py-3">
                  <div className="flex items-center justify-between">
                    <Link
                      to={`/packages/${p.tk}`}
                      className="text-sm font-medium text-ink-900 hover:text-signal-blue"
                    >
                      {p.tk}
                    </Link>
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-sm bg-signal-red/10 text-signal-red">
                      {p.exception.type}
                    </span>
                  </div>
                  <div className="text-xs text-ink-600/55 mt-0.5">
                    {p.exception.detail || packageCustomerLabel(p)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 lg:px-5 py-3 border-t border-mist-200">
            <button
              onClick={() => navigate("/exceptions")}
              className="w-full text-xs font-medium text-center text-signal-blue hover:underline"
            >
              Open Exception Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// pages/PackageDetail.jsx
// ------------------------------------------------------------
function packageFallbackDetail(tk) {
  return {
    tk,
    customer: "Unknown Customer",
    customerId: "—",
    order: "—",
    supplier: "—",
    weight: "—",
    dimension: "—",
    cbm: "—",
    warehouse: "—",
    shipment: null,
    container: null,
    exception: null,
    timeline: PACKAGE_STAGES.map((label, i) => ({
      label,
      time: null,
      state: i === 0 ? "active" : "pending",
      proceedBy: null,
    })),
  };
}

// Live registry only — no sample shipments.
const SHIPMENT_LOOKUP_DATA = {};

// Matches Customer ID against the "CUS-ID · Name" shape every package's
// `customer` field is stored in (see PackageTrackingProvider / TransferOrderModal).
function customerIdOf(pkg) {
  return String(pkg.customer || "")
    .split(" · ")[0]
    .trim();
}

function ShipmentLookup() {
  const [searchParams] = useSearchParams();
  const { packages } = usePackageTracking();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  // Real orders matched from the shared package registry — this is what
  // renders as the "Order List" (Customer ID / TK search).
  const [orderResults, setOrderResults] = useState(null);
  // Legacy curated Shipment lookup (Shipment ID / Customer Name) — kept as
  // a fallback for the sample data this page originally shipped with.
  const [shipmentResult, setShipmentResult] = useState(null);
  const [searched, setSearched] = useState(false);

  function runSearch(rawValue) {
    const query = String(rawValue || "").trim();
    if (!query) return;
    const upper = query.toUpperCase();

    // 1) TK — an exact match pulls in every other order for that same
    // customer too, so a TK search still reads as an Order List rather
    // than a single isolated row.
    const byTk = packages.filter(
      (p) => String(p.tk).trim().toUpperCase() === upper,
    );
    let matches = byTk;
    if (!byTk.length) {
      // 2) Customer ID (exact) or Order ID, or a loose match on the
      // customer string (covers pasting the full "KH-000582 · Name").
      matches = packages.filter((p) => {
        const custId = customerIdOf(p).toUpperCase();
        const orderId = String(p.order_id || "").toUpperCase();
        return (
          custId === upper ||
          orderId === upper ||
          String(p.customer || "")
            .toUpperCase()
            .includes(upper)
        );
      });
    } else {
      const customerKey = byTk[0].customer;
      matches = customerKey
        ? packages.filter((p) => p.customer === customerKey)
        : byTk;
    }

    if (matches.length) {
      setOrderResults(matches);
      setShipmentResult(null);
      setSearched(true);
      return;
    }

    // 3) Fall back to the curated sample Shipment dataset (Shipment ID or
    // Customer Name), for shipments that aren't in the live registry.
    let foundShipment =
      Object.values(SHIPMENT_LOOKUP_DATA).find((s) => s.customerId === upper) ||
      Object.values(SHIPMENT_LOOKUP_DATA).find((s) =>
        s.customerName.toUpperCase().includes(upper),
      ) ||
      Object.values(SHIPMENT_LOOKUP_DATA).find((s) =>
        s.tks.some((t) => t.tk === upper),
      ) ||
      SHIPMENT_LOOKUP_DATA[upper] ||
      null;

    setOrderResults([]);
    setShipmentResult(foundShipment);
    setSearched(true);
  }

  // A search launched from the header ("Search TK, Order, Container...")
  // lands here as ?q=..., so run it once on arrival.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = () => runSearch(searchValue);
  const noResults =
    searched && !shipmentResult && (!orderResults || orderResults.length === 0);

  return (
    <div className="space-y-5">
      <h1 className="font-display font-bold text-2xl text-ink-900">
        Shipment Lookup
      </h1>

      <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-ink-700 mb-2">
            Search by Customer ID, TK, Order ID, Name, or Shipment ID
          </label>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="ឧ. KH-000582 ឬ TK202609250041 ឬ Sothon Shop"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 min-w-[250px] px-3 py-2 border border-mist-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-signal-blue/50"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-signal-blue text-white rounded-md text-sm font-medium hover:bg-signal-blue/90 transition"
            >
              <Search size={16} className="inline mr-1.5" />
              Search
            </button>
          </div>
        </div>
      </div>

      {noResults && (
        <div className="bg-white border border-dashed border-mist-300 rounded-md p-8 text-center">
          <p className="text-ink-600/60">គ្មានលទ្ធផលSearch</p>
        </div>
      )}

      {orderResults && orderResults.length > 0 && (
        <>
          <div className="bg-white border border-signal-blue/30 rounded-md shadow-panel p-5 inline-block">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-600/50">
              Total Orders
            </div>
            <div className="text-3xl font-display font-bold text-signal-blue mt-1">
              {orderResults.length}
            </div>
          </div>

          <div className="cb-surface cb-card">
            <div className="px-5 py-3.5 border-b border-mist-200">
              <h2 className="font-display font-bold text-sm text-ink-900">
                Order List ({orderResults.length})
              </h2>
            </div>
            <DataTable
              columns={[
                {
                  key: "tk",
                  label: "TK Number",
                  strong: true,
                  linkTo: (row) => `/packages/${row.tk}`,
                },
                { key: "customer", label: "Customer" },
                { key: "weight", label: "Weight" },
                { key: "warehouse", label: "Warehouse" },
                SHIPPING_FEE_COL,
                { key: "status", label: "Status", status: true },
              ]}
              rows={orderResults}
            />
          </div>
        </>
      )}

      {shipmentResult && (
        <>
          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
            <div className="space-y-4">
              <div>
                <h2 className="font-display font-bold text-lg text-ink-900 mb-3">
                  Shipment information
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <InfoGrid
                    items={[
                      {
                        label: "Shipment ID",
                        value: shipmentResult.id,
                        strong: true,
                      },
                      {
                        label: "Customer ID",
                        value: shipmentResult.customerId,
                        strong: true,
                      },
                      {
                        label: "Customer Name",
                        value: shipmentResult.customerName,
                      },
                      { label: "Route", value: shipmentResult.route },
                    ]}
                  />
                  <InfoGrid
                    items={[
                      {
                        label: "Vessel / Voyage",
                        value: shipmentResult.vessel,
                      },
                      { label: "TK Count", value: shipmentResult.tks.length },
                      {
                        label: "Total Weight",
                        value: `${shipmentResult.tks.reduce((sum, tk) => sum + parseFloat(tk.weight), 0).toFixed(1)} KG`,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="cb-surface cb-card">
            <div className="px-5 py-3.5 border-b border-mist-200">
              <h2 className="font-display font-bold text-sm text-ink-900">
                TK List in Shipment ({shipmentResult.tks.length})
              </h2>
            </div>
            <DataTable
              columns={[
                {
                  key: "tk",
                  label: "TK Number",
                  strong: true,
                  linkTo: (row) => `/packages/${row.tk}`,
                },
                { key: "status", label: "Status", status: true },
                { key: "weight", label: "Weight" },
                { key: "fee", label: "Shipping Fee" },
              ]}
              rows={shipmentResult.tks}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// components/TransferPackageModal.jsx
// ------------------------------------------------------------
// Same Customer ID Transfer action as /customer-transfer's "Transfer
// ថ្មី" modal (CreateTransferModal above), but opened straight from a
// Package Detail page's Action menu — the TK is already known (it's
// the page you're on), so there's no TK lookup step, just pick the new
// customer and confirm. Writes to the same two places: the shared
// package registry (via upsertPackage, so this page / Packages/TK show
// the new customer immediately) and the customer_transfer log (via
// useTableRows, the same store CreateTransferModal writes to), so the
// transfer still shows up in the Customer ID Transfer history list.
function TransferPackageModal({ open, tk, fromLabel, onClose, onTransferred }) {
  const { user } = useAuth();
  const { upsertPackage, packages } = usePackageTracking();
  const { addRow: addTransferRow } = useTableRows("/customer-transfer", []);
  const [reason, setReason] = useState("");
  const [transferType, setTransferType] = useState("uid");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { matched: selectedCustomer, loading: customerLoading } =
    useCustomerLookup(transferType, query);

  useEffect(() => {
    if (open) {
      setReason("");
      setTransferType("uid");
      setQuery("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const toLabel = selectedCustomer
    ? `${selectedCustomer.id} · ${selectedCustomer.name}`
    : null;
  const sameCustomer = Boolean(toLabel && fromLabel && toLabel === fromLabel);
  const canSubmit = Boolean(
    selectedCustomer && !sameCustomer && !customerLoading,
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        tk,
        from: fromLabel,
        to: toLabel,
        reason: reason || null,
        approvedBy: user?.name || null,
        status: "Resolved",
      };

      // Move the package to its new customer first — same live registry
      // Packages/TK and this page read from — then log the transfer.
      await moveTkToCustomer({
        tk,
        toCustomer: selectedCustomer,
        toLabel,
        upsertPackage,
        packages,
      });
      await addTransferRow(payload);

      onTransferred?.(toLabel);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to transfer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200">
          <div>
            <h3 className="font-display font-bold text-base text-ink-900">
              Customer ID Transfer
            </h3>
            <p className="text-xs text-ink-600/55 mt-0.5">TK: {tk}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-600/40 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              From
            </label>
            <div className="w-full bg-mist-50 border border-mist-200 rounded-md px-3 py-2 text-sm text-ink-700">
              {fromLabel || "—"}
            </div>
          </div>

          <TransferAccountLookup
            transferType={transferType}
            onTransferTypeChange={(t) => {
              setTransferType(t);
              setQuery("");
            }}
            query={query}
            onQueryChange={setQuery}
            matched={selectedCustomer}
            loading={customerLoading}
            noteText="This transfer takes effect immediately — the TK will be removed from the original customer and appear under the new customer."
          />
          {selectedCustomer && sameCustomer && (
            <p className="text-xs text-signal-red">
              This is already the same customer — please choose a different
              customer.
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-600/55 uppercase tracking-wide mb-1">
              Reason
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Wrong Customer ID..."
              className="w-full bg-white border border-mist-200 rounded-md px-3 py-2 text-sm outline-none focus:border-signal-blue"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Transferring..." : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// components/EditPackageModal.jsx  (Super Admin)
// ------------------------------------------------------------
// Lets a Super Admin correct any TK field. Freight is recalculated
// automatically unless it was overridden by hand (same rule as re-measure).
function EditPackageModal({ open, pkg, onClose }) {
  const { user } = useAuth();
  const { upsertPackage, logStatus } = usePackageTracking();
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setF({
      order_no: pkg.order_no || pkg.order || "",
      product_name: pkg.product_name || "",
      cargo_type: pkg.cargo_type || "Normal",
      size_class: pkg.size_class || "",
      weight: pkg.weight_kg ?? String(pkg.weight || "").replace(/[^\d.]/g, ""),
      length: pkg.length_cm ?? "",
      width: pkg.width_cm ?? "",
      height: pkg.height_cm ?? "",
      package_count: pkg.package_count ?? 1,
      reason: "",
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!hasPermission(user, "tk.edit")) return;
    setError("");
    if (f.weight !== "" && !(Number(f.weight) > 0))
      return setError("Weight ត្រូវតែជាលេខវិជ្ជមាន");
    if (!String(f.reason).trim())
      return setError("សូមបញ្ចូលReason for adjustment (Reason)");
    const dimsEntered = [f.length, f.width, f.height].some(
      (v) => String(v).trim() !== "",
    );
    const cbm = computeCbm(f.length, f.width, f.height);
    const patch = {
      tk: pkg.tk,
      order_no: f.order_no || null,
      product_name: f.product_name || null,
      cargo_type: f.cargo_type || null,
      size_class: f.size_class || null,
      length_cm: dimsEntered ? Number(f.length) : null,
      width_cm: dimsEntered ? Number(f.width) : null,
      height_cm: dimsEntered ? Number(f.height) : null,
      weight_kg: f.weight !== "" ? Number(f.weight) : null,
      weight: f.weight !== "" ? `${Number(f.weight)} KG` : "",
      ...(Math.max(1, Math.floor(Number(f.package_count)) || 1) !==
      (Number(pkg.package_count) || 1)
        ? {
            package_count: Math.max(
              1,
              Math.floor(Number(f.package_count)) || 1,
            ),
          }
        : {}),
      cbm: cbm != null ? cbm.toFixed(3) : "",
      updated_by: user?.name || "Super Admin",
      updated_at: new Date().toISOString(),
    };
    const calc = calcFreight({
      cargoType: f.cargo_type,
      sizeClass: f.size_class,
      length: f.length,
      width: f.width,
      height: f.height,
    });
    if (calc.ok && !pkg.freight_overridden) {
      patch.pricing_method = calc.method;
      patch.rate = calc.rate;
      patch.freight_fee = calc.fee;
    }
    setSaving(true);
    try {
      await upsertPackage(patch);
      logStatus(
        pkg.tk,
        pkg.status || "Edited",
        user?.name || "Super Admin",
        `Super Admin edit · Reason: ${String(f.reason).trim()}`,
      );
      onClose();
    } catch (err) {
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-lg text-ink-900">
            Edit Package · {pkg.tk}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-600/40 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-signal-red">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Order Number</label>
              <input
                className={INPUT_CLS}
                value={f.order_no ?? ""}
                onChange={set("order_no")}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Product Name</label>
              <input
                className={INPUT_CLS}
                value={f.product_name ?? ""}
                onChange={set("product_name")}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Cargo Type</label>
              <select
                className={INPUT_CLS}
                value={f.cargo_type ?? ""}
                onChange={set("cargo_type")}
              >
                {CARGO_TYPES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Size</label>
              <select
                className={INPUT_CLS}
                value={f.size_class ?? ""}
                onChange={set("size_class")}
              >
                <option value="">—</option>
                {SIZE_CHOICES.map((c) => (
                  <option key={c} value={c}>
                    {sizeLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLS}>Weight (KG)</label>
              <input
                className={INPUT_CLS}
                type="number"
                step="any"
                value={f.weight ?? ""}
                onChange={set("weight")}
              />
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLS}>Package Quantity</label>
              <input
                className={INPUT_CLS}
                type="number"
                min="1"
                step="1"
                value={f.package_count ?? 1}
                onChange={set("package_count")}
              />
            </div>
            {[
              ["length", "Length (cm)"],
              ["width", "Width (cm)"],
              ["height", "Height (cm)"],
            ].map(([k, label]) => (
              <div key={k}>
                <label className={LABEL_CLS}>{label}</label>
                <input
                  className={INPUT_CLS}
                  type="number"
                  step="any"
                  value={f[k] ?? ""}
                  onChange={set(k)}
                />
              </div>
            ))}
          </div>
          <div>
            <label className={LABEL_CLS}>Reason *</label>
            <input
              className={INPUT_CLS}
              value={f.reason ?? ""}
              onChange={set("reason")}
              placeholder="Reason for adjustment"
            />
          </div>
          <p className="text-[11px] text-ink-600/45">
            CBM is calculated from L × W × H. Freight Fee is recalculated
            automatically unless the fee is manually overridden.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-4 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-signal-blue text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
          >
            {saving ? "កំពុងSave..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// components/DeletePackageModal.jsx  (Super Admin)
// ------------------------------------------------------------
function DeletePackageModal({ open, tk, onClose, onDeleted }) {
  const { user } = useAuth();
  const { deletePackage } = usePackageTracking();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTyped("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function confirm() {
    if (!hasPermission(user, "tk.delete")) return;
    setBusy(true);
    setError("");
    try {
      await deletePackage(tk);
      onDeleted();
    } catch (err) {
      setError(err.message || "Unable to delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-md"
      >
        <div className="px-5 py-4 border-b border-mist-200 flex items-center gap-2 text-signal-red">
          <TriangleAlert size={18} />
          <h3 className="font-display font-bold text-lg">Delete Package</h3>
        </div>
        <div className="px-5 py-4 space-y-3 text-sm text-ink-700">
          <p>
            Are you sure you want to permanently delete <b>{tk}</b>{" "}
            ជាអចិន្ត្រៃយ៍មែនទេ? This action cannot be undone.
          </p>
          <div>
            <label className={LABEL_CLS}>Enter TK to confirm</label>
            <input
              className={INPUT_CLS}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={tk}
            />
          </div>
          {error && <p className="text-xs text-signal-red">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-4 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || typed.trim() !== tk}
            onClick={confirm}
            className="bg-signal-red text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-signal-red/90 disabled:opacity-50"
          >
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/TrackingHistoryModal.jsx
// ------------------------------------------------------------
// The full step-by-step Tracking Timeline now lives behind this modal
// (opened from the "Tracking History" button) instead of always being
// shown inline on the page — same Timeline component/data, just a
// cleaner default view of the page with the full history one click away.
function TrackingHistoryModal({ open, onClose, steps }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-lg text-ink-900">
            Tracking History
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-600/40 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pt-5 pb-1">
          <Timeline steps={steps} />
        </div>
        <div className="flex items-center justify-end px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="bg-signal-blue text-white text-sm font-medium px-5 py-2 rounded-md hover:bg-signal-blue/90"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// components/PrintLabelModal.jsx — Print Label (Arrived Destination)
// ------------------------------------------------------------
// ស្លាកPackageសម្រាប់ TK ដែលមកដល់ខ្មែរ។ Order មាន 1 Package → "1 / 1";
// មាន 2 Packageឡើងទៅ → 1 / 2, 2 / 2 … ហើយចុច Prev / Next ដើម្បីប្តូរទៅស្លាកផ្សេង
// ឬ Print All ម្តងAll។   Needs:  npm i jsbarcode qrcode
// Label size: change LABEL_W_MM / LABEL_H_MM to match your sticker roll.
const LABEL_W_MM = 120;
const LABEL_H_MM = 100;

async function buildLabelCodes(tk) {
  const [{ default: JsBarcode }, { default: QRCode }] = await Promise.all([
    import("jsbarcode"),
    import("qrcode"),
  ]);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, String(tk), {
    format: "CODE128",
    displayValue: false,
    height: 60,
    width: 2,
    margin: 0,
  });
  if (!svg.getAttribute("viewBox")) {
    svg.setAttribute(
      "viewBox",
      `0 0 ${parseFloat(svg.getAttribute("width")) || 200} ${
        parseFloat(svg.getAttribute("height")) || 60
      }`,
    );
  }
  svg.setAttribute("preserveAspectRatio", "none");
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.removeAttribute("style");
  const qr = await QRCode.toString(String(tk), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });
  return { barcode: svg.outerHTML, qr };
}

// Container type / shipping method for the label's Container box.
const _labelContainerCache = {};
async function getLabelContainer(no) {
  if (!no) return null;
  const key = String(no).trim().toUpperCase();
  if (key in _labelContainerCache) return _labelContainerCache[key];
  let row = null;
  try {
    if (supabase) {
      const { data } = await supabase
        .from("containers")
        .select("container_number, container_type, shipping_method")
        .eq("container_number", no)
        .maybeSingle();
      row = data || null;
    }
    if (!row) {
      row =
        (lsRead(CONTAINERS_KEY, []) || []).find(
          (c) =>
            String(c.container_number || "")
              .trim()
              .toUpperCase() === key,
        ) || null;
    }
  } catch {
    row = null;
  }
  _labelContainerCache[key] = row;
  return row;
}

function labelWeight(w) {
  if (w === undefined || w === null || w === "") return "—";
  return /^\d+(\.\d+)?$/.test(String(w).trim())
    ? `${Number(w).toFixed(1)} kg`
    : String(w);
}

const LABEL_LOGO = `<svg viewBox="0 0 48 48" width="100%" height="100%"><path d="M24 4 42 14v20L24 44 6 34V14z" fill="#1d5fe0"/><path d="M24 4 42 14 24 24 6 14z" fill="#4c8dff"/><path d="M24 24v20L6 34V14z" fill="#0b3aa8"/><path d="M6 14 24 24 42 14" stroke="#fff" stroke-width="1.2" fill="none" opacity=".6"/></svg>`;

const LABEL_CSS = `
  @page{size:${LABEL_W_MM}mm ${LABEL_H_MM}mm;margin:0}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff}
  body{font-family:'Noto Sans Khmer','Khmer OS Battambang','Inter',Arial,sans-serif;color:#0b1f4d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:${LABEL_W_MM}mm;height:${LABEL_H_MM}mm;padding:3mm 4mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}
  .page:last-child{page-break-after:auto}
  .cap{font-size:2.3mm;font-weight:700;letter-spacing:.2mm;color:#5b6b8f;text-transform:uppercase}
  .hd{display:flex;align-items:center;justify-content:space-between;padding-bottom:1.6mm;border-bottom:.3mm solid #c9d6f0}
  .brand{display:flex;align-items:center;gap:2mm}
  .logo{width:8mm;height:8mm}
  .bn{font-weight:800;font-size:4.6mm;letter-spacing:.4mm;line-height:1}
  .bs{font-size:2mm;letter-spacing:.35mm;color:#5b6b8f;margin-top:.5mm}
  .pill{background:#dfeafd;color:#1d5fe0;font-weight:700;font-size:2.6mm;padding:1.2mm 3mm;border-radius:5mm}
  .top{display:flex;flex:1;min-height:0;padding:1.6mm 0;border-bottom:.3mm solid #c9d6f0}
  .lf{width:56%;padding-right:3mm;border-right:.3mm solid #c9d6f0;display:flex;flex-direction:column;justify-content:space-between}
  .uid{font-weight:800;font-size:9.5mm;line-height:1;letter-spacing:-.2mm}
  .bar svg{display:block;width:100%;height:11mm}
  .tk{text-align:center;font-weight:700;font-size:3.6mm;margin-top:.8mm}
  .rt{flex:1;padding-left:3mm;display:flex;flex-direction:column;justify-content:space-between}
  .v{font-weight:700;font-size:3.3mm;line-height:1.15;word-break:break-word}
  .sub{font-size:2.5mm;color:#5b6b8f}
  .stats{display:flex;align-items:stretch;background:#f3f7ff;border:.3mm solid #dbe5f7;border-radius:1.5mm;margin-top:1.6mm}
  .st{flex:1;padding:1.2mm 2mm;border-right:.3mm solid #dbe5f7}
  .st .big{font-weight:800;font-size:4.4mm;line-height:1.1}
  .qr{width:19mm;padding:1.2mm;text-align:center}
  .qr svg{width:12.5mm;height:12.5mm;display:block;margin:0 auto}
  .qr .cap{font-size:1.7mm;margin-top:.6mm;text-transform:none;color:#1d5fe0}
  .bt{display:flex;margin-top:1.6mm}
  .bt>div{flex:1;padding:0 2mm;border-right:.3mm solid #dbe5f7;min-width:0}
  .bt>div:nth-child(2){flex:1.5}
  .bt>div:first-child{padding-left:0}
  .bt>div:last-child{border-right:0}
  .ft{margin-top:1.4mm;padding-top:1mm;border-top:.3mm solid #c9d6f0;text-align:center;font-size:2.1mm;letter-spacing:.6mm;color:#5b6b8f;font-weight:700}
`;

function labelPageHtml(d, codes) {
  const e = htmlEsc;
  return `<div class="page">
  <div class="hd">
    <div class="brand"><div class="logo">${LABEL_LOGO}</div>
      <div><div class="bn">CARGO BRIDGE</div><div class="bs">LOGISTICS &amp; FORWARDING</div></div></div>
    <div class="pill">PACKAGE LABEL</div>
  </div>
  <div class="top">
    <div class="lf">
      <div><div class="cap">ID:</div><div class="uid">${e(d.customerId)}</div></div>
      <div><div class="bar">${codes.barcode}</div><div class="tk">TK: ${e(d.tk)}</div></div>
    </div>
    <div class="rt">
      <div><div class="cap">Order Date</div><div class="v">${e(d.orderDate)}</div><div class="sub">${e(d.orderNo)}</div></div>
      <div><div class="cap">Customer</div><div class="v">${e(d.name)}</div><div class="v">${e(d.phone)}</div></div>
      <div><div class="cap">Destination</div><div class="v">${e(d.branchName)}</div><div class="sub">${e(d.branchCode)}</div></div>
    </div>
  </div>
  <div class="stats">
    <div class="st"><div class="cap">Package</div><div class="big">${e(d.pkgCount)}</div><div class="sub">Total Package</div></div>
    <div class="st"><div class="cap">Weight</div><div class="big">${e(d.weight)}</div><div class="sub">Gross Weight</div></div>
    <div class="st"><div class="cap">CBM</div><div class="big">${e(d.cbm)}</div><div class="sub">Volume</div></div>
    <div class="qr">${codes.qr}<div class="cap">Scan for Tracking</div></div>
  </div>
  <div class="bt">
    <div><div class="cap">Freight</div><div class="big v" style="font-size:4mm">${e(d.price)}</div><div class="sub">Total Freight</div></div>
    <div><div class="cap">Route</div><div class="v" style="white-space:nowrap;font-size:2.9mm">${e(d.origin)} → ${e(d.branchCode)}</div><div class="sub">China → Cambodia</div></div>
    <div><div class="cap">Container</div><div class="v">${e(d.containerNo)}</div><div class="sub">${e(d.containerSub)}</div></div>
  </div>
  <div class="ft">TRACK &nbsp;•&nbsp; SHIP &nbsp;•&nbsp; DELIVER</div>
</div>`;
}

function labelDocHtml(pagesHtml, title) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEsc(title)}</title><style>${LABEL_CSS}</style></head><body>${pagesHtml}</body></html>`;
}

function printHtmlHidden(html) {
  const f = document.createElement("iframe");
  f.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(f);
  f.onload = () => {
    f.contentWindow.focus();
    f.contentWindow.print();
    setTimeout(() => f.remove(), 3000);
  };
  f.srcdoc = html;
}

function PrintLabelModal({ open, onClose, pkg, custId, custName }) {
  const { rows: whRows } = useWarehouses();
  const [phone, setPhone] = useState("—");
  const [orderDate, setOrderDate] = useState("—");
  const [idx, setIdx] = useState(0);
  const [codes, setCodes] = useState(null);
  const [cont, setCont] = useState(null);
  const [err, setErr] = useState("");

  // ចំនួនPackage = ចំនួនPackageក្នុង TK នេះ (package_count, លំនាំដើម 1)
  const ono = pkg?.order_no || pkg?.order;
  const total = Math.max(1, Math.floor(Number(pkg?.package_count)) || 1);
  const cur = pkg;

  useEffect(() => {
    if (open) setIdx(0);
  }, [open, pkg?.tk]);

  // Customer phone + order date (same for every label of the order).
  useEffect(() => {
    if (!open || !pkg) return;
    let alive = true;
    setPhone(pkg.phone || "—");
    setOrderDate(pkg.inbound_at ? formatIso(pkg.inbound_at) : "—");
    if (supabase && pkg.customer_id) {
      supabase
        .from("customers")
        .select("phone")
        .eq("id", pkg.customer_id)
        .maybeSingle()
        .then(({ data }) => alive && data?.phone && setPhone(data.phone));
    }
    if (ono)
      findOrderByNo(ono).then((o) => {
        if (alive && o?.created_at) setOrderDate(formatIso(o.created_at));
      });
    return () => {
      alive = false;
    };
  }, [open, pkg?.tk, pkg?.customer_id]);

  // Barcode / QR + container info for the label being previewed.
  useEffect(() => {
    if (!open || !cur?.tk) return;
    let alive = true;
    setErr("");
    setCodes(null);
    buildLabelCodes(cur.tk)
      .then((c) => alive && setCodes(c))
      .catch(
        () =>
          alive &&
          setErr(
            "មិនអាចបង្កើត Barcode / QR បានទេ — សូមរត់ npm i jsbarcode qrcode",
          ),
      );
    getLabelContainer(cur.container_no || cur.container).then(
      (c) => alive && setCont(c),
    );
    return () => {
      alive = false;
    };
  }, [open, cur?.tk]);

  if (!open || !pkg) return null;

  const wh = whRows.find((x) => x.code === cur.dest_branch_code);
  function dataFor(x, i, c) {
    const cno = x.container_no || x.container || "—";
    return {
      tk: x.tk,
      orderNo: ono || "—",
      customerId: custId || "—",
      name: custName || "—",
      phone,
      orderDate,
      branchName: wh ? wh.name : x.dest_branch_code || "—",
      branchCode: x.dest_branch_code || "—",
      origin: x.origin_wh_code || x.warehouse || "—",
      pkgCount: `${i + 1} / ${total}`,
      weight: labelWeight(x.weight_kg ?? x.weight),
      cbm: x.cbm ? Number(x.cbm).toFixed(6) + " m³" : "—",
      price:
        x.freight_fee !== undefined &&
        x.freight_fee !== null &&
        x.freight_fee !== ""
          ? money(x.freight_fee)
          : "—",
      containerNo: cno,
      containerSub: c
        ? [c.container_type, c.shipping_method].filter(Boolean).join(" · ")
        : "",
    };
  }

  const curIdx = Math.min(idx, total - 1);
  const previewHtml = codes
    ? labelDocHtml(labelPageHtml(dataFor(cur, curIdx, cont), codes), cur.tk)
    : "";

  function printCurrent() {
    if (previewHtml) printHtmlHidden(previewHtml);
  }
  async function printAll() {
    try {
      const [c, k] = await Promise.all([
        getLabelContainer(cur.container_no || cur.container),
        buildLabelCodes(cur.tk),
      ]);
      const pages = [];
      for (let i = 0; i < total; i++)
        pages.push(labelPageHtml(dataFor(cur, i, c), k));
      printHtmlHidden(labelDocHtml(pages.join(""), `Labels ${ono || ""}`));
    } catch {
      setErr("មិនអាច Print Allបានទេ");
    }
  }

  const navBtn =
    "flex items-center gap-1 text-sm font-medium border border-mist-200 px-2.5 py-1.5 rounded-md hover:bg-mist-50 disabled:opacity-40";

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-xl max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-lg text-ink-900">
            Print Label
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-600/40 hover:text-ink-900"
          >
            <X size={18} />
          </button>
        </div>

        {total > 1 && (
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-mist-200 bg-mist-50">
            <button
              type="button"
              className={navBtn}
              disabled={curIdx <= 0}
              onClick={() => setIdx(curIdx - 1)}
            >
              <Icons.ChevronLeft size={15} />
              Prev
            </button>
            <span className="text-sm text-ink-700">
              Package <b>{curIdx + 1}</b> / {total} · {cur.tk}
            </span>
            <button
              type="button"
              className={navBtn}
              disabled={curIdx >= total - 1}
              onClick={() => setIdx(curIdx + 1)}
            >
              Next
              <Icons.ChevronRight size={15} />
            </button>
          </div>
        )}

        <div className="p-4 overflow-auto flex justify-center bg-mist-50">
          {err ? (
            <p className="text-sm text-signal-red py-10">{err}</p>
          ) : !codes ? (
            <p className="text-sm text-ink-600/50 py-10">Preparing label…</p>
          ) : (
            <iframe
              title="label-preview"
              srcDoc={previewHtml}
              className="bg-white border border-mist-200 shadow-sm"
              style={{
                width: `${LABEL_W_MM * 3.78}px`,
                height: `${LABEL_H_MM * 3.78}px`,
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200 flex-wrap">
          {total > 1 && (
            <button
              type="button"
              onClick={printAll}
              className="flex items-center gap-1.5 text-sm font-medium text-signal-blue border border-signal-blue/30 bg-signal-blue/5 px-3.5 py-2 rounded-md hover:bg-signal-blue/10"
            >
              <Icons.Printer size={14} />
              Print All ({total})
            </button>
          )}
          <button
            type="button"
            onClick={printCurrent}
            disabled={!codes}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-50"
          >
            <Icons.Printer size={14} />
            {total > 1 ? `Print ${curIdx + 1}/${total}` : "Print"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-700 border border-mist-200 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PackageDetail() {
  const { tk } = useParams();
  const { user } = useAuth();
  const {
    getTimeline,
    advance,
    findPackage,
    ready: pkgReady,
  } = usePackageTracking();
  // A TK scanned through Inbound/Outbound Origin lives in the shared
  // package registry (see PackageTrackingContext) — Packages / TK,
  // Inbound Origin and Outbound Origin all already read it from there.
  // This page used to only check the 5 sample PACKAGE_DETAILS rows and
  // fall back to an all-dash template for anything else, which is why a
  // real TK like YT99887722 showed "Unknown Customer" / "—" everywhere
  // even though its actual data was sitting in the registry. Merge the
  // registry record on top so real, captured fields win and only
  // genuinely-unknown fields stay as "—".
  const registryRecord = findPackage(tk);
  const baseline = PACKAGE_DETAILS[tk] || packageFallbackDetail(tk);
  const data = registryRecord ? { ...baseline, ...registryRecord } : baseline;
  const timeline = getTimeline(tk);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showTrackingHistory, setShowTrackingHistory] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const navigate = useNavigate();
  const actionMenuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target))
        setActionMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const currentStage =
    timeline.find((s) => s.state === "active")?.label ||
    [...timeline].reverse().find((s) => s.state === "done")?.label ||
    timeline[0].label;
  const currentStep =
    timeline.find((s) => s.label === currentStage) || timeline[0];
  const isComplete = timeline[timeline.length - 1].state === "done";
  const gatedStage = VERIFY_GATED_STAGES[currentStage];
  // Processing a TK's status forward is a Super Admin–only action — every
  // other role (China/Cambodia Warehouse Staff, Customs, Customer Service,
  // Customer...) can see this Tracking Timeline but must not be able to
  // click it forward.
  const canProcessStatus = hasPermission(user, "tk.process");
  const canManageInbound = hasPermission(user, "tk.manage_inbound");
  const isCustomerRole = user?.role === "Customer";
  const isInboundStage = currentStage === "Inbound Origin";
  // Print Label is available once the TK reaches Cambodia (Arrived Destination or later).
  const canPrintLabel =
    !isCustomerRole &&
    PACKAGE_STAGES.indexOf(currentStage) >=
      PACKAGE_STAGES.indexOf("Arrived Destination");
  // TKs created through New TK must be "Ready for Shipment" before they
  // can leave; older TKs without an inbound status aren't blocked.
  const outboundReady =
    !data.inbound_status || data.inbound_status === "Ready for Shipment";
  const containerNo = data.container_no || data.container || null;
  const customerParts = String(data.customer || "").split(" · ");
  const custId =
    customerParts.length > 1 ? customerParts[0] : data.customerId || "—";
  const custName =
    customerParts.length > 1
      ? customerParts.slice(1).join(" · ")
      : data.customer;
  const dimensionText =
    data.length_cm && data.width_cm && data.height_cm
      ? `${data.length_cm} × ${data.width_cm} × ${data.height_cm} cm`
      : data.dimension;
  const notAllowed =
    isCustomerRole && (!user?.customerId || custId !== user.customerId);
  const customerLabel =
    data.customerId && data.customerId !== "—"
      ? `${data.customerId} · ${data.customer}`
      : data.customer;

  function handleAdvance() {
    // Belt-and-suspenders: the button itself is already hidden for
    // non-Super-Admins, but guard the handler too.
    if (!hasPermission(user, "tk.process")) return;
    // Leaving Inbound Origin goes through "Move to Outbound" so the
    // Container Number is always captured.
    if (currentStage === "Inbound Origin") return;
    advance(tk, user?.name || "Admin");
  }

  // Unknown TK while the registry is still loading → skeleton, not "—" rows.
  if (!pkgReady && !registryRecord && !PACKAGE_DETAILS[tk])
    return (
      <DetailPageSkeleton
        backTo="/packages"
        backLabel="Back to Packages / TK"
      />
    );

  if (notAllowed) {
    return (
      <div className="space-y-4">
        <Link
          to="/packages"
          className="inline-flex items-center gap-1.5 text-sm text-ink-600/60 hover:text-ink-900"
        >
          <ArrowLeft size={15} />
          Back to Packages / TK
        </Link>
        <div className="bg-white border border-mist-200 rounded-md shadow-panel py-16 flex flex-col items-center text-center">
          <Icons.Lock size={32} className="text-ink-600/20 mb-3" />
          <p className="text-sm text-ink-600/55">
            You do not have permission to view this TK.
          </p>
        </div>
      </div>
    );
  }

  // ---- Status action (same rules as before, just moved under the stepper) ----
  const statusAction = (
    <>
      {!isComplete && !gatedStage && !isInboundStage && canProcessStatus && (
        <button
          onClick={handleAdvance}
          className="flex items-center gap-1.5 bg-signal-blue text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-signal-blue/90 disabled:opacity-60"
        >
          <ChevronRight size={14} />
          Process to next status
        </button>
      )}
      {!isComplete && !gatedStage && !isInboundStage && !canProcessStatus && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-600/45">
          <Eye size={14} />
          View only — only Super Admin can process this.
        </span>
      )}
      {!isComplete &&
        isInboundStage &&
        canManageInbound &&
        (outboundReady ? (
          <Link
            to={`/outbound-origin?tk=${encodeURIComponent(data.tk)}`}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-signal-blue/90 whitespace-nowrap"
          >
            <ArrowRight size={14} />
            Move to Outbound
          </Link>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-[#B87415]">
            <TriangleAlert size={14} />
            Inbound Status must be Ready for Shipment first.
          </span>
        ))}
      {!isComplete && isInboundStage && !canManageInbound && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-600/45">
          <Eye size={14} />
          View only
        </span>
      )}
      {!isComplete && gatedStage && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[#B87415]">
            <Ship size={14} />
            {gatedStage.note}
          </span>
          {canProcessStatus && (
            <button
              onClick={handleAdvance}
              title={`Super Admin only — bypasses ${gatedStage.nextLabel ? `waiting for the real scan and jumps straight to "${gatedStage.nextLabel}"` : "the wait for the real scan"}`}
              className="flex items-center gap-1.5 bg-signal-blue text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-signal-blue/90 disabled:opacity-60 whitespace-nowrap"
            >
              <ChevronRight size={14} />
              Process to next status
            </button>
          )}
        </div>
      )}
      {isComplete && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-signal-teal">
          <CircleCheck size={14} />
          Completed
        </span>
      )}
    </>
  );

  const lastUpdated =
    [...timeline].reverse().find((s) => s.state !== "pending" && s.time)
      ?.time || "—";
  const createdAt = data.inbound_at
    ? formatIso(data.inbound_at)
    : timeline[0]?.time || "—";
  const historyRows = [...timeline]
    .filter((s) => s.state !== "pending")
    .reverse();

  function copyTk() {
    navigator.clipboard?.writeText(data.tk);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function shareTk() {
    navigator.clipboard?.writeText(
      `${window.location.origin}/customer/shipments/${encodeURIComponent(data.tk)}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const CARD = "bg-white border border-mist-200 rounded-md shadow-panel";
  const KV = ({ k, v }) => (
    <div className="flex items-start gap-3 py-1.5">
      <dt className="w-28 shrink-0 text-xs text-ink-600/50">{k}</dt>
      <dd className="text-sm font-medium text-ink-900 min-w-0 break-words">
        {v ?? "—"}
      </dd>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-ink-600/60">
        <Link
          to="/packages"
          className="hover:text-ink-900"
          title="Packages / TK"
        >
          <Icons.Home size={15} />
        </Link>
        <ChevronRight size={13} className="text-ink-600/30" />
        <Link to="/packages" className="hover:text-ink-900">
          Packages / TK
        </Link>
        <ChevronRight size={13} className="text-ink-600/30" />
        <span className="text-ink-900 font-medium">{data.tk}</span>
      </nav>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* ============ LEFT / MAIN ============ */}
        <div className="space-y-5 min-w-0">
          {/* Header card */}
          <div className={`${CARD} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-signal-blue/10 text-signal-blue flex items-center justify-center shrink-0">
                  <Package size={22} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-ink-600/50">Tracking Number</div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display font-bold text-2xl text-ink-900 break-all">
                      {data.tk}
                    </h1>
                    <button
                      type="button"
                      onClick={copyTk}
                      title="Copy"
                      className="text-ink-600/40 hover:text-signal-blue"
                    >
                      {copied ? (
                        <Check size={15} className="text-signal-teal" />
                      ) : (
                        <Copy size={15} />
                      )}
                    </button>
                  </div>
                  <div className="mt-1.5">
                    <StatusBadge label={currentStage} />
                  </div>
                  <div className="text-[11px] text-ink-600/45 mt-1.5">
                    Last Updated: {lastUpdated}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canPrintLabel && (
                  <button
                    type="button"
                    onClick={() => setShowLabel(true)}
                    className="flex items-center gap-1.5 bg-white border border-mist-200 text-sm font-medium text-ink-700 px-3 py-1.5 rounded-md hover:bg-mist-50"
                  >
                    <Icons.Printer size={14} />
                    Print Label
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowTrackingHistory(true)}
                  className="flex items-center gap-1.5 bg-white border border-mist-200 text-sm font-medium text-ink-700 px-3 py-1.5 rounded-md hover:bg-mist-50"
                >
                  <Icons.History size={14} />
                  Tracking History
                </button>
                <div className="relative" ref={actionMenuRef}>
                  <button
                    type="button"
                    onClick={() => setActionMenuOpen((v) => !v)}
                    className="flex items-center gap-1.5 bg-white border border-mist-200 text-sm font-medium text-ink-700 px-3 py-1.5 rounded-md hover:bg-mist-50"
                  >
                    Action
                    <ChevronDown size={14} className="text-ink-600/50" />
                  </button>
                  {actionMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-mist-200 rounded-md shadow-lg py-1.5 z-50">
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenuOpen(false);
                          setShowTransfer(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-mist-50 text-left"
                      >
                        <Icons.ArrowLeftRight size={15} />
                        Customer ID Transfer
                      </button>
                      {canProcessStatus && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setActionMenuOpen(false);
                              setShowEdit(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-mist-50 text-left"
                          >
                            <Icons.Pencil size={15} />
                            Edit Package
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActionMenuOpen(false);
                              setShowDelete(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-signal-red hover:bg-signal-red/5 text-left border-t border-mist-100"
                          >
                            <Icons.Trash2 size={15} />
                            Delete Package
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-mist-100">
              {[
                [Icons.User, "Customer", custName || "—", custId],
                [
                  Icons.FileText,
                  "Order",
                  data.order_no || data.order || "—",
                  null,
                ],
                [Icons.Truck, "Shipment", data.shipment || "—", null],
              ].map(([I, label, value, sub]) => (
                <div key={label} className="flex items-start gap-2.5 min-w-0">
                  <I size={16} className="text-ink-600/45 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-ink-600/50">{label}</div>
                    <div className="text-sm font-semibold text-ink-900 truncate">
                      {value}
                    </div>
                    {sub && (
                      <div className="text-xs text-ink-600/45">{sub}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {data.exception && (
            <div className="flex items-start gap-2.5 bg-signal-red/10 text-signal-red text-sm rounded-md px-4 py-3">
              <TriangleAlert size={16} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">{data.exception.type}</div>
                <div className="text-signal-red/80 mt-0.5">
                  {data.exception.detail}
                </div>
              </div>
            </div>
          )}

          {/* Horizontal stepper */}
          <div className={`${CARD} p-5`}>
            <div className="overflow-x-auto">
              <ol className="flex min-w-[560px]">
                {timeline.map((step, i) => {
                  const done = step.state === "done";
                  const active = step.state === "active";
                  return (
                    <li
                      key={step.label}
                      className="flex-1 flex flex-col items-center text-center relative"
                    >
                      {i < timeline.length - 1 && (
                        <span
                          className={`absolute top-4 left-1/2 w-full h-0.5 ${
                            done ? "bg-signal-teal" : "bg-mist-200"
                          }`}
                        />
                      )}
                      <span
                        className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          done
                            ? "bg-signal-teal border-signal-teal text-white"
                            : active
                              ? "bg-signal-blue border-signal-blue text-white ring-4 ring-signal-blue/15"
                              : "bg-white border-mist-200 text-ink-600/30"
                        }`}
                      >
                        {done ? (
                          <Check size={15} strokeWidth={3} />
                        ) : active ? (
                          <Icons.MapPin size={14} />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span
                        className={`mt-2 text-xs px-1 ${
                          active
                            ? "font-semibold text-signal-blue"
                            : done
                              ? "font-medium text-ink-900"
                              : "text-ink-600/45"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="text-[10px] text-ink-600/40 mt-0.5">
                        {step.time || "Pending"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="mt-4 pt-3 border-t border-mist-100 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-ink-600/45">
                Proceed By: {currentStep.proceedBy || "NA"}
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                {statusAction}
              </div>
            </div>
          </div>

          {/* Package information + product images */}
          <div className="grid md:grid-cols-5 gap-5">
            <div className={`${CARD} p-5 md:col-span-3`}>
              <h2 className="flex items-center gap-2 font-display font-bold text-sm text-signal-blue mb-3">
                <Package size={16} />
                Package Information
              </h2>
              <dl className="grid sm:grid-cols-2 gap-x-6">
                <div>
                  <KV k="Tracking Number" v={data.tk} />
                  <KV k="Order Number" v={data.order_no || data.order} />
                  <KV
                    k="Customer"
                    v={
                      custId && custId !== "—"
                        ? `${custName} (${custId})`
                        : custName
                    }
                  />
                  <KV k="Created At" v={createdAt} />
                  <KV
                    k="Current Status"
                    v={<StatusBadge label={currentStage} />}
                  />
                </div>
                <div>
                  <KV k="Product Name" v={data.product_name} />
                  <KV k="Category" v={data.cargo_type} />
                  <KV k="Weight" v={data.weight} />
                  <KV k="Size" v={sizeLabel(data.size_class)} />
                  <KV k="CBM" v={data.cbm} />
                  <KV k="Dimensions" v={dimensionText} />
                  <KV k="Supplier" v={data.supplier} />
                  <KV k="Packages" v={data.package_count || 1} />
                </div>
              </dl>
            </div>
            <div className="md:col-span-2">
              <PhotoGallery tk={data.tk} />
            </div>
          </div>

          {/* Tracking history (vertical list) */}
          <div className={`${CARD} p-5`}>
            <h2 className="flex items-center gap-2 font-display font-bold text-sm text-ink-900 mb-4">
              <Icons.Clock size={16} className="text-ink-600/60" />
              Tracking History
            </h2>
            <ol>
              {historyRows.map((s, i) => {
                const isActive = s.state === "active";
                return (
                  <li key={s.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-signal-blue/15 border-2 border-signal-blue"
                            : "bg-signal-teal text-white"
                        }`}
                      >
                        {isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-signal-blue" />
                        ) : (
                          <Check size={11} strokeWidth={3} />
                        )}
                      </span>
                      {i < historyRows.length - 1 && (
                        <span className="w-px flex-1 bg-mist-200 min-h-[22px]" />
                      )}
                    </div>
                    <div className="flex-1 flex items-start justify-between gap-3 pb-4 min-w-0">
                      <div>
                        <div className="text-sm font-medium text-ink-900">
                          {s.label}
                        </div>
                        <div className="text-xs text-ink-600/45">
                          Proceed By: {s.proceedBy || "NA"}
                        </div>
                      </div>
                      <div className="text-xs text-ink-600/50 whitespace-nowrap">
                        {s.time || "—"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <StatusHistoryCard pkg={data} timeline={timeline} />
        </div>

        {/* ============ RIGHT / SIDEBAR ============ */}
        <div className="space-y-5">
          <CustomerDetailsCard customerId={data.customer_id} />

          <div className={`${CARD} p-5`}>
            <h2 className="flex items-center gap-2 font-display font-bold text-sm text-ink-900 mb-3">
              <Icons.MapPin size={16} className="text-ink-600/60" />
              Warehouse
            </h2>
            <InfoGrid
              items={[
                {
                  label: "Origin Warehouse (China)",
                  value: (
                    <WhLabel code={data.origin_wh_code || data.warehouse} />
                  ),
                  span: true,
                },
                {
                  label: "Destination (Cambodia Branch)",
                  value: <WhLabel code={data.dest_branch_code} />,
                  span: true,
                },
                { label: "Inbound Date", value: createdAt, span: true },
                { label: "Created By", value: data.created_by || "—" },
                { label: "Updated By", value: data.updated_by || "—" },
                ...(containerNo
                  ? [
                      {
                        label: "Container",
                        value: (
                          <Link
                            to={`/containers/${containerNo}`}
                            className="text-signal-blue hover:underline"
                          >
                            {containerNo}
                          </Link>
                        ),
                        span: true,
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {!isCustomerRole && (
            <div className={`${CARD} p-5`}>
              <h2 className="flex items-center gap-2 font-display font-bold text-sm text-ink-900 mb-3">
                <Icons.Receipt size={16} className="text-ink-600/60" />
                Freight
              </h2>
              <InfoGrid
                items={[
                  {
                    label: "Pricing Method",
                    value:
                      data.pricing_method === "CBM"
                        ? "CBM"
                        : data.pricing_method === "Fixed"
                          ? "Fixed size (S / M / L)"
                          : "—",
                    span: true,
                  },
                  { label: "Rate", value: rateLabel(data) },
                  {
                    label: "Freight Fee",
                    value: (
                      <span className="text-signal-blue font-bold">
                        {data.freight_fee !== undefined &&
                        data.freight_fee !== null &&
                        data.freight_fee !== ""
                          ? money(data.freight_fee)
                          : "—"}
                      </span>
                    ),
                  },
                  ...(data.freight_overridden
                    ? [
                        {
                          label: "Note",
                          value: "Admin override",
                          span: true,
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          )}

          <div className={`${CARD} p-5`}>
            <h2 className="flex items-center gap-2 font-display font-bold text-sm text-ink-900 mb-3">
              <Icons.Zap size={16} className="text-signal-blue" />
              Quick Actions
            </h2>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={copyTk}
                className="w-full flex items-center gap-2 border border-signal-blue/30 bg-signal-blue/5 text-signal-blue text-sm font-medium px-3 py-2 rounded-md hover:bg-signal-blue/10"
              >
                <Copy size={14} />
                Copy Tracking Number
              </button>
              <button
                type="button"
                onClick={shareTk}
                className="w-full flex items-center gap-2 border border-signal-blue/30 bg-signal-blue/5 text-signal-blue text-sm font-medium px-3 py-2 rounded-md hover:bg-signal-blue/10"
              >
                <Icons.Share2 size={14} />
                Share Tracking
              </button>
            </div>
          </div>
        </div>
      </div>

      <TransferPackageModal
        open={showTransfer}
        tk={data.tk}
        fromLabel={customerLabel}
        onClose={() => setShowTransfer(false)}
        onTransferred={() => setShowTransfer(false)}
      />
      {canPrintLabel && (
        <PrintLabelModal
          open={showLabel}
          onClose={() => setShowLabel(false)}
          pkg={data}
          custId={custId}
          custName={custName}
        />
      )}
      <TrackingHistoryModal
        open={showTrackingHistory}
        onClose={() => setShowTrackingHistory(false)}
        steps={timeline}
      />
      {canProcessStatus && (
        <>
          <EditPackageModal
            open={showEdit}
            pkg={data}
            onClose={() => setShowEdit(false)}
          />
          <DeletePackageModal
            open={showDelete}
            tk={data.tk}
            onClose={() => setShowDelete(false)}
            onDeleted={() => navigate("/packages")}
          />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// pages/OrderDetail.jsx
// ------------------------------------------------------------
function orderFallbackDetail(id) {
  return {
    id,
    uid: "—",
    customer: "Unknown Customer",
    date: "—",
    platform: "—",
    status: "Processing",
    products: [],
    shipment: null,
    container: null,
    timeline: ORDER_STAGES.map((label, i) => ({
      label,
      time: null,
      state: i === 0 ? "active" : "pending",
    })),
  };
}

// Super Admin edit / delete for an Order (permission enforced in the UI;
// add RLS in Supabase for real protection). The route id may be an
// order_no (ORD-...) or the row's uuid, so pick the matching column.
const orderMatchColumn = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(id)) ? "id" : "order_no";

async function superUpdateOrder(order, patch) {
  const { uid, ...dbPatch } = patch;
  if (uid !== undefined && ORDER_DETAILS[order.id])
    ORDER_DETAILS[order.id].uid = uid;
  if (Object.keys(dbPatch).length === 0) return;
  if (!supabase || String(order.id).startsWith("local-")) {
    writeLocalOrders(
      readLocalOrders().map((o) =>
        o.id === order.id || o.order_no === order.id ? { ...o, ...dbPatch } : o,
      ),
    );
    if (ORDER_DETAILS[order.id])
      Object.assign(ORDER_DETAILS[order.id], dbPatch);
    return;
  }
  const { error } = await supabase
    .from("orders")
    .update(dbPatch)
    .eq(orderMatchColumn(order.id), order.id);
  if (error) throw new Error(error.message);
}

async function superDeleteOrder(order) {
  if (supabase && !String(order.id).startsWith("local-")) {
    const { data, error } = await supabase
      .from("orders")
      .delete()
      .eq(orderMatchColumn(order.id), order.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data?.length)
      throw new Error("Server មិនអនុញ្ញាតឱ្យលុបទេ (គ្មានសិទ្ធិ Super Admin)");
  }
  writeLocalOrders(
    readLocalOrders().filter(
      (o) => o.id !== order.id && o.order_no !== order.id,
    ),
  );
  delete ORDER_DETAILS[order.id];
}

function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEditOrder = hasPermission(user, "order.edit");
  const canDeleteOrder = hasPermission(user, "order.delete");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [data, setData] = useState(
    () => ORDER_DETAILS[id] || orderFallbackDetail(id),
  );
  const [showTransfer, setShowTransfer] = useState(false);

  const customerName = (data.customer || "").split(" · ")[1] || data.customer;
  const customerId = (data.customer || "").split(" · ")[0];

  return (
    <div className="space-y-5">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-ink-600/60 hover:text-ink-900"
      >
        <ArrowLeft size={15} />
        Back to Orders
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-signal-blue/10 text-signal-blue flex items-center justify-center shrink-0">
            <Icons.ClipboardList size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ink-900">
              {data.id}
            </h1>
            <p className="text-sm text-ink-600/55 mt-0.5">
              UID: {data.uid} · {customerId} · {customerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <StatusBadge label={data.status} />
          <button
            type="button"
            onClick={() => setShowTransfer(true)}
            className="flex items-center gap-1.5 bg-white border border-mist-200 text-ink-800 text-sm font-medium px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            <Waypoints size={14} />
            Transfer Order
          </button>
          {(canEditOrder || canDeleteOrder) && (
            <>
              {canEditOrder && (
                <button
                  type="button"
                  onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 bg-white border border-mist-200 text-ink-800 text-sm font-medium px-3.5 py-2 rounded-md hover:bg-mist-50"
                >
                  <Icons.Pencil size={14} />
                  Edit
                </button>
              )}
              {canDeleteOrder && (
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="flex items-center gap-1.5 bg-white border border-signal-red/30 text-signal-red text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-red/5"
                >
                  <Icons.Trash2 size={14} />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-mist-200 rounded-md shadow-panel p-5">
          <h2 className="font-display font-bold text-sm text-ink-900 mb-5">
            Order Timeline
          </h2>
          <Timeline steps={data.timeline} />
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
            <h2 className="font-display font-bold text-sm text-ink-900 mb-4">
              Order & Product Information
            </h2>
            <InfoGrid
              items={[
                { label: "Order Date", value: data.date },
                { label: "Platform", value: data.platform },
                { label: "UID", value: data.uid },
                { label: "Customer", value: data.customer, span: true },
              ]}
            />
          </div>

          <OrderRouteInfo orderNo={data.id} />

          {(data.shipment || data.container) && (
            <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
              <h2 className="font-display font-bold text-sm text-ink-900 mb-4">
                Shipping
              </h2>
              <InfoGrid
                items={[
                  data.shipment && {
                    label: "Shipment",
                    value: data.shipment,
                    span: true,
                  },
                  data.container && {
                    label: "Container",
                    value: (
                      <Link
                        to={`/containers/${data.container}`}
                        className="text-signal-blue hover:underline"
                      >
                        {data.container}
                      </Link>
                    ),
                    span: true,
                  },
                ].filter(Boolean)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="cb-surface cb-card">
        <div className="px-4 lg:px-5 py-3.5 border-b border-mist-200">
          <h2 className="font-display font-bold text-sm text-ink-900">
            Products in Order ({data.products.length})
          </h2>
        </div>
        <DataTable
          columns={[
            { key: "name", label: "Product", strong: true },
            { key: "qty", label: "Qty" },
            { key: "unitPrice", label: "Unit Price" },
          ]}
          rows={data.products}
        />
      </div>

      <TransferOrderModal
        open={showTransfer}
        order={data}
        onClose={() => setShowTransfer(false)}
        onTransferred={(toLabel) =>
          setData((d) => ({ ...d, customer: toLabel }))
        }
      />
      {canEditOrder && showEdit && (
        <RowEditModal
          row={data}
          columns={[
            { key: "platform", label: "Platform" },
            { key: "date", label: "Order Date" },
            { key: "status", label: "Status" },
            { key: "uid", label: "UID" },
          ]}
          onSave={async (patch) => {
            await superUpdateOrder(data, patch);
            setData((d) => ({ ...d, ...patch }));
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
      {canDeleteOrder && showDelete && (
        <RowDeleteModal
          label={data.id}
          onConfirm={async () => {
            await superDeleteOrder(data);
            navigate(-1);
          }}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------
// lib/containers.js — Container Management (PHASE 1-3)
// ------------------------------------------------------------
// Phase 1 = Container list / create / edit / detail / summary / history,
// and the early lifecycle: Draft → Loading → Loaded (+ On Hold / Cancelled).
// Coming in later phases: Add/Scan TK (2), Seal → Depart (3),
// Arrive → Unloading (4), Manifest + Customer view (5), and Exception /
// Photo / TK Transfer between Containers (6 — run supabase/container_phase6.sql).
//
// SUPABASE: run supabase/container_phase1.sql once (containers,
// container_items, container_history). Without Supabase this module falls
// back to localStorage like Warehouse Management does.
//
// TK list on a Container = active rows in container_items PLUS any TK whose
// packages.container_no already equals this Container Number (the number
// typed at Outbound Origin), so existing shipments show up immediately.
const CONTAINER_TYPES = ["20FT", "40FT", "40HQ", "Other"];
const SHIPPING_METHODS = ["Sea", "Land", "Rail", "Air"];
// Container status flow (same for land and sea).
// Main path: Empty → Loading → Departure China Warehouse → Arrived Destination.
// CN / VN customs statuses are recorded when the truck reaches each border:
// Completed = cleared, Hold = waiting, Failed = rejected. They are optional.
const CONTAINER_LIFECYCLE = [
  "Empty",
  "Loading",
  "Departure China Warehouse",
  "CN: Customs Clearance Completed",
  "VN: Customs Clearance Completed",
  "Arrived Destination",
];
const CONTAINER_CUSTOMS_ACTIONS = [
  "CN: Customs Clearance Hold",
  "CN: Customs Clearance Failed",
  "CN: Customs Clearance Completed",
  "VN: Customs Clearance Hold",
  "VN: Customs Clearance Failed",
  "VN: Customs Clearance Completed",
];
// Order used for the status cards and the filter.
const CONTAINER_STATUS_LIST = [
  "Empty",
  "Loading",
  "Departure China Warehouse",
  ...CONTAINER_CUSTOMS_ACTIONS,
  "Arrived Destination",
];
// Old status names (before this flow) → new ones, so existing rows still work.
const CONTAINER_LEGACY_STATUS = {
  Draft: "Empty",
  Loaded: "Loading",
  Sealed: "Loading",
  "On Hold": "Loading",
  "Departed China": "Departure China Warehouse",
  "In Transit": "Departure China Warehouse",
  "Arrived Cambodia": "Arrived Destination",
  Unloading: "Arrived Destination",
  Completed: "Arrived Destination",
  Exception: "Arrived Destination",
};
const normContainerStatus = (st) =>
  CONTAINER_LEGACY_STATUS[st] || st || "Empty";
const normContainerRows = (rows) =>
  (rows || []).map((r) => ({ ...r, status: normContainerStatus(r.status) }));
// 0 Empty · 1 Loading · 2 Departure · 3 CN customs · 4 VN customs · 5 Arrived
function containerStage(st) {
  const v = normContainerStatus(st);
  if (v === "Empty") return 0;
  if (v === "Loading") return 1;
  if (v === "Departure China Warehouse") return 2;
  if (v.startsWith("CN:")) return 3;
  if (v.startsWith("VN:")) return 4;
  if (v === "Arrived Destination") return 5;
  return 0; // Cancelled / unknown
}
// Nominal usable CBM per container type (used for the Loading CBM card).
const CONTAINER_CBM_CAPACITY = { "20FT": 33, "40FT": 67, "40HQ": 76 };
const CONTAINER_EDITABLE = ["Empty", "Loading"];
// CONTAINER_MANAGE_ROLES → permission "container.manage" (see lib/permissions.js)
// Cambodia side: confirm arrival, unload, scan TK, complete.
// CONTAINER_KH_ROLES → permission "container.receive" (see lib/permissions.js)

// PHASE 6 — Exception / Photo / TK Transfer between Containers.
const CONTAINER_EXCEPTION_TYPES = [
  "Missing TK",
  "Damaged TK",
  "Seal Problem",
  "Wrong Container / Unexpected TK",
  "Weight / CBM Difference",
  "Other",
];
// An evidence photo is mandatory for these exception types.
const CONTAINER_EXCEPTION_PHOTO_REQUIRED = ["Damaged TK", "Seal Problem"];
const CONTAINER_PHOTO_CATEGORIES = [
  "Container Door",
  "Seal",
  "Loading",
  "Unloading",
  "Damage / Exception",
  "Other",
];
// A TK can move between two containers that are both still on the China
// side (being loaded), or both on the Cambodia side (arrived / unloading).
const CONTAINER_TRANSFER_CN = ["Empty", "Loading"];
const CONTAINER_TRANSFER_KH_FROM = [
  "Departure China Warehouse",
  ...CONTAINER_CUSTOMS_ACTIONS,
  "Arrived Destination",
];
const CONTAINER_TRANSFER_KH_TO = ["Arrived Destination"];
const CONTAINER_EXCEPTIONS_KEY = "cargo_bridge_container_exceptions";
const CONTAINER_TRANSFERS_KEY = "cargo_bridge_container_transfers";
const CONTAINER_P6_HINT =
  "តារាង Exception / Photo / Transfer មិនទាន់មាន — សូមរត់ SQL Container Phase 6 សិន";

// A TK counts as unloaded once its own stage is Arrived Destination or later.
function tkUnloaded(p) {
  const i = PACKAGE_STAGES.indexOf(p.status);
  return i >= PACKAGE_STAGES.indexOf("Arrived Destination");
}

const CONTAINERS_KEY = "cargo_bridge_containers";
const CONTAINER_ITEMS_KEY = "cargo_bridge_container_items";
const CONTAINER_HISTORY_KEY = "cargo_bridge_container_history";
const CONTAINER_TABLE_HINT =
  "តារាង containers មិនទាន់មាន — សូមរត់ SQL Container Phase 1 សិន";

const CT_BTN_PRIMARY =
  "inline-flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-60";
const CT_BTN_GHOST =
  "inline-flex items-center gap-1.5 border border-mist-200 bg-white text-ink-700 text-sm font-medium px-3.5 py-2 rounded-md hover:bg-mist-50 disabled:opacity-60";
const CT_BTN_DANGER =
  "inline-flex items-center gap-1.5 border border-signal-red/30 text-signal-red text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-red/10 disabled:opacity-60";
const CT_CARD = "bg-white border border-mist-200 rounded-md shadow-panel";

function containerCanMove(from, to) {
  if (to === "Cancelled") return ["Empty", "Loading"].includes(from);
  if (from === "Empty") return to === "Loading";
  if (from === "Loading") return to === "Departure China Warehouse";
  if (!CONTAINER_STATUS_LIST.includes(to)) return false;
  if (from === "Arrived Destination" || from === "Cancelled") return false;
  const a = containerStage(from);
  const b = containerStage(to);
  if (b === a && /Completed$/.test(from)) return false;
  return b > a || (b === a && to !== from);
}

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const tkKey = (tk) =>
  String(tk || "")
    .trim()
    .toLowerCase();

// Customer ID + name of a TK, from the existing TK → Order → Customer data.
function tkCustomerParts(p) {
  const raw = String(p.customer || "");
  const parts = raw.split(" · ");
  const id = parts.length > 1 ? parts[0] : p.customer_id || "—";
  const name = parts.length > 1 ? parts.slice(1).join(" · ") : raw || "—";
  return { id, name };
}

function tkRowsFor(container, activeItems, packages) {
  if (!container || container.status === "Cancelled") return [];
  const keys = new Set(
    activeItems
      .filter((i) => i.container_id === container.id)
      .map((i) => tkKey(i.tk)),
  );
  const no = String(container.container_number || "").toUpperCase();
  packages.forEach((p) => {
    if (p.container_no && String(p.container_no).trim().toUpperCase() === no)
      keys.add(tkKey(p.tk));
  });
  return packages.filter((p) => keys.has(tkKey(p.tk)));
}

function summarizeTks(rows) {
  const n = (v) => Number(v) || 0;
  return {
    tk: rows.length,
    orders: new Set(rows.map((r) => r.order_no).filter(Boolean)).size,
    customers: new Set(
      rows.map((r) => tkCustomerParts(r).id).filter((x) => x && x !== "—"),
    ).size,
    cbm: rows.reduce((s, r) => s + n(r.cbm), 0),
    weight: rows.reduce((s, r) => s + n(r.weight_kg ?? r.weight), 0),
    freight: rows.reduce((s, r) => s + n(r.freight_fee), 0),
  };
}

function containerTimeline(container, history) {
  const mine = history
    .filter((h) => h.container_id === container.id)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const steps = [];
  mine.forEach((h) => {
    let label = null;
    if (h.action === "Container Created") label = "Empty";
    else if (String(h.action).startsWith("Status: "))
      label = normContainerStatus(String(h.action).slice(8));
    if (!label || steps[steps.length - 1]?.label === label) return;
    steps.push({
      label,
      time: formatIso(h.created_at),
      proceedBy: h.created_by,
      state: "done",
    });
  });
  if (!steps.length)
    steps.push({
      label: container.status,
      time: formatIso(container.updated_at || container.created_at),
      proceedBy: container.updated_by || container.created_by,
      state: "done",
    });
  const last = steps[steps.length - 1];
  if (last.label !== "Arrived Destination") last.state = "active";
  const stage = containerStage(container.status);
  if (container.status !== "Cancelled") {
    if (stage < 2)
      steps.push({
        label: "Departure China Warehouse",
        time: null,
        proceedBy: null,
        state: "pending",
      });
    if (stage < 5)
      steps.push({
        label: "Arrived Destination",
        time: null,
        proceedBy: null,
        state: "pending",
      });
  }
  return steps;
}

const CONTAINER_TK_EDITABLE = ["Empty", "Loading"];

// PHASE 6 — can a TK move from container `from` into container `to`?
function transferPairOk(from, to) {
  if (!from || !to || from.id === to.id) return false;
  if (to.status === "Cancelled" || from.status === "Cancelled") return false;
  if (from.dest_wh_code !== to.dest_wh_code) return false;
  if (CONTAINER_TRANSFER_CN.includes(from.status))
    return CONTAINER_TRANSFER_CN.includes(to.status);
  return (
    CONTAINER_TRANSFER_KH_FROM.includes(from.status) &&
    CONTAINER_TRANSFER_KH_TO.includes(to.status)
  );
}

// PHASE 6 — container photos. Same "cargo-photos" bucket, under
// containers/<container id>/. Local copy lives in the same IndexedDB store
// as TK photos, keyed "CONTAINER:<id>".
const ctPhotoKey = (containerId) => `CONTAINER:${containerId}`;

// Returns a warning string if something failed (never throws).
async function saveContainerPhotos(container, photos, extra = {}) {
  const stamped = photos.map((p) => ({
    ...p,
    exception_id: extra.exception_id || null,
    tk: extra.tk || null,
    by: extra.by || null,
  }));
  let warning = "";
  try {
    const prev = await loadPhotosLocal(ctPhotoKey(container.id)).catch(
      () => [],
    );
    await savePhotosLocal({ tk: ctPhotoKey(container.id) }, [
      ...prev,
      ...stamped,
    ]);
  } catch (err) {
    warning = `មិនអាចSaveរូបភាពក្នុង browser បានទេ: ${err.message}`;
  }
  if (supabase) {
    try {
      for (const p of stamped) {
        const blob = await (await fetch(p.dataUrl)).blob();
        const path = `containers/${container.id}/${p.id}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("cargo-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { error } = await supabase.from("container_photos").insert({
          container_id: container.id,
          exception_id: p.exception_id,
          tk: p.tk,
          category: p.category,
          storage_path: path,
          uploaded_by: p.by,
        });
        if (error) throw error;
      }
      warning = "";
    } catch (err) {
      warning = `Upload រូបភាពទៅ Supabase មិនបានជោគជ័យ: ${err.message}`;
    }
  }
  return warning;
}

async function loadContainerPhotos(containerId) {
  if (supabase) {
    const { data, error } = await supabase
      .from("container_photos")
      .select("*")
      .eq("container_id", containerId)
      .order("created_at");
    if (!error && data && data.length)
      return data.map((r) => ({
        id: r.id,
        category: r.category,
        name: r.storage_path,
        dataUrl: supabase.storage
          .from("cargo-photos")
          .getPublicUrl(r.storage_path).data.publicUrl,
        addedAt: r.created_at,
        exception_id: r.exception_id,
        tk: r.tk,
        by: r.uploaded_by,
      }));
  }
  return loadPhotosLocal(ctPhotoKey(containerId)).catch(() => []);
}

// PHASE 2 — the 7 checks a TK must pass before it may enter a Container.
// Returns { ok, pkg, error, kind } where kind is ok | assigned | invalid.
function checkTkForContainer({
  raw,
  container,
  packages,
  activeItems,
  containers,
}) {
  const key = tkKey(raw);
  const pkg = packages.find((p) => tkKey(p.tk) === key);
  const no = container.container_number;
  const bad = (error, kind = "invalid") => ({ ok: false, pkg, error, kind });

  // 1. TK exists
  if (!pkg) return bad(`TK not found "${String(raw).trim()}" ក្នុងប្រព័ន្ធទេ`);

  // 2. not already in THIS container
  const here = tkRowsFor(container, activeItems, packages);
  if (here.some((p) => tkKey(p.tk) === key))
    return bad(`TK ${pkg.tk} មានក្នុង Container ${no} រួចហើយ`, "assigned");

  // 6. not in another active container
  const item = activeItems.find(
    (i) => tkKey(i.tk) === key && i.container_id !== container.id,
  );
  const other = item
    ? containers.find((c) => c.id === item.container_id)
    : null;
  if (other && other.status !== "Cancelled")
    return bad(
      `TK ${pkg.tk} ត្រូវបានដាក់ក្នុង Container ${other.container_number} រួចហើយ`,
      "assigned",
    );
  const legacyNo = String(pkg.container_no || "")
    .trim()
    .toUpperCase();
  if (legacyNo && legacyNo !== String(no).toUpperCase()) {
    const c2 = containers.find(
      (c) => String(c.container_number).toUpperCase() === legacyNo,
    );
    if (!c2 || c2.status !== "Cancelled")
      return bad(
        `TK ${pkg.tk} ត្រូវបានដាក់ក្នុង Container ${legacyNo} រួចហើយ`,
        "assigned",
      );
  }

  // 3. valid Customer   4. valid Order
  if (tkCustomerParts(pkg).id === "—")
    return bad(`TK ${pkg.tk} មិនមាន Customer ID ត្រឹមត្រូវ`);
  if (!String(pkg.order_no || "").trim())
    return bad(`TK ${pkg.tk} មិនមាន Order ID`);

  // 5. inbound finished (same rule as Outbound Origin)
  if (pkg.inbound_status && pkg.inbound_status !== "Ready for Shipment")
    return bad(
      `TK ${pkg.tk} មិនទាន់ Ready for Shipment ទេ (Inbound Status: ${pkg.inbound_status})`,
    );

  // 7. eligible for outbound shipment
  if (pkg.exception)
    return bad(`TK ${pkg.tk} មាន Exception ត្រូវដោះស្រាយPrevious`);
  if (pkg.status && pkg.status !== "Inbound Origin")
    return bad(
      `TK ${pkg.tk} មិនអាចផ្ញើបានទេ (Status បច្ចុប្បន្ន: ${pkg.status})`,
    );

  return { ok: true, pkg, error: "", kind: "ok" };
}

function useContainerStore() {
  const { user } = useAuth();
  const by = user?.name || "Admin";
  const { rows: whRows } = useWarehouses();
  const { packages, upsertPackage, logStatus, syncTimelineToStatus } =
    usePackageTracking();
  const [containers, setContainersRaw] = useState(() =>
    supabase ? [] : normContainerRows(lsRead(CONTAINERS_KEY, [])),
  );
  const [items, setItemsRaw] = useState(() =>
    supabase ? [] : lsRead(CONTAINER_ITEMS_KEY, []),
  );
  const [history, setHistoryRaw] = useState(() =>
    supabase ? [] : lsRead(CONTAINER_HISTORY_KEY, []),
  );
  const [loading, setLoading] = useState(!!supabase);
  const [ready, setReady] = useState(!supabase); // first fetch finished
  const [tableReady, setTableReady] = useState(!supabase);

  // Local-mode writes also go to localStorage; live mode only keeps state.
  const mk = (setter, key) => (updater) =>
    setter((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (!supabase) lsWrite(key, next);
      return next;
    });
  const setContainers = mk(setContainersRaw, CONTAINERS_KEY);
  const setItems = mk(setItemsRaw, CONTAINER_ITEMS_KEY);
  const setHistory = mk(setHistoryRaw, CONTAINER_HISTORY_KEY);

  // PHASE 6 — kept separate from tableReady so a missing Phase 6 SQL never
  // breaks Phases 1-5.
  const [exceptions, setExceptionsRaw] = useState(() =>
    supabase ? [] : lsRead(CONTAINER_EXCEPTIONS_KEY, []),
  );
  const [transfers, setTransfersRaw] = useState(() =>
    supabase ? [] : lsRead(CONTAINER_TRANSFERS_KEY, []),
  );
  const [p6Ready, setP6Ready] = useState(!supabase);
  const [photoVersion, setPhotoVersion] = useState(0);
  const setExceptions = mk(setExceptionsRaw, CONTAINER_EXCEPTIONS_KEY);
  const setTransfers = mk(setTransfersRaw, CONTAINER_TRANSFERS_KEY);

  const refetch = React.useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const [c, i, h] = await Promise.all([
      supabase
        .from("containers")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("container_items").select("*").is("removed_at", null),
      supabase
        .from("container_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    setLoading(false);
    setReady(true);
    if (c.error || i.error || h.error) {
      setTableReady(false);
      return;
    }
    setTableReady(true);
    setContainersRaw(normContainerRows(c.data));
    setItemsRaw(i.data);
    setHistoryRaw(h.data);

    const [ex, tr, ph] = await Promise.all([
      supabase
        .from("container_exceptions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("container_transfers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("container_photos").select("id").limit(1),
    ]);
    if (ex.error || tr.error || ph.error) {
      setP6Ready(false);
    } else {
      setP6Ready(true);
      setExceptionsRaw(ex.data);
      setTransfersRaw(tr.data);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const activeItems = items.filter((i) => !i.removed_at);

  async function logEvent(containerId, action, detail, tk) {
    const row = {
      container_id: containerId,
      action,
      detail: detail || null,
      tk: tk || null,
      created_by: by,
    };
    if (supabase) {
      const { data, error } = await supabase
        .from("container_history")
        .insert(row)
        .select("*")
        .single();
      if (!error && data) setHistory((p) => [data, ...p]);
      return;
    }
    setHistory((p) => [
      { id: makeId(), ...row, created_at: new Date().toISOString() },
      ...p,
    ]);
  }

  async function logEvents(rows) {
    if (!rows.length) return;
    const full = rows.map((r) => ({
      container_id: r.container_id,
      action: r.action,
      detail: r.detail || null,
      tk: r.tk || null,
      created_by: by,
    }));
    if (supabase) {
      const { data, error } = await supabase
        .from("container_history")
        .insert(full)
        .select("*");
      if (!error && data) setHistory((p) => [...data, ...p]);
      return;
    }
    const now = new Date().toISOString();
    setHistory((p) => [
      ...full.map((r) => ({ id: makeId(), ...r, created_at: now })),
      ...p,
    ]);
  }

  function checkFields(v, ignoreId) {
    const routeErr = validateOrderRoute(
      v.origin_wh_code,
      v.dest_wh_code,
      whRows,
    );
    if (routeErr) throw new Error(routeErr);
    if (v.departure_date && v.eta && v.eta < v.departure_date)
      throw new Error("ETA ត្រូវនៅក្រោយ ឬស្មើ Departure Date");
    return ignoreId;
  }

  const clean = (v) => {
    const t = (x) => String(x || "").trim();
    return {
      container_type: v.container_type || "40HQ",
      shipment_no: t(v.shipment_no) || null,
      origin_wh_code: v.origin_wh_code,
      dest_wh_code: v.dest_wh_code,
      shipping_method: v.shipping_method || "Sea",
      carrier: t(v.carrier) || null,
      departure_date: v.departure_date || null,
      eta: v.eta || null,
      remark: t(v.remark) || null,
    };
  };

  async function createContainer(v) {
    const number = String(v.container_number || "")
      .trim()
      .toUpperCase();
    if (!number) throw new Error("Container Number ត្រូវការ");
    if (!/^[A-Z0-9-]{4,20}$/.test(number))
      throw new Error("Container Number មិនត្រឹមត្រូវ (ឧ. MSCU1234567)");
    if (
      containers.some(
        (c) => String(c.container_number).toUpperCase() === number,
      )
    )
      throw new Error(`Container "${number}" មានរួចហើយ`);
    checkFields(v);
    const row = {
      container_number: number,
      ...clean(v),
      status: "Empty",
      created_by: by,
      updated_by: by,
    };
    let saved;
    if (supabase) {
      const { data, error } = await supabase
        .from("containers")
        .insert(row)
        .select("*")
        .single();
      if (error)
        throw new Error(
          error.code === "23505"
            ? `Container "${number}" មានរួចហើយ`
            : error.message,
        );
      saved = data;
    } else {
      const now = new Date().toISOString();
      saved = { id: makeId(), ...row, created_at: now, updated_at: now };
    }
    setContainers((p) => [saved, ...p]);
    await logEvent(
      saved.id,
      "Container Created",
      `${number} · ${row.container_type}`,
    );
    return saved;
  }

  async function saveContainer(container, patch) {
    const full = {
      ...patch,
      updated_by: by,
      updated_at: new Date().toISOString(),
    };
    let out;
    if (supabase) {
      const { data, error } = await supabase
        .from("containers")
        .update(full)
        .eq("id", container.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      out = data;
    } else {
      out = { ...container, ...full };
    }
    setContainers((p) => p.map((c) => (c.id === container.id ? out : c)));
    return out;
  }

  async function updateContainer(container, v) {
    if (!CONTAINER_EDITABLE.includes(container.status))
      throw new Error("Container នេះមិនអាចកែបានទេ");
    checkFields(v);
    await saveContainer(container, clean(v));
    await logEvent(
      container.id,
      "Container Edited",
      "Edit container information",
    );
  }

  // Super Admin only: edit a Container in ANY status (the normal edit is
  // limited to Draft / Loading / Loaded / On Hold).
  async function forceUpdateContainer(container, v) {
    requirePermission(
      user,
      "container.edit",
      "You do not have permission to edit this container.",
    );
    checkFields(v);
    await saveContainer(container, clean(v));
    await logEvent(
      container.id,
      "Container Edited",
      "Super Admin Edit container information",
    );
  }

  // Super Admin only: permanently delete a Container. Its TKs are released
  // (container_no cleared) and its item / history rows are removed first.
  async function deleteContainer(container) {
    requirePermission(
      user,
      "container.delete",
      "You do not have permission to delete containers.",
    );
    const releasing = tkRowsFor(container, activeItems, packages);
    if (supabase) {
      // Child rows first, but a blocked parent delete must not leave a
      // half-deleted Container — so verify the server allows deleting the
      // parent before touching anything else (needs ON DELETE CASCADE on
      // container_items / container_history, see super_admin_permissions.sql).
      const { data, error } = await supabase
        .from("containers")
        .delete()
        .eq("id", container.id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data?.length)
        throw new Error("Server មិនអនុញ្ញាតឱ្យលុបទេ (គ្មានសិទ្ធិ Super Admin)");
    }
    setItems((p) => p.filter((i) => i.container_id !== container.id));
    setHistory((p) => p.filter((h) => h.container_id !== container.id));
    setContainers((p) => p.filter((c) => c.id !== container.id));
    for (const p of releasing) {
      try {
        await upsertPackage({ tk: p.tk, container_no: null });
      } catch {
        // TK keeps its old number; it no longer matches any Container.
      }
    }
  }

  // next: a plain status name (Loading, CN/VN customs statuses, Cancelled).
  // Depart China and Confirm Arrival have their own actions.
  async function changeStatus(container, next, reason) {
    const from = container.status;
    if (!containerCanMove(from, next))
      throw new Error(`មិនអាចប្តូរពី ${from} ទៅ ${next} បានទេ`);
    if (next === "Departure China Warehouse")
      throw new Error("សូមប្រើប៊ូតុង Depart China");
    if (next === "Arrived Destination")
      throw new Error("សូមប្រើប៊ូតុង Confirm Arrival");
    if (
      !hasPermission(user, "container.manage") &&
      !hasPermission(user, "container.receive")
    )
      throw new Error("You do not have permission to perform this action.");
    if (next === "Cancelled" && !String(reason || "").trim())
      throw new Error("សូមបញ្ចូលមូលហេតុ");
    const releasing =
      next === "Cancelled" ? tkRowsFor(container, activeItems, packages) : [];
    await saveContainer(container, { status: next });
    if (next === "Cancelled") {
      // Release every TK so it can go into another container.
      const now = new Date().toISOString();
      if (supabase) {
        await supabase
          .from("container_items")
          .update({ removed_at: now, removed_by: by, status: "Removed" })
          .eq("container_id", container.id)
          .is("removed_at", null);
        setItems((p) => p.filter((i) => i.container_id !== container.id));
      } else {
        setItems((p) =>
          p.map((i) =>
            i.container_id === container.id && !i.removed_at
              ? { ...i, removed_at: now, removed_by: by, status: "Removed" }
              : i,
          ),
        );
      }
    }
    for (const p of releasing) {
      try {
        await upsertPackage({ tk: p.tk, container_no: null });
      } catch {
        // TK stays linked by number only; it is ignored while Cancelled.
      }
    }
    await logEvent(
      container.id,
      next === "Cancelled" ? next : `Status: ${next}`,
      String(reason || "").trim() || `${from} → ${next}`,
    );
  }

  function assertManage() {
    if (!hasPermission(user, "container.manage"))
      throw new Error("You do not have permission to perform this action.");
  }

  // PHASE 3 — Seal: needs a Seal Number and at least one TK.
  async function sealContainer(container, sealNumber) {
    assertManage();
    if (container.status !== "Loaded")
      throw new Error("ត្រូវ Mark Loaded Previous ទើប Seal បាន");
    const seal = String(sealNumber || "")
      .trim()
      .toUpperCase();
    if (!seal) throw new Error("Seal Number ត្រូវការ");
    if (!/^[A-Z0-9-]{3,30}$/.test(seal))
      throw new Error("Seal Number មិនត្រឹមត្រូវ (ឧ. SL998812)");
    if (
      containers.some(
        (c) =>
          c.id !== container.id &&
          c.status !== "Cancelled" &&
          String(c.seal_number || "").toUpperCase() === seal,
      )
    )
      throw new Error(`Seal "${seal}" ត្រូវបានប្រើក្នុង Container ផ្សេងរួចហើយ`);
    const n = tkRowsFor(container, activeItems, packages).length;
    if (n < 1)
      throw new Error("Container ត្រូវមាន TK យ៉ាងហោចណាស់ 1 Previous Seal");
    await saveContainer(container, {
      status: "Sealed",
      seal_number: seal,
      sealed_by: by,
      sealed_at: new Date().toISOString(),
    });
    await logEvent(container.id, "Status: Sealed", `Seal: ${seal} · ${n} TK`);
  }

  // Super Admin only: undo a Seal (reason required). History is kept.
  async function breakSeal(container, reason) {
    requirePermission(
      user,
      "container.break_seal",
      "You do not have permission to break the seal.",
    );
    if (container.status !== "Sealed")
      throw new Error("Container មិនស្ថិតក្នុង Sealed");
    if (!String(reason || "").trim()) throw new Error("សូមបញ្ចូលមូលហេតុ");
    await saveContainer(container, {
      status: "Loaded",
      seal_number: null,
      sealed_by: null,
      sealed_at: null,
    });
    await logEvent(
      container.id,
      "Seal Broken",
      `${container.seal_number || "—"} — ${String(reason).trim()}`,
    );
  }

  // PHASE 3 — Depart China. Every check must pass; then the container is
  // "Departed China" and each TK moves to Outbound Origin (= in transit in
  // this app), keeping its own timeline/history. Returns { tks, warn }.
  async function departChina(container) {
    assertManage();
    const tks = tkRowsFor(container, activeItems, packages);
    const wh = (code, type) =>
      whRows.find(
        (w) => w.code === code && w.type === type && w.status === "Active",
      );
    const problems = [];
    if (!String(container.container_number || "").trim())
      problems.push("Container Number ត្រូវការ");
    if (!["Empty", "Loading"].includes(container.status))
      problems.push("Container ត្រូវស្ថិតក្នុង Empty / Loading");
    if (tks.length < 1) problems.push("Container ត្រូវមាន TK យ៉ាងហោចណាស់ 1");
    if (!wh(container.origin_wh_code, "china"))
      problems.push("Origin China Warehouse មិនមាន ឬមិន Active");
    if (!wh(container.dest_wh_code, "cambodia"))
      problems.push("Destination Cambodia Branch មិនមាន ឬមិន Active");
    if (problems.length) throw new Error(problems.join(" • "));

    const now = new Date().toISOString();
    await saveContainer(container, {
      status: "Departure China Warehouse",
      departed_at: now,
      departed_by: by,
    });
    await logEvent(
      container.id,
      "Status: Departure China Warehouse",
      `${tks.length} TK`,
    );

    // Only TKs still at Inbound Origin move; a TK already further along
    // (e.g. scanned at the old Outbound Origin page) keeps its stage.
    let warn = 0;
    const movers = tks.filter(
      (p) => !p.status || p.status === "Inbound Origin",
    );
    for (let i = 0; i < movers.length; i += 8) {
      await Promise.all(
        movers.slice(i, i + 8).map(async (p) => {
          try {
            await upsertPackage({
              tk: p.tk,
              container_no: container.container_number,
              outboundAt: formatNowTimestamp(),
              updated_by: by,
              updated_at: now,
            });
            syncTimelineToStatus(
              p.tk,
              "Outbound Origin",
              by,
              `Container ${container.container_number} departure China Warehouse`,
            );
          } catch {
            warn += 1;
          }
        }),
      );
    }
    return { tks: tks.length, warn };
  }

  function assertKh() {
    if (!hasPermission(user, "container.receive"))
      throw new Error("មានតែ Cambodia Warehouse ឬ Admin ទេដែលធ្វើបាន");
  }

  async function confirmArrival(container) {
    assertKh();
    if (
      containerStage(container.status) < 2 ||
      container.status === "Arrived Destination"
    )
      throw new Error(
        "Container ត្រូវចេញពីឃ្លាំងចិនPrevious ទើបConfirmមកដល់បាន",
      );
    if (!whIsActive(whRows, container.dest_wh_code, "cambodia"))
      throw new Error("Destination Cambodia Branch មិនមាន ឬមិន Active");
    const now = new Date().toISOString();
    await saveContainer(container, {
      status: "Arrived Destination",
      arrived_at: now,
      arrived_by: by,
    });
    await logEvent(
      container.id,
      "Status: Arrived Destination",
      `${whName(whRows, container.dest_wh_code)} · Actual arrival ${formatIso(now)}`,
    );
  }

  function assertCanEditTks(container) {
    if (!hasPermission(user, "container.manage"))
      throw new Error("អ្នកគ្មានសិទ្ធិកែ TK ក្នុង Container ទេ");
    if (!CONTAINER_TK_EDITABLE.includes(container.status))
      throw new Error(
        `Container ស្ថិតក្នុង ${container.status} — មិនអាចបន្ថែម/Remove TK បានទេ`,
      );
  }

  // Adds every TK that passes all checks; returns { added, failed, warn }.
  async function addTks(container, tkList) {
    assertCanEditTks(container);
    const added = [];
    const failed = [];
    const seen = new Set();
    let ready = [];
    for (const raw of tkList) {
      const k = tkKey(raw);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const r = checkTkForContainer({
        raw,
        container,
        packages,
        activeItems,
        containers,
      });
      if (r.ok) ready.push(r.pkg);
      else failed.push({ tk: raw, error: r.error });
    }
    if (!ready.length) return { added, failed, warn: 0 };

    const now = new Date().toISOString();
    const mkRow = (p) => ({
      container_id: container.id,
      tk: p.tk,
      status: "Active",
      added_by: by,
    });
    if (supabase) {
      const batch = await supabase
        .from("container_items")
        .insert(ready.map(mkRow))
        .select("*");
      if (!batch.error) {
        setItems((prev) => [...prev, ...batch.data]);
      } else {
        // Batch refused (e.g. another user grabbed one TK a second ago):
        // retry one by one so the good ones still go in.
        const okOnes = [];
        const saved = [];
        for (const p of ready) {
          const one = await supabase
            .from("container_items")
            .insert(mkRow(p))
            .select("*")
            .single();
          if (one.error)
            failed.push({
              tk: p.tk,
              error:
                one.error.code === "23505"
                  ? `TK ${p.tk} ត្រូវបានដាក់ក្នុង Container ផ្សេងរួចហើយ`
                  : one.error.message,
            });
          else {
            okOnes.push(p);
            saved.push(one.data);
          }
        }
        ready = okOnes;
        setItems((prev) => [...prev, ...saved]);
      }
    } else {
      setItems((prev) => [
        ...prev,
        ...ready.map((p) => ({
          id: makeId(),
          ...mkRow(p),
          added_at: now,
          removed_at: null,
        })),
      ]);
    }

    // Keep the shared TK record in step (Packages / TK, Outbound Origin and
    // search all read packages.container_no).
    let warn = 0;
    for (let i = 0; i < ready.length; i += 8) {
      await Promise.all(
        ready.slice(i, i + 8).map((p) =>
          upsertPackage({
            tk: p.tk,
            container_no: container.container_number,
            updated_by: by,
            updated_at: now,
          }).catch(() => {
            warn += 1;
          }),
        ),
      );
    }
    ready.forEach((p) => {
      logStatus(
        p.tk,
        p.status || "Inbound Origin",
        by,
        `Added to Container ${container.container_number}`,
      );
      added.push(p.tk);
    });
    await logEvents(
      ready.map((p) => ({
        container_id: container.id,
        action: "TK Added",
        detail: `TK ${p.tk} · Order ${p.order_no || "—"}`,
        tk: p.tk,
      })),
    );
    return { added, failed, warn };
  }

  async function removeTk(container, tk, reason) {
    assertCanEditTks(container);
    if (!String(reason || "").trim()) throw new Error("សូមបញ្ចូលមូលហេតុ");
    const key = tkKey(tk);
    const now = new Date().toISOString();
    if (supabase) {
      const { error } = await supabase
        .from("container_items")
        .update({
          removed_at: now,
          removed_by: by,
          remove_reason: String(reason).trim(),
          status: "Removed",
        })
        .eq("container_id", container.id)
        .eq("tk", tk)
        .is("removed_at", null);
      if (error) throw new Error(error.message);
    }
    setItems((prev) =>
      prev.map((i) =>
        i.container_id === container.id && tkKey(i.tk) === key && !i.removed_at
          ? {
              ...i,
              removed_at: now,
              removed_by: by,
              remove_reason: String(reason).trim(),
              status: "Removed",
            }
          : i,
      ),
    );
    const pkg = packages.find((p) => tkKey(p.tk) === key);
    await upsertPackage({
      tk: pkg?.tk || tk,
      container_no: null,
      updated_by: by,
      updated_at: now,
    });
    logStatus(
      pkg?.tk || tk,
      pkg?.status || "Inbound Origin",
      by,
      `Removed from Container ${container.container_number}: ${String(reason).trim()}`,
    );
    await logEvent(
      container.id,
      "TK Removed",
      `TK ${pkg?.tk || tk} — ${String(reason).trim()}`,
      pkg?.tk || tk,
    );
  }

  // ------------------------------------------------------------------
  // PHASE 6 — Exception / Photo / TK Transfer
  // ------------------------------------------------------------------
  function assertP6() {
    if (
      !hasPermission(user, "container.manage") &&
      !hasPermission(user, "container.receive")
    )
      throw new Error("You do not have permission to perform this action.");
    if (supabase && !p6Ready) throw new Error(CONTAINER_P6_HINT);
  }

  // Extra photos on a container (door, seal, loading, unloading...).
  async function addPhotos(container, photos, extra = {}) {
    assertP6();
    if (container.status === "Cancelled")
      throw new Error("Container ត្រូវបាន Cancel — មិនអាចបន្ថែមរូបភាពបានទេ");
    if (!photos.length)
      throw new Error("សូមថត ឬ Upload រូបភាពយ៉ាងតិច ១ សន្លឹក");
    const warning = await saveContainerPhotos(container, photos, {
      ...extra,
      by,
    });
    setPhotoVersion((v) => v + 1);
    await logEvent(
      container.id,
      "Photo Added",
      `${photos.length} រូប${extra.tk ? ` · TK ${extra.tk}` : ""}`,
      extra.tk,
    );
    return { warning };
  }

  // Report an exception on a container (optionally about one TK).
  async function reportException(container, { type, tk, detail, photos }) {
    assertP6();
    if (["Empty", "Cancelled"].includes(container.status))
      throw new Error(
        `Container ស្ថិតក្នុង ${container.status} — មិនអាចរាយការណ៍ Exception បានទេ`,
      );
    if (!CONTAINER_EXCEPTION_TYPES.includes(type))
      throw new Error("សូមជ្រើសរើសException Type");
    const note = String(detail || "").trim();
    if (!note) throw new Error("សូមបញ្ចូលDetailsនៃ Exception");
    const pics = photos || [];
    if (CONTAINER_EXCEPTION_PHOTO_REQUIRED.includes(type) && !pics.length)
      throw new Error(`${type} ត្រូវការរូបភាពជាភស្តុតាងយ៉ាងតិច ១ សន្លឹក`);

    let pkg = null;
    const rawTk = String(tk || "").trim();
    if (rawTk) {
      pkg = packages.find((p) => tkKey(p.tk) === tkKey(rawTk)) || null;
      if (!pkg) throw new Error(`TK not found "${rawTk}" ក្នុងប្រព័ន្ធ`);
      const inside = tkRowsFor(container, activeItems, packages).some(
        (p) => tkKey(p.tk) === tkKey(pkg.tk),
      );
      if (!inside && type !== "Wrong Container / Unexpected TK")
        throw new Error(`TK ${pkg.tk} មិនស្ថិតក្នុង Container នេះទេ`);
    }

    const row = {
      container_id: container.id,
      tk: pkg ? pkg.tk : null,
      type,
      detail: note,
      status: "Open",
      reported_by: by,
    };
    let saved;
    if (supabase) {
      const { data, error } = await supabase
        .from("container_exceptions")
        .insert(row)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      saved = data;
    } else {
      saved = { id: makeId(), ...row, created_at: new Date().toISOString() };
    }
    setExceptions((p) => [saved, ...p]);

    let warning = "";
    if (pics.length)
      warning = await saveContainerPhotos(container, pics, {
        exception_id: saved.id,
        tk: saved.tk,
        by,
      });
    if (pics.length) setPhotoVersion((v) => v + 1);

    if (pkg) {
      // Shows up in the Exception Center (packages.exception).
      try {
        await upsertPackage({
          tk: pkg.tk,
          exception: {
            type: `Container ${type}`,
            detail: `${container.container_number} — ${note}`,
          },
          updated_by: by,
          updated_at: new Date().toISOString(),
        });
      } catch {
        warning = warning || "TK មិនទាន់បង្ហាញក្នុង Exception Center";
      }
      logStatus(
        pkg.tk,
        pkg.status || "Inbound Origin",
        by,
        `Container ${container.container_number} exception (${type}): ${note}`,
      );
    }
    await logEvent(
      container.id,
      `Exception: ${type}`,
      `${pkg ? `TK ${pkg.tk} — ` : ""}${note}`,
      pkg ? pkg.tk : undefined,
    );
    return { exception: saved, warning };
  }

  async function resolveException(container, exc, resolution) {
    assertP6();
    if (exc.status !== "Open")
      throw new Error("Exception នេះបានដោះស្រាយរួចហើយ");
    const text = String(resolution || "").trim();
    if (!text) throw new Error("សូមបញ្ចូលវិធីដោះស្រាយ");
    const patch = {
      status: "Resolved",
      resolution: text,
      resolved_by: by,
      resolved_at: new Date().toISOString(),
    };
    let out = { ...exc, ...patch };
    if (supabase) {
      const { data, error } = await supabase
        .from("container_exceptions")
        .update(patch)
        .eq("id", exc.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      out = data;
    }
    setExceptions((p) => p.map((e) => (e.id === exc.id ? out : e)));

    if (exc.tk) {
      const stillOpen = exceptions.some(
        (e) =>
          e.id !== exc.id &&
          e.status === "Open" &&
          tkKey(e.tk) === tkKey(exc.tk),
      );
      const pkg = packages.find((p) => tkKey(p.tk) === tkKey(exc.tk));
      if (
        !stillOpen &&
        pkg &&
        String(pkg.exception?.type || "").startsWith("Container ")
      ) {
        try {
          await upsertPackage({
            tk: pkg.tk,
            exception: null,
            updated_by: by,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // TK keeps its exception flag; staff can clear it from TK detail.
        }
      }
    }
    await logEvent(
      container.id,
      "Exception Resolved",
      `${exc.type}${exc.tk ? ` · TK ${exc.tk}` : ""} — ${text}`,
      exc.tk || undefined,
    );
  }

  // Move one TK from container `from` into container `to`. Everything is
  // rolled back if the second half fails, so a TK never shows in two places.
  async function transferTk(from, to, tk, reason, photos) {
    assertP6();
    const why = String(reason || "").trim();
    if (!why) throw new Error("សូមបញ្ចូលមូលហេតុ");
    if (!from || !to) throw new Error("សូមជ្រើសរើស Container");
    if (from.id === to.id)
      throw new Error("Container ដើម និងគោលដៅមិនអាចដូចគ្នាទេ");
    const cnMove =
      CONTAINER_TRANSFER_CN.includes(from.status) &&
      CONTAINER_TRANSFER_CN.includes(to.status);
    const khMove =
      CONTAINER_TRANSFER_KH_FROM.includes(from.status) &&
      CONTAINER_TRANSFER_KH_TO.includes(to.status);
    if (!cnMove && !khMove)
      throw new Error(`មិនអាចផ្ទេរ TK ពី ${from.status} ទៅ ${to.status} បានទេ`);
    if (cnMove && !hasPermission(user, "container.manage"))
      throw new Error("មានតែ China Warehouse ឬ Admin ទេដែលផ្ទេរបាន");
    if (khMove && !hasPermission(user, "container.receive"))
      throw new Error("មានតែ Cambodia Warehouse ឬ Admin ទេដែលផ្ទេរបាន");
    if (from.dest_wh_code !== to.dest_wh_code)
      throw new Error("Container ទាំងពីរត្រូវមាន Destination ដូចគ្នា");

    const pkg = packages.find((p) => tkKey(p.tk) === tkKey(tk));
    if (!pkg) throw new Error(`TK not found "${tk}"`);
    const inFrom = tkRowsFor(from, activeItems, packages).some(
      (p) => tkKey(p.tk) === tkKey(pkg.tk),
    );
    if (!inFrom)
      throw new Error(
        `TK ${pkg.tk} មិនស្ថិតក្នុង Container ${from.container_number}`,
      );
    if (tkUnloaded(pkg))
      throw new Error(`TK ${pkg.tk} បាន Unloaded រួចហើយ — មិនអាចផ្ទេរបានទេ`);

    const now = new Date().toISOString();
    const key = tkKey(pkg.tk);
    const srcItem = activeItems.find(
      (i) => i.container_id === from.id && tkKey(i.tk) === key,
    );

    // 1) shared TK record → new container number
    await upsertPackage({
      tk: pkg.tk,
      container_no: to.container_number,
      updated_by: by,
      updated_at: now,
    });

    // 2) container_items: release from source, add to target
    try {
      if (srcItem) {
        const patch = {
          removed_at: now,
          removed_by: by,
          remove_reason: `Transferred to ${to.container_number}: ${why}`,
          status: "Removed",
        };
        if (supabase) {
          const { error } = await supabase
            .from("container_items")
            .update(patch)
            .eq("id", srcItem.id);
          if (error) throw new Error(error.message);
        }
        setItems((prev) =>
          prev.map((i) => (i.id === srcItem.id ? { ...i, ...patch } : i)),
        );
      }
      const row = {
        container_id: to.id,
        tk: pkg.tk,
        status: "Active",
        added_by: by,
      };
      let added;
      if (supabase) {
        const { data, error } = await supabase
          .from("container_items")
          .insert(row)
          .select("*")
          .single();
        if (error) {
          if (srcItem) {
            await supabase
              .from("container_items")
              .update({
                removed_at: null,
                removed_by: null,
                remove_reason: null,
                status: "Active",
              })
              .eq("id", srcItem.id);
            setItems((prev) =>
              prev.map((i) => (i.id === srcItem.id ? srcItem : i)),
            );
          }
          throw new Error(
            error.code === "23505"
              ? `TK ${pkg.tk} ត្រូវបានដាក់ក្នុង Container ផ្សេងរួចហើយ`
              : error.message,
          );
        }
        added = data;
      } else {
        added = { id: makeId(), ...row, added_at: now, removed_at: null };
      }
      setItems((prev) => [...prev, added]);
    } catch (e) {
      try {
        await upsertPackage({
          tk: pkg.tk,
          container_no: from.container_number,
          updated_by: by,
          updated_at: now,
        });
      } catch {
        // best effort — the error below tells staff to re-check the TK
      }
      throw e;
    }

    // 3) audit trail (the move itself already succeeded)
    let warning = "";
    const rec = {
      tk: pkg.tk,
      from_container_id: from.id,
      to_container_id: to.id,
      from_number: from.container_number,
      to_number: to.container_number,
      reason: why,
      transferred_by: by,
    };
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from("container_transfers")
          .insert(rec)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        setTransfers((p) => [data, ...p]);
      } else {
        setTransfers((p) => [{ id: makeId(), ...rec, created_at: now }, ...p]);
      }
    } catch (e) {
      warning = `TK ត្រូវបានផ្ទេរ ប៉ុន្តែមិនអាចSave Transfer History: ${e.message}`;
    }
    logStatus(
      pkg.tk,
      pkg.status || "Inbound Origin",
      by,
      `Transferred from Container ${from.container_number} to ${to.container_number}: ${why}`,
    );
    await logEvents([
      {
        container_id: from.id,
        action: "TK Transferred Out",
        detail: `TK ${pkg.tk} → ${to.container_number} — ${why}`,
        tk: pkg.tk,
      },
      {
        container_id: to.id,
        action: "TK Transferred In",
        detail: `TK ${pkg.tk} ← ${from.container_number} — ${why}`,
        tk: pkg.tk,
      },
    ]);
    if ((photos || []).length) {
      const w = await saveContainerPhotos(to, photos, { tk: pkg.tk, by });
      setPhotoVersion((v) => v + 1);
      warning = warning || w;
    }
    return { pkg, warning };
  }

  // Containers outside the user's department / warehouse scope are hidden.
  const scopeRoles = useRoles();
  const scopeCodes = scopeWarehouseCodes(user, whRows);
  const scopedContainers = React.useMemo(
    () =>
      scopeCodes === null
        ? containers
        : containers.filter((c) => rowInScope(c, scopeCodes)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      containers,
      scopeRoles,
      user?.role,
      user?.department,
      user?.warehouse,
      whRows,
    ],
  );

  return {
    exceptions,
    transfers,
    p6Ready,
    photoVersion,
    addPhotos,
    reportException,
    resolveException,
    transferTk,
    sealContainer,
    breakSeal,
    departChina,
    confirmArrival,
    addTks,
    removeTk,
    containers: scopedContainers,
    activeItems,
    history,
    whRows,
    loading,
    ready,
    tableReady,
    by,
    refetch,
    createContainer,
    updateContainer,
    forceUpdateContainer,
    deleteContainer,
    changeStatus,
  };
}

// ------------------------------------------------------------
// components: ConfirmModal, ContainerFormModal
// ------------------------------------------------------------
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  askReason,
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) {
      setBusy(false);
      setErr("");
      setReason("");
    }
  }, [open]);
  if (!open) return null;

  async function go() {
    setBusy(true);
    setErr("");
    try {
      await onConfirm(reason);
      onClose();
    } catch (e) {
      setErr(e.message || "មិនអាចធ្វើបានទេ");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-md"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            {title}
          </h3>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-ink-700">{message}</p>
          {askReason && (
            <div>
              <label className={LABEL_CLS}>មូលហេតុ *</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          )}
          {err && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {err}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button type="button" onClick={onClose} className={CT_BTN_GHOST}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={go}
            className={danger ? CT_BTN_DANGER : CT_BTN_PRIMARY}
          >
            {busy ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function blankContainer() {
  return {
    container_number: "",
    container_type: "40HQ",
    shipment_no: "",
    origin_wh_code: "",
    dest_wh_code: "",
    shipping_method: "Sea",
    carrier: "",
    departure_date: "",
    eta: "",
    remark: "",
  };
}

function ContainerFormModal({ open, existing, whRows, onClose, onSave }) {
  const [v, setV] = useState(blankContainer());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setV(existing ? { ...blankContainer(), ...existing } : blankContainer());
      setError("");
    }
  }, [open, existing]);
  if (!open) return null;

  const china = whRows.filter(
    (w) => w.type === "china" && w.status === "Active",
  );
  const khs = whRows.filter(
    (w) => w.type === "cambodia" && w.status === "Active",
  );
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(v, existing);
      onClose();
    } catch (err) {
      setError(err.message || "មិនអាចSaveបានទេ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-md shadow-lg w-full max-w-2xl max-h-[88vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            {existing ? "កែ Container" : "បង្កើត Container"}
          </h3>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-3.5">
          {error && (
            <div className="sm:col-span-2 flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className={LABEL_CLS}>Container Number *</label>
            <input
              value={v.container_number}
              disabled={!!existing}
              placeholder="MSCU1234567"
              onChange={set("container_number")}
              className={`${INPUT_CLS} uppercase disabled:bg-mist-50 disabled:text-ink-600/60`}
            />
            {existing && (
              <p className="text-[11px] text-ink-600/50 mt-1">
                Number មិនអាចប្តូរបានទេ ព្រោះ TK ប្រើវាជាឯកសារយោង
              </p>
            )}
          </div>
          <div>
            <label className={LABEL_CLS}>Container Type *</label>
            <select
              value={v.container_type}
              onChange={set("container_type")}
              className={INPUT_CLS}
            >
              {CONTAINER_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Origin China Warehouse *</label>
            <select
              value={v.origin_wh_code}
              onChange={set("origin_wh_code")}
              className={INPUT_CLS}
            >
              <option value="">— ជ្រើសរើស —</option>
              {china.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} · {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Destination Cambodia Branch *</label>
            <select
              value={v.dest_wh_code}
              onChange={set("dest_wh_code")}
              className={INPUT_CLS}
            >
              <option value="">— ជ្រើសរើស —</option>
              {khs.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.code} · {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Shipping Method</label>
            <select
              value={v.shipping_method}
              onChange={set("shipping_method")}
              className={INPUT_CLS}
            >
              {SHIPPING_METHODS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Carrier / Shipping Line</label>
            <input
              value={v.carrier}
              onChange={set("carrier")}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>Shipment ID</label>
            <input
              value={v.shipment_no}
              onChange={set("shipment_no")}
              className={INPUT_CLS}
            />
          </div>
          <div />
          <div>
            <label className={LABEL_CLS}>Departure Date</label>
            <input
              type="date"
              value={v.departure_date || ""}
              onChange={set("departure_date")}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className={LABEL_CLS}>ETA</label>
            <input
              type="date"
              value={v.eta || ""}
              onChange={set("eta")}
              className={INPUT_CLS}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLS}>Remark</label>
            <textarea
              rows={2}
              value={v.remark || ""}
              onChange={set("remark")}
              className={INPUT_CLS}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button type="button" onClick={onClose} className={CT_BTN_GHOST}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={CT_BTN_PRIMARY}>
            {saving ? "កំពុងSave..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// components: AddTkModal — Scan / Search / Bulk add (PHASE 2)
// ------------------------------------------------------------
// A USB / Bluetooth barcode scanner types the TK then presses Enter, so
// the input below works with a scanner as-is. Camera scanning is not part
// of this phase.
function AddTkModal({ open, container, store, packages, onClose, onDone }) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [list, setList] = useState([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setInput("");
      setQ("");
      setList([]);
      setNotice("");
      setError("");
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);
  if (!open) return null;

  const ctx = {
    container,
    packages,
    activeItems: store.activeItems,
    containers: store.containers,
  };

  function addTokens(text) {
    const tokens = String(text)
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!tokens.length) return;
    const keys = new Set(list.map((x) => tkKey(x.tk)));
    const fresh = [];
    let dupes = 0;
    tokens.forEach((t) => {
      const k = tkKey(t);
      if (keys.has(k)) {
        dupes += 1;
        return;
      }
      keys.add(k);
      const r = checkTkForContainer({ raw: t, ...ctx });
      fresh.push({ ...r, tk: r.pkg?.tk || t });
    });
    setList((prev) => [...prev, ...fresh]);
    setNotice(dupes ? `រំលង ${dupes} TK ដែលស្កេនស្ទួនក្នុងបញ្ជីនេះ` : "");
  }

  const results = q.trim()
    ? packages
        .filter((p) => {
          if (list.some((x) => tkKey(x.tk) === tkKey(p.tk))) return false;
          const cu = tkCustomerParts(p);
          const hay = [p.tk, p.order_no, cu.id, cu.name]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q.trim().toLowerCase())) return false;
          return checkTkForContainer({ raw: p.tk, ...ctx }).ok;
        })
        .slice(0, 8)
    : [];

  const valid = list.filter((x) => x.ok);
  const assigned = list.filter((x) => !x.ok && x.kind === "assigned").length;
  const invalid = list.filter((x) => !x.ok && x.kind !== "assigned").length;

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const res = await store.addTks(
        container,
        valid.map((x) => x.tk),
      );
      if (res.added.length) onDone(res);
      if (res.failed.length) {
        setList((prev) =>
          prev
            .filter((x) => res.failed.some((f) => tkKey(f.tk) === tkKey(x.tk)))
            .map((x) => ({
              ...x,
              ok: false,
              kind: "invalid",
              error: res.failed.find((f) => tkKey(f.tk) === tkKey(x.tk)).error,
            })),
        );
        setError(
          `បន្ថែមបាន ${res.added.length} · បរាជ័យ ${res.failed.length} (មើលខាងក្រោម)`,
        );
        setBusy(false);
      } else {
        onClose();
      }
    } catch (e) {
      setError(e.message || "មិនអាចបន្ថែមបានទេ");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            Scan / Add TK → {container.container_number}
          </h3>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className={LABEL_CLS}>
              Scan TK (ឬCloseភ្ជាប់ TK ច្រើន បំបែកដោយ ដកឃ្លា/ជួរ/សញ្ញាក្បៀស)
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTokens(input);
                    setInput("");
                  }
                }}
                onPaste={(e) => {
                  const t = e.clipboardData.getData("text");
                  if (/[\s,;]/.test(t.trim())) {
                    e.preventDefault();
                    addTokens(t);
                  }
                }}
                placeholder="Scan ឬវាយ TK រួចចុច Enter"
                className={INPUT_CLS}
              />
              <button
                type="button"
                className={CT_BTN_GHOST}
                onClick={() => {
                  addTokens(input);
                  setInput("");
                  inputRef.current?.focus();
                }}
              >
                Add
              </button>
            </div>
            {notice && (
              <p className="text-[11px] text-[#B87415] mt-1">{notice}</p>
            )}
          </div>

          <div>
            <label className={LABEL_CLS}>ឬSearch TK / Order / Customer</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search TK ដែលអាចដាក់បាន..."
              className={INPUT_CLS}
            />
            {results.length > 0 && (
              <div className="mt-2 border border-mist-200 rounded-md divide-y divide-mist-100">
                {results.map((p) => {
                  const cu = tkCustomerParts(p);
                  return (
                    <div
                      key={p.tk}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-ink-900">{p.tk}</span>
                        <span className="text-ink-600/60">
                          {" "}
                          · {p.order_no} · {cu.id} · {cu.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={CT_BTN_GHOST}
                        onClick={() => addTokens(p.tk)}
                      >
                        <Plus size={13} />
                        Add
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {q.trim() && results.length === 0 && (
              <p className="text-[11px] text-ink-600/50 mt-1">
                មិនមាន TK ដែលអាចដាក់បានត្រូវនឹងការSearchនេះទេ
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              ["Selected", list.length, "text-ink-900"],
              ["Valid", valid.length, "text-signal-teal"],
              ["Invalid", invalid, "text-signal-red"],
              ["Already Assigned", assigned, "text-[#B87415]"],
            ].map(([label, n, cls]) => (
              <div
                key={label}
                className="border border-mist-200 rounded-md py-2"
              >
                <div className={`font-display font-extrabold text-lg ${cls}`}>
                  {n}
                </div>
                <div className="text-[11px] text-ink-600/55">{label}</div>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="border border-mist-200 rounded-md divide-y divide-mist-100">
            {list.map((x) => {
              const cu = x.pkg ? tkCustomerParts(x.pkg) : null;
              return (
                <div
                  key={x.tk}
                  className="flex items-start justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm">
                      <span className="font-medium text-ink-900">{x.tk}</span>
                      {x.pkg && (
                        <span className="text-ink-600/65">
                          {" "}
                          · Order {x.pkg.order_no || "—"} · {cu.id} · {cu.name}
                        </span>
                      )}
                    </div>
                    {x.pkg && (
                      <div className="text-xs text-ink-600/55">
                        {x.pkg.cargo_type || "—"}
                        {x.pkg.size_class
                          ? ` · ${sizeLabel(x.pkg.size_class)}`
                          : ""}
                        {x.pkg.cbm
                          ? ` · ${Number(x.pkg.cbm).toFixed(3)} m³`
                          : ""}
                        {x.pkg.freight_fee
                          ? ` · ${money(x.pkg.freight_fee)}`
                          : ""}
                        {" · "}
                        {x.pkg.status || "—"}
                      </div>
                    )}
                    {!x.ok && (
                      <div className="text-xs text-signal-red">{x.error}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge
                      label={
                        x.ok
                          ? "Ready"
                          : x.kind === "assigned"
                            ? "Assigned"
                            : "Rejected"
                      }
                    />
                    <button
                      type="button"
                      aria-label="Remove from list"
                      className="text-ink-600/40 hover:text-ink-900"
                      onClick={() =>
                        setList((prev) => prev.filter((y) => y.tk !== x.tk))
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {list.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-ink-600/40">
                Scan ឬSearch TK ដើម្បីចាប់ផ្ដើម
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button type="button" onClick={onClose} className={CT_BTN_GHOST}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || valid.length === 0}
            onClick={confirm}
            className={CT_BTN_PRIMARY}
          >
            {busy ? "Adding..." : `Confirm Add (${valid.length} TK)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function SealModal({ open, container, tkCount, by, onSeal, onClose }) {
  const [seal, setSeal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) {
      setSeal("");
      setBusy(false);
      setErr("");
    }
  }, [open]);
  if (!open) return null;
  async function go(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await onSeal(seal);
      onClose();
    } catch (x) {
      setErr(x.message || "មិនអាច Seal បានទេ");
      setBusy(false);
    }
  }
  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={go}
        className="bg-white rounded-md shadow-lg w-full max-w-md"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            Seal Container {container.container_number}
          </h3>
        </div>
        <div className="p-5 space-y-3.5">
          <p className="text-sm text-ink-700">
            Nextពី Seal បញ្ជី TK ({tkCount} TK) នឹងត្រូវបានចាក់សោ។
          </p>
          <div>
            <label className={LABEL_CLS}>Seal Number *</label>
            <input
              autoFocus
              value={seal}
              onChange={(e) => setSeal(e.target.value)}
              placeholder="SL998812"
              className={`${INPUT_CLS} uppercase`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Sealed By</label>
              <input
                value={by}
                disabled
                className={`${INPUT_CLS} bg-mist-50`}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Sealed Date/Time</label>
              <input
                value={formatIso(new Date().toISOString())}
                disabled
                className={`${INPUT_CLS} bg-mist-50`}
              />
            </div>
          </div>
          {err && (
            <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
              <TriangleAlert size={14} className="shrink-0" />
              {err}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button type="button" onClick={onClose} className={CT_BTN_GHOST}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className={CT_BTN_PRIMARY}>
            {busy ? "Sealing..." : "Seal Container"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------
// components: ArrivalProgressCard — read-only (no scanning here)
// ------------------------------------------------------------
// A container reaching Arrived Destination only says the truck is at the
// warehouse. Each TK becomes Arrived when the Cambodia warehouse checks the
// goods while unloading and scans them in W.H Arrived › Scan Arrive V2.
function ArrivalProgressCard({ tks }) {
  const arrived = tks.filter(tkUnloaded).length;
  const pct = tks.length ? Math.round((arrived / tks.length) * 100) : 0;
  return (
    <div className={`${CT_CARD} p-4 space-y-2`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display font-bold text-sm text-ink-900">
          TK Arrived (Scan Arrive V2)
        </h2>
        <span className="text-sm text-ink-900 font-medium">
          {arrived} / {tks.length} TK
        </span>
      </div>
      <div className="h-2 rounded-full bg-mist-100 overflow-hidden">
        <div className="h-full bg-signal-blue" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-ink-600/60">
        A container arriving at the warehouse does not mean all TKs have
        arrived. TK ប្តូរជា Arrived តែពេលឃ្លាំងឆែកទំនិញពេលទម្លាក់ ហើយ Scan នៅ
        W.H Arrived → Scan Arrive V2 ប៉ុណ្ណោះ។
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// components: Exception / Photo / TK Transfer (PHASE 6)
// ------------------------------------------------------------
function ContainerModalShell({ title, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-mist-200 shrink-0">
          <h3 className="font-display font-bold text-base text-ink-900">
            {title}
          </h3>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200 shrink-0">
          {footer}
        </div>
      </div>
    </div>
  );
}

function ContainerErrorLine({ text }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-signal-red bg-signal-red/10 rounded-md px-3 py-2">
      <TriangleAlert size={14} className="shrink-0" />
      {text}
    </div>
  );
}

// ---- Report Exception --------------------------------------------------
function ContainerExceptionModal({
  open,
  container,
  tks,
  store,
  onClose,
  onDone,
}) {
  const [type, setType] = useState(CONTAINER_EXCEPTION_TYPES[0]);
  const [tk, setTk] = useState("");
  const [detail, setDetail] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setType(CONTAINER_EXCEPTION_TYPES[0]);
      setTk("");
      setDetail("");
      setPhotos([]);
      setBusy(false);
      setErr("");
    }
  }, [open]);
  if (!open) return null;

  const photoRequired = CONTAINER_EXCEPTION_PHOTO_REQUIRED.includes(type);

  async function go() {
    setBusy(true);
    setErr("");
    try {
      const res = await store.reportException(container, {
        type,
        tk,
        detail,
        photos,
      });
      onDone(res);
      onClose();
    } catch (e) {
      setErr(e.message || "Unable to report.");
      setBusy(false);
    }
  }

  return (
    <ContainerModalShell
      title={`Report Exception — ${container.container_number}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={CT_BTN_GHOST}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={go}
            className={CT_BTN_DANGER}
          >
            {busy ? "កំពុងSave..." : "Report Exception"}
          </button>
        </>
      }
    >
      <div>
        <label className={LABEL_CLS}>Exception Type *</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={INPUT_CLS}
        >
          {CONTAINER_EXCEPTION_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={LABEL_CLS}>TK (បើទាក់ទងនឹង TK ណាមួយ)</label>
        <input
          list="ct-ex-tks"
          value={tk}
          onChange={(e) => setTk(e.target.value)}
          placeholder="TK Number"
          className={INPUT_CLS}
        />
        <datalist id="ct-ex-tks">
          {tks.map((p) => (
            <option key={p.tk} value={p.tk} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={LABEL_CLS}>Details *</label>
        <textarea
          rows={3}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className={INPUT_CLS}
        />
      </div>
      <div>
        <label className={LABEL_CLS}>
          រូបភាព{photoRequired ? " * (ចាំបាច់)" : " (មិនបង្ខំ)"}
        </label>
        <PhotoUploader
          photos={photos}
          setPhotos={setPhotos}
          categories={CONTAINER_PHOTO_CATEGORIES}
          emptyHint={
            photoRequired
              ? "ត្រូវការរូបភាពយ៉ាងតិច ១ សន្លឹកជាភស្តុតាង"
              : "No images yet"
          }
        />
      </div>
      <ContainerErrorLine text={err} />
    </ContainerModalShell>
  );
}

// ---- Exceptions card ---------------------------------------------------
function ContainerExceptionsCard({ container, store, canP6, onAsk, onReport }) {
  const rows = store.exceptions
    .filter((e) => e.container_id === container.id)
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "Open" ? -1 : 1));
  const open = rows.filter((e) => e.status === "Open").length;
  const canReport = canP6 && !["Empty", "Cancelled"].includes(container.status);

  if (!rows.length && !canReport) return null;

  return (
    <div className={`${CT_CARD} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-display font-bold text-sm text-ink-900">
          Exceptions ({rows.length})
          {open > 0 && (
            <span className="ml-2 text-xs font-medium text-signal-red">
              {open} Unresolved
            </span>
          )}
        </h2>
        {canReport && (
          <button type="button" onClick={onReport} className={CT_BTN_DANGER}>
            <TriangleAlert size={14} />
            Report Exception
          </button>
        )}
      </div>
      {supabase && !store.p6Ready && (
        <div className="flex items-center gap-2 text-sm text-[#B87415] bg-signal-amber/15 rounded-md px-3 py-2">
          <TriangleAlert size={14} className="shrink-0" />
          {CONTAINER_P6_HINT}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-ink-600/40">No exceptions yet.</p>
      ) : (
        <div className="divide-y divide-mist-100">
          {rows.map((e) => (
            <div key={e.id} className="py-3 first:pt-0 space-y-1.5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge label={e.status} />
                  <span className="text-sm font-medium text-ink-900">
                    {e.type}
                  </span>
                  {e.tk && (
                    <Link
                      to={`/packages/${e.tk}`}
                      className="text-sm text-signal-blue"
                    >
                      {e.tk}
                    </Link>
                  )}
                </div>
                {canP6 && e.status === "Open" && (
                  <button
                    type="button"
                    className="text-signal-teal text-xs font-medium hover:underline"
                    onClick={() =>
                      onAsk({
                        title: "Resolve Exception",
                        message: `${e.type}${e.tk ? ` · TK ${e.tk}` : ""} — Confirmថាបានដោះស្រាយ? សូមបញ្ចូលវិធីដោះស្រាយខាងក្រោម។`,
                        confirmLabel: "Resolve",
                        askReason: true,
                        onConfirm: (text) =>
                          store.resolveException(container, e, text),
                      })
                    }
                  >
                    Resolve
                  </button>
                )}
              </div>
              <p className="text-sm text-ink-700">{e.detail}</p>
              <p className="text-xs text-ink-600/50">
                {formatIso(e.created_at)} · {e.reported_by || "—"}
              </p>
              {e.status === "Resolved" && (
                <p className="text-xs text-signal-teal">
                  ✓ {e.resolution} — {e.resolved_by || "—"} ·{" "}
                  {formatIso(e.resolved_at)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Photos card -------------------------------------------------------
function ContainerPhotosCard({ container, store, canP6, onFlash }) {
  const [photos, setPhotos] = useState(null);
  const [pending, setPending] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [active, setActive] = useState(null);
  const canAdd = canP6 && container.status !== "Cancelled";

  useEffect(() => {
    let alive = true;
    setPhotos(null);
    loadContainerPhotos(container.id)
      .then((p) => alive && setPhotos(p))
      .catch(() => alive && setPhotos([]));
    return () => {
      alive = false;
    };
  }, [container.id, store.photoVersion]);

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const res = await store.addPhotos(container, pending);
      setPending([]);
      onFlash(res.warning ? `Saveរូបភាព — ${res.warning}` : "Images saved");
    } catch (e) {
      setErr(e.message || "Unable to save images.");
    } finally {
      setBusy(false);
    }
  }

  const exType = (id) => store.exceptions.find((e) => e.id === id)?.type;

  return (
    <div className={`${CT_CARD} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-sm text-ink-900">
          Container Photos
        </h2>
        {photos && (
          <span className="text-xs text-ink-600/50">{photos.length} រូប</span>
        )}
      </div>

      {photos === null ? (
        <SkeletonPhotoGrid count={4} className="sm:grid-cols-4" />
      ) : photos.length === 0 ? (
        <p className="text-sm text-ink-600/40">No images yetទេ</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {photos.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onClick={() => setActive(i)}
              className="text-left border border-mist-200 rounded-md overflow-hidden bg-white"
            >
              <img
                src={p.dataUrl}
                alt={p.category}
                loading="lazy"
                className="w-full aspect-square object-cover"
              />
              <div className="px-2 py-1.5 text-[11px] text-ink-700 space-y-0.5">
                <div className="font-medium">{p.category}</div>
                {p.exception_id && (
                  <div className="text-signal-red">
                    Exception
                    {exType(p.exception_id)
                      ? `: ${exType(p.exception_id)}`
                      : ""}
                  </div>
                )}
                {p.tk && <div className="text-ink-600/60">{p.tk}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="border-t border-mist-100 pt-4 space-y-3">
          <PhotoUploader
            photos={pending}
            setPhotos={setPending}
            categories={CONTAINER_PHOTO_CATEGORIES}
            emptyHint="Capture or upload container photos (ទ្វារ, Seal, ការផ្ទុក, ការបញ្ចេញ...)"
          />
          <ContainerErrorLine text={err} />
          {pending.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className={CT_BTN_PRIMARY}
            >
              <Save size={14} />
              {busy ? "Uploading..." : `Saveរូបភាព (${pending.length})`}
            </button>
          )}
        </div>
      )}

      {active != null && photos && photos[active] && (
        <div
          className="fixed inset-0 z-50 bg-ink-900/80 flex flex-col items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <img
            src={photos[active].dataUrl}
            alt={photos[active].category}
            className="max-h-[80vh] max-w-full object-contain rounded-md"
          />
          <p className="mt-3 text-sm text-white/85">
            {photos[active].category} — {active + 1} / {photos.length}
            {photos[active].by ? ` · ${photos[active].by}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ---- Transfer TK -------------------------------------------------------
function TransferTkModal({
  open,
  mode,
  presetTk,
  container,
  store,
  packages,
  onClose,
  onDone,
}) {
  const [tkInput, setTkInput] = useState("");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setTkInput(presetTk || "");
      setTargetId("");
      setReason("");
      setPhotos([]);
      setBusy(false);
      setErr("");
    }
  }, [open, presetTk]);
  if (!open) return null;

  const out = mode === "out";
  const tkValue = out ? presetTk : tkInput.trim();
  const pkg = tkValue
    ? packages.find((p) => tkKey(p.tk) === tkKey(tkValue))
    : null;

  // "in" mode: which container currently holds this TK?
  let src = null;
  if (!out && pkg) {
    const item = store.activeItems.find((i) => tkKey(i.tk) === tkKey(pkg.tk));
    const no = String(pkg.container_no || "")
      .trim()
      .toUpperCase();
    src =
      store.containers.find(
        (c) =>
          c.status !== "Cancelled" &&
          (item
            ? c.id === item.container_id
            : String(c.container_number).toUpperCase() === no),
      ) || null;
  }

  const targets = out
    ? store.containers.filter((c) => transferPairOk(container, c))
    : [];
  const from = out ? container : src;
  const to = out ? targets.find((c) => c.id === targetId) : container;

  let hint = "";
  let hintBad = false;
  if (!out && tkValue) {
    if (!pkg) {
      hint = `TK not found "${tkValue}" ក្នុងប្រព័ន្ធ`;
      hintBad = true;
    } else if (!src) {
      hint = `TK ${pkg.tk} មិនស្ថិតក្នុង Container ណាមួយទេ`;
      hintBad = true;
    } else if (src.id === container.id) {
      hint = `TK ${pkg.tk} ស្ថិតក្នុង Container នេះរួចហើយ`;
      hintBad = true;
    } else if (!transferPairOk(src, container)) {
      hint = `មិនអាចផ្ទេរពី ${src.container_number} (${src.status}) មក Container នេះបានទេ — Destination ខុស ឬដំណាក់កាលមិនត្រូវគ្នា`;
      hintBad = true;
    } else {
      hint = `TK ${pkg.tk} កំពុងស្ថិតក្នុង ${src.container_number} (${src.status})`;
    }
  }

  async function go() {
    setBusy(true);
    setErr("");
    try {
      if (!pkg) throw new Error("សូមបញ្ចូល TK ឲ្យត្រឹមត្រូវ");
      if (!from) throw new Error("រកមិនឃើញ Container ដើមរបស់ TK នេះទេ");
      if (!to) throw new Error("សូមជ្រើសរើស Destination Container");
      const res = await store.transferTk(from, to, pkg.tk, reason, photos);
      onDone(res, from, to);
      onClose();
    } catch (e) {
      setErr(e.message || "មិនអាចផ្ទេរបានទេ");
      setBusy(false);
    }
  }

  return (
    <ContainerModalShell
      title={out ? `Transfer TK ${presetTk}` : "Move TK ចូល Container នេះ"}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={CT_BTN_GHOST}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || (!out && (!src || hintBad))}
            onClick={go}
            className={CT_BTN_PRIMARY}
          >
            {busy ? "Transferring..." : "Transfer TK"}
          </button>
        </>
      }
    >
      {out ? (
        <>
          <p className="text-sm text-ink-700">
            ផ្ទេរ TK {presetTk} ពី{" "}
            <span className="font-medium">{container.container_number}</span> ទៅ
            Container មួយទៀតដែលមាន Destination ដូចគ្នា។
          </p>
          <div>
            <label className={LABEL_CLS}>Destination Container *</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className={INPUT_CLS}
            >
              <option value="">— ជ្រើសរើស —</option>
              {targets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.container_number} ({c.status})
                </option>
              ))}
            </select>
            {targets.length === 0 && (
              <p className="text-xs text-ink-600/50 mt-1">
                មិនមាន Container ណាដែលអាចទទួលបានទេ (ត្រូវមាន Destination ដូចគ្នា
                និងស្ថិតក្នុងដំណាក់កាលត្រឹមត្រូវ)
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-700">
            ប្រើពេល TK ស្ថិតក្នុង {container.container_number} ពិតប្រាកដ
            ប៉ុន្តែប្រព័ន្ធកត់ត្រាថាស្ថិតក្នុង Container ផ្សេង។
          </p>
          <div>
            <label className={LABEL_CLS}>TK Number *</label>
            <input
              autoFocus
              value={tkInput}
              onChange={(e) => setTkInput(e.target.value)}
              placeholder="Scan ឬវាយ TK"
              className={INPUT_CLS}
            />
            {hint && (
              <p
                className={`text-xs mt-1 ${hintBad ? "text-signal-red" : "text-ink-600/60"}`}
              >
                {hint}
              </p>
            )}
          </div>
        </>
      )}
      <div>
        <label className={LABEL_CLS}>មូលហេតុ *</label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={INPUT_CLS}
        />
      </div>
      <div>
        <label className={LABEL_CLS}>រូបភាព (មិនបង្ខំ)</label>
        <PhotoUploader
          photos={photos}
          setPhotos={setPhotos}
          categories={CONTAINER_PHOTO_CATEGORIES}
          emptyHint="No images yet"
        />
      </div>
      <ContainerErrorLine text={err} />
    </ContainerModalShell>
  );
}

// ---- Transfer history --------------------------------------------------
function ContainerTransfersCard({ container, store }) {
  const rows = store.transfers.filter(
    (t) =>
      t.from_container_id === container.id ||
      t.to_container_id === container.id,
  );
  if (!rows.length) return null;
  return (
    <div className={`${CT_CARD} p-5`}>
      <h2 className="font-display font-bold text-sm text-ink-900 mb-4">
        TK Transfers ({rows.length})
      </h2>
      <div className="divide-y divide-mist-100">
        {rows.map((t) => {
          const isOut = t.from_container_id === container.id;
          return (
            <div key={t.id} className="py-2.5 first:pt-0 text-sm space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge
                  label={isOut ? "Transferred Out" : "Transferred In"}
                />
                <Link
                  to={`/packages/${t.tk}`}
                  className="font-medium text-signal-blue"
                >
                  {t.tk}
                </Link>
                <span className="text-ink-700">
                  {isOut
                    ? `→ ${t.to_number || "—"}`
                    : `← ${t.from_number || "—"}`}
                </span>
              </div>
              <p className="text-ink-700">{t.reason}</p>
              <p className="text-xs text-ink-600/50">
                {formatIso(t.created_at)} · {t.transferred_by || "—"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// lib/containerManifest.js — Export Manifest (PHASE 5)
// ------------------------------------------------------------
// No extra libraries: CSV (UTF-8 with BOM so Excel reads Khmer/Chinese),
// Excel (.xls — an HTML table Excel opens; it may show a format warning),
// and Print / Save as PDF through the browser.
function buildManifest(container, tks, whRows) {
  const wh = (code) => {
    const w = whRows.find((x) => x.code === code);
    return w ? `${w.code} · ${w.name}` : code || "—";
  };
  const sum = summarizeTks(tks);
  const meta = [
    ["Container Number", container.container_number],
    ["Container Type", container.container_type || "—"],
    ["Seal Number", container.seal_number || "—"],
    ["Origin Warehouse", wh(container.origin_wh_code)],
    ["Destination Warehouse", wh(container.dest_wh_code)],
    [
      "Departure Date",
      fmtDate(container.departed_at || container.departure_date),
    ],
    ["ETA", fmtDate(container.eta)],
    [
      "Actual Arrival",
      container.arrived_at ? formatIso(container.arrived_at) : "—",
    ],
    ["Status", container.status],
    [
      "Summary",
      `${sum.tk} TK · ${sum.orders} Orders · ${sum.customers} Customers · ${sum.cbm.toFixed(2)} m³`,
    ],
  ];
  const head = [
    "TK Number",
    "Order ID",
    "Customer ID",
    "Customer Name",
    "Cargo Type",
    "Size",
    "CBM",
    "Receiving Branch",
    "Status",
  ];
  const rows = tks.map((p) => {
    const cu = tkCustomerParts(p);
    return [
      p.tk,
      p.order_no || "—",
      cu.id,
      cu.name,
      p.cargo_type || "—",
      p.size_class ? sizeLabel(p.size_class) : "—",
      p.cbm ? Number(p.cbm).toFixed(3) : "—",
      p.dest_branch_code ? whName(whRows, p.dest_branch_code) : "—",
      p.status || "—",
    ];
  });
  return { meta, head, rows };
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const htmlEsc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function manifestHtml(m, title) {
  const td = (v, tag = "td") => `<${tag}>${htmlEsc(v)}</${tag}>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEsc(title)}</title>
<style>
  body{font-family:'Noto Sans Khmer','Inter',Arial,sans-serif;font-size:12px;color:#111;margin:24px}
  h1{font-size:18px;margin:0 0 12px}
  table{border-collapse:collapse;width:100%;margin-bottom:16px}
  th,td{border:1px solid #bbb;padding:5px 8px;text-align:left;vertical-align:top}
  th{background:#eef1f5}
  .meta td:first-child{width:200px;font-weight:bold;background:#f6f7f9}
</style></head><body>
<h1>Container Manifest — ${htmlEsc(m.meta[0][1])}</h1>
<table class="meta">${m.meta.map(([k, v]) => `<tr>${td(k)}${td(v)}</tr>`).join("")}</table>
<table><tr>${m.head.map((h) => td(h, "th")).join("")}</tr>
${m.rows.map((r) => `<tr>${r.map((c) => td(c)).join("")}</tr>`).join("")}
</table></body></html>`;
}

function exportManifest(kind, container, tks, whRows) {
  const m = buildManifest(container, tks, whRows);
  const base = `Manifest_${container.container_number}`;
  if (kind === "csv") {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ...m.meta.map(([k, v]) => [esc(k), esc(v)].join(",")),
      "",
      m.head.map(esc).join(","),
      ...m.rows.map((r) => r.map(esc).join(",")),
    ];
    downloadBlob(
      `${base}.csv`,
      new Blob(["\uFEFF" + lines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      }),
    );
  } else if (kind === "xls") {
    downloadBlob(
      `${base}.xls`,
      new Blob(["\uFEFF" + manifestHtml(m, base)], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      }),
    );
  } else {
    const w = window.open("", "_blank");
    if (!w)
      throw new Error("Browser បានClose Pop-up — សូមអនុញ្ញាតរួចព្យាយាមម្ដងទៀត");
    w.document.write(manifestHtml(m, base));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }
}

function ManifestMenu({ container, tks, whRows }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const go = (kind) => {
    setErr("");
    try {
      exportManifest(kind, container, tks, whRows);
      setOpen(false);
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <div className="relative">
      <button
        type="button"
        className={CT_BTN_GHOST}
        onClick={() => setOpen((o) => !o)}
      >
        Export Manifest
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-mist-200 rounded-md shadow-lg z-20 py-1">
          {[
            ["csv", "CSV"],
            ["xls", "Excel (.xls)"],
            ["print", "PDF (Print / Save as PDF)"],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => go(k)}
              className="block w-full text-left px-3 py-2 text-sm text-ink-800 hover:bg-mist-50"
            >
              {label}
            </button>
          ))}
          {err && (
            <div className="px-3 py-2 text-xs text-signal-red">{err}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// pages/CustomerContainers.jsx — customer's own shipments (PHASE 5)
// ------------------------------------------------------------
// Live mode reads ONLY through the customer_container_tracking() database
// function, which returns just this customer's TKs and safe container
// columns. The customer never queries the containers table directly.
const CUSTOMER_STEPS = [
  { label: "Preparing", min: 0, max: 1 },
  { label: "Departed China", at: "departed_at", min: 2, max: 2 },
  { label: "Customs Clearance", min: 3, max: 4 },
  { label: "Arrived Destination", at: "arrived_at", min: 5, max: 5 },
];

function customerSteps(c) {
  const cur = containerStage(c.status);
  return CUSTOMER_STEPS.map((st) => {
    const done = cur > st.max || (st.max === 5 && cur === 5);
    const active = !done && cur >= st.min && cur <= st.max;
    return {
      label: st.label,
      state: done ? "done" : active ? "active" : "pending",
      time: st.at && c[st.at] && (done || active) ? formatIso(c[st.at]) : null,
    };
  });
}

function CustomerContainersView() {
  const { user } = useAuth();
  const { packages } = usePackageTracking();
  const { rows: whRows } = useWarehouses();
  const [rpcRows, setRpcRows] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.rpc("customer_container_tracking").then(({ data, error }) => {
      if (!alive) return;
      if (error) setErr(error.message);
      else setRpcRows(data || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  const groups = React.useMemo(() => {
    const map = new Map();
    if (supabase) {
      (rpcRows || []).forEach((r) => {
        const g = map.get(r.container_id) || { container: r, tks: [] };
        g.tks.push(r.tk);
        map.set(r.container_id, g);
      });
    } else {
      const cs = lsRead(CONTAINERS_KEY, []);
      packages
        .filter((p) => user?.customerId && customerIdOf(p) === user.customerId)
        .forEach((p) => {
          const no = String(p.container_no || "")
            .trim()
            .toUpperCase();
          if (!no) return;
          const c = cs.find(
            (x) =>
              String(x.container_number).toUpperCase() === no &&
              x.status !== "Cancelled",
          );
          if (!c) return;
          const g = map.get(c.id) || { container: c, tks: [] };
          g.tks.push(p.tk);
          map.set(c.id, g);
        });
    }
    return [...map.values()];
  }, [rpcRows, packages, user]);

  const dot = {
    done: "bg-signal-teal",
    active: "bg-signal-blue",
    pending: "bg-mist-200",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-xl text-ink-900">
          ទំនិញរបស់ខ្ញុំក្នុង Container
        </h1>
        <p className="text-sm text-ink-600/55 mt-0.5">
          បង្ហាញតែ TK របស់អ្នក ពីឃ្លាំងចិន ទៅកម្ពុជា
        </p>
      </div>
      {supabase && err && (
        <div className="flex items-center gap-2 text-sm text-[#B87415] bg-signal-amber/15 rounded-md px-3 py-2">
          <TriangleAlert size={14} className="shrink-0" />
          មិនអាចផ្ទុកទិន្នន័យបានទេ — សូមឱ្យ Admin run SQL Container Phase 5
        </div>
      )}
      {supabase && !err && rpcRows === null && (
        <SkeletonRegion className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className={`${CT_CARD} p-5 space-y-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" delay={i * 100} />
                  <Skeleton
                    className="h-3.5 w-56 max-w-full"
                    delay={i * 100 + 50}
                  />
                </div>
                <Skeleton className="h-5 w-20 rounded-sm" delay={i * 100} />
              </div>
              <SkeletonLines lines={3} />
            </div>
          ))}
        </SkeletonRegion>
      )}
      {groups.map(({ container: c, tks }) => (
        <div
          key={c.id || c.container_id}
          className={`${CT_CARD} p-5 space-y-4`}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-display font-bold text-ink-900">
                {c.container_number}
              </div>
              <div className="text-sm text-ink-600/60">
                {whName(whRows, c.origin_wh_code)} →{" "}
                {whName(whRows, c.dest_wh_code)}
                {c.eta ? ` · ETA ${fmtDate(c.eta)}` : ""}
              </div>
            </div>
            <StatusBadge label={c.status} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {customerSteps(c).map((st) => (
              <div key={st.label} className="flex items-start gap-2">
                <span
                  className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${dot[st.state]}`}
                />
                <div>
                  <div
                    className={`text-xs font-medium ${
                      st.state === "pending"
                        ? "text-ink-600/40"
                        : "text-ink-900"
                    }`}
                  >
                    {st.label}
                  </div>
                  {st.time && (
                    <div className="text-[11px] text-ink-600/50">{st.time}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border border-mist-200 rounded-md divide-y divide-mist-100">
            {tks.map((tk) => {
              const pkg = packages.find((p) => tkKey(p.tk) === tkKey(tk));
              return (
                <div
                  key={tk}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/packages/${tk}`}
                      className="font-medium text-signal-blue"
                    >
                      {tk}
                    </Link>
                    <div className="text-xs text-ink-600/55">
                      {pkg?.order_no || "—"}
                      {pkg?.cbm ? ` · ${Number(pkg.cbm).toFixed(3)} m³` : ""}
                      {pkg?.dest_branch_code
                        ? ` · → ${whName(whRows, pkg.dest_branch_code)}`
                        : ""}
                    </div>
                  </div>
                  {pkg?.status && <StatusBadge label={pkg.status} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {groups.length === 0 && (supabase ? rpcRows !== null : true) && !err && (
        <div className={`${CT_CARD} p-10 text-center text-sm text-ink-600/50`}>
          ទំនិញរបស់អ្នកមិនទាន់ត្រូវបានដាក់ក្នុង Container ណាមួយទេ
        </div>
      )}
    </div>
  );
}

function ContainerNoAccess() {
  return (
    <div className={`${CT_CARD} p-10 text-center text-sm text-ink-600/60`}>
      ទំព័រនេះសម្រាប់បុគ្គលិកប៉ុណ្ណោះ
    </div>
  );
}

// ------------------------------------------------------------
// pages/Containers.jsx — list + dashboard
// ------------------------------------------------------------
function ContainersPage() {
  const { user } = useAuth();
  if (user?.role === "Customer") return <CustomerContainersView />;
  return <ContainersPageInner />;
}

function ContainersPageInner() {
  const { user } = useAuth();
  const store = useContainerStore();
  const { packages, ready: pkgReady } = usePackageTracking();
  const listReady = store.ready && pkgReady;
  const canManage = hasPermission(user, "container.manage");
  const [f, setF] = useState({
    q: "",
    status: "",
    type: "",
    origin: "",
    dest: "",
    method: "",
    from: "",
    to: "",
  });
  const [modal, setModal] = useState(null); // { existing } | null
  const setFilter = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const whLabel = (code) =>
    store.whRows.find((w) => w.code === code)?.name || code || "—";

  const all = React.useMemo(
    () =>
      store.containers.map((c) => {
        const tks = tkRowsFor(c, store.activeItems, packages);
        return { c, tks, s: summarizeTks(tks) };
      }),
    [store.containers, store.activeItems, packages],
  );

  const rows = all.filter(({ c, tks }) => {
    if (f.status && c.status !== f.status) return false;
    if (f.type && c.container_type !== f.type) return false;
    if (f.origin && c.origin_wh_code !== f.origin) return false;
    if (f.dest && c.dest_wh_code !== f.dest) return false;
    if (f.method && c.shipping_method !== f.method) return false;
    if (f.from && (!c.departure_date || c.departure_date < f.from))
      return false;
    if (f.to && (!c.departure_date || c.departure_date > f.to)) return false;
    const q = f.q.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      c.container_number,
      c.seal_number,
      c.shipment_no,
      ...tks.flatMap((p) => {
        const cu = tkCustomerParts(p);
        return [p.tk, p.order_no, cu.id, cu.name, p.customer_id];
      }),
    ];
    return hay.some((x) =>
      String(x || "")
        .toLowerCase()
        .includes(q),
    );
  });

  const count = (s) => all.filter((x) => x.c.status === s).length;
  const allTks = new Map();
  all.forEach((x) => x.tks.forEach((p) => allTks.set(tkKey(p.tk), p)));
  const totals = summarizeTks([...allTks.values()]);

  const tableRows = rows.map(({ c, s, tks }) => ({
    id: c.id,
    no: c.container_number,
    type: c.container_type,
    origin: whLabel(c.origin_wh_code),
    dest: whLabel(c.dest_wh_code),
    tk: `${s.tk} TK`,
    cbm: `${s.cbm.toFixed(2)} CBM`,
    dep: fmtDate(c.departed_at || c.departure_date),
    eta: fmtDate(c.eta),
    status: c.status,
    c,
    tks,
  }));

  const actions = (row) => (
    <div className="flex items-center gap-3">
      <Link
        to={`/containers/${row.no}`}
        className="text-signal-blue font-medium hover:underline"
      >
        View
      </Link>
      {canManage && CONTAINER_EDITABLE.includes(row.c.status) && (
        <button
          type="button"
          onClick={() => setModal({ existing: row.c })}
          className="text-ink-700 font-medium hover:underline"
        >
          Edit
        </button>
      )}
      <button
        type="button"
        onClick={() => exportManifest("csv", row.c, row.tks, store.whRows)}
        className="text-ink-700 font-medium hover:underline"
      >
        Manifest
      </button>
    </div>
  );

  const columns = [
    {
      key: "no",
      label: "Container No.",
      strong: true,
      linkTo: (r) => `/containers/${r.no}`,
    },
    { key: "type", label: "Type" },
    { key: "origin", label: "Origin" },
    { key: "dest", label: "Destination" },
    { key: "tk", label: "TK Count" },
    { key: "cbm", label: "CBM" },
    { key: "dep", label: "Departure" },
    { key: "eta", label: "ETA" },
    { key: "status", label: "Status", status: true },
    { key: "actions", label: "Actions", render: actions },
  ];

  const stats = [
    ["Total CBM", totals.cbm.toFixed(2), "Box", "ink"],
    ["Total Weight (kg)", totals.weight.toFixed(1), "Weight", "ink"],
    ["Total Containers", all.length, "Container", "ink"],
    ["Total TK in Containers", totals.tk, "Package", "ink"],
    ["Total Customers", totals.customers, "Users", "ink"],
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-xl text-ink-900">
            Container Management
          </h1>
          <p className="text-sm text-ink-600/55 mt-0.5">
            គ្រប់គ្រង Container ពីឃ្លាំងចិន ទៅសាខាកម្ពុជា
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setModal({ existing: null })}
            className={CT_BTN_PRIMARY}
          >
            <Plus size={15} />
            Create Container
          </button>
        )}
      </div>

      {supabase && !store.tableReady && !store.loading && (
        <div className="flex items-center gap-2 text-sm text-[#B87415] bg-signal-amber/15 rounded-md px-3 py-2">
          <TriangleAlert size={14} className="shrink-0" />
          {CONTAINER_TABLE_HINT}
        </div>
      )}

      {listReady ? (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 cb-fade-in">
          {stats.map(([label, value, icon, tone]) => (
            <StatCard
              key={label}
              icon={icon}
              label={label}
              value={value}
              tone={tone}
            />
          ))}
        </div>
      ) : (
        <StatCardsSkeleton
          count={5}
          className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3"
        />
      )}

      {listReady && (
        <div className={`${CT_CARD} p-4`}>
          <h2 className="font-display font-bold text-sm text-ink-900 mb-3">
            Container Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {CONTAINER_STATUS_LIST.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  setFilter("status")({
                    target: { value: f.status === label ? "" : label },
                  })
                }
                className={`text-left border rounded-md px-3 py-2.5 hover:bg-mist-50 ${f.status === label ? "border-signal-blue bg-signal-blue/5" : "border-mist-200"}`}
              >
                <div className="text-xs text-ink-600/60 leading-snug min-h-[2rem]">
                  {label}
                </div>
                <div className="font-display font-extrabold text-xl text-ink-900 mt-1">
                  {count(label)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`${CT_CARD} p-4 space-y-3`}>
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600/40"
          />
          <input
            value={f.q}
            onChange={setFilter("q")}
            placeholder="Search Container No, Seal, Shipment ID, TK, Order ID, Customer ID..."
            className={`${INPUT_CLS} pl-9`}
          />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={f.status}
            onChange={setFilter("status")}
            className={INPUT_CLS}
          >
            <option value="">All Status</option>
            {[...CONTAINER_STATUS_LIST, "Cancelled"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={f.type}
            onChange={setFilter("type")}
            className={INPUT_CLS}
          >
            <option value="">All Types</option>
            {CONTAINER_TYPES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={f.method}
            onChange={setFilter("method")}
            className={INPUT_CLS}
          >
            <option value="">All Methods</option>
            {SHIPPING_METHODS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={f.origin}
            onChange={setFilter("origin")}
            className={INPUT_CLS}
          >
            <option value="">All Origins</option>
            {store.whRows
              .filter((w) => w.type === "china")
              .map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
          </select>
          <select
            value={f.dest}
            onChange={setFilter("dest")}
            className={INPUT_CLS}
          >
            <option value="">All Destinations</option>
            {store.whRows
              .filter((w) => w.type === "cambodia")
              .map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
          </select>
          <input
            type="date"
            value={f.from}
            onChange={setFilter("from")}
            title="Departure from"
            className={INPUT_CLS}
          />
          <input
            type="date"
            value={f.to}
            onChange={setFilter("to")}
            title="Departure to"
            className={INPUT_CLS}
          />
          <button
            type="button"
            onClick={() =>
              setF({
                q: "",
                status: "",
                type: "",
                origin: "",
                dest: "",
                method: "",
                from: "",
                to: "",
              })
            }
            className={CT_BTN_GHOST}
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className={`${CT_CARD} hidden md:block`}>
        <DataTable
          columns={columns}
          rows={tableRows}
          loading={!listReady}
          skeletonRows={6}
        />
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {!listReady && <SkeletonCardList count={3} />}
        {listReady &&
          tableRows.map((r) => (
            <div key={r.id} className={`${CT_CARD} p-4 space-y-2`}>
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/containers/${r.no}`}
                  className="font-display font-bold text-ink-900"
                >
                  {r.no}
                </Link>
                <StatusBadge label={r.status} />
              </div>
              <p className="text-sm text-ink-600/70">
                {r.origin} → {r.dest}
              </p>
              <p className="text-xs text-ink-600/55">
                {r.type} · {r.tk} · {r.cbm}
              </p>
              <p className="text-xs text-ink-600/55">
                Departure {r.dep} · ETA {r.eta}
              </p>
              <div className="pt-1">{actions(r)}</div>
            </div>
          ))}
        {listReady && tableRows.length === 0 && (
          <div className={`${CT_CARD} p-8 text-center text-sm text-ink-600/40`}>
            No data available.
          </div>
        )}
      </div>

      <ContainerFormModal
        open={!!modal}
        existing={modal?.existing || null}
        whRows={store.whRows}
        onClose={() => setModal(null)}
        onSave={(v, existing) =>
          existing
            ? store.updateContainer(existing, v)
            : store.createContainer(v)
        }
      />
    </div>
  );
}

// ------------------------------------------------------------
// pages/ContainerDetail.jsx
// ------------------------------------------------------------
function ContainerDetail() {
  const { user } = useAuth();
  if (user?.role === "Customer") return <ContainerNoAccess />;
  return <ContainerDetailInner />;
}

function ContainerDetailInner() {
  const { id } = useParams();
  const { user } = useAuth();
  const store = useContainerStore();
  const navigate = useNavigate();
  const { packages, ready: pkgReady } = usePackageTracking();
  const canForceEdit = hasPermission(user, "container.edit");
  const canDeleteContainer = hasPermission(user, "container.delete");
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [flash, setFlash] = useState("");
  const [tab, setTab] = useState("tracking");
  const [addOpen, setAddOpen] = useState(false);
  const [sealOpen, setSealOpen] = useState(false);
  const [exOpen, setExOpen] = useState(false);
  const [xfer, setXfer] = useState(null);
  const canManage = hasPermission(user, "container.manage");
  const canKh = hasPermission(user, "container.receive");

  // Old links use the Container Number, new ones may use the id.
  const key = decodeURIComponent(id || "").toUpperCase();
  const container = store.containers.find(
    (c) => c.id === id || String(c.container_number).toUpperCase() === key,
  );

  const back = (
    <Link
      to="/containers"
      className="inline-flex items-center gap-1.5 text-sm text-ink-600/60 hover:text-ink-900"
    >
      <ArrowLeft size={15} />
      Back to Containers
    </Link>
  );

  if (!container && !store.ready)
    return (
      <DetailPageSkeleton backTo="/containers" backLabel="Back to Containers" />
    );

  if (!container) {
    return (
      <div className="space-y-5">
        {back}
        <div className={`${CT_CARD} p-10 text-center text-sm text-ink-600/60`}>
          {store.loading ? "Loading..." : `រកមិនឃើញ Container "${id}" ទេ`}
        </div>
      </div>
    );
  }

  const tks = tkRowsFor(container, store.activeItems, packages);
  const s = summarizeTks(tks);
  const addedAt = new Map(
    store.activeItems
      .filter((i) => i.container_id === container.id)
      .map((i) => [tkKey(i.tk), i.added_at]),
  );
  const timeline = containerTimeline(container, store.history);
  const myHistory = store.history.filter(
    (h) => h.container_id === container.id,
  );
  const wh = (code) => {
    const w = store.whRows.find((x) => x.code === code);
    return w ? `${w.code} · ${w.name}` : code || "—";
  };
  const st = container.status;
  const editable = canManage && CONTAINER_EDITABLE.includes(st);
  const tkEditable = canManage && CONTAINER_TK_EDITABLE.includes(st);
  // PHASE 6 permissions
  const canP6 = canManage || canKh;
  const transferOut =
    (CONTAINER_TRANSFER_CN.includes(st) && canManage) ||
    (CONTAINER_TRANSFER_KH_FROM.includes(st) && canKh);
  const transferIn =
    (CONTAINER_TRANSFER_CN.includes(st) && canManage) ||
    (CONTAINER_TRANSFER_KH_TO.includes(st) && canKh);
  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 3500);
  };
  const askRemove = (tk) =>
    ask({
      title: "Remove TK",
      message: `Remove TK ${tk} ចេញពី Container ${container.container_number}? TK នឹងអាចដាក់ក្នុង Container ផ្សេងវិញបាន។`,
      confirmLabel: "Remove TK",
      danger: true,
      askReason: true,
      onConfirm: async (reason) => {
        await store.removeTk(container, tk, reason);
        showFlash(`បានRemove TK ${tk} ចេញ`);
      },
    });

  const ask = (cfg) => setConfirm(cfg);
  const run = (next, msg) => async (reason) => {
    await store.changeStatus(container, next, reason);
    setFlash(msg);
    setTimeout(() => setFlash(""), 3500);
  };

  const tkColumns = [
    {
      key: "tk",
      label: "TK Number",
      strong: true,
      linkTo: (r) => `/packages/${r.tk}`,
    },
    { key: "order_no", label: "Order ID" },
    { key: "cid", label: "Customer ID" },
    { key: "cname", label: "Customer Name" },
    { key: "cargo_type", label: "Cargo Type" },
    { key: "size", label: "Size" },
    { key: "cbm", label: "CBM" },
    { key: "origin", label: "Origin" },
    { key: "dest", label: "Destination" },
    { key: "status", label: "Status", status: true },
    { key: "added", label: "Added Date" },
    ...(tkEditable || transferOut
      ? [
          {
            key: "act",
            label: "",
            render: (r) => (
              <div className="flex items-center justify-end gap-3">
                {transferOut && (
                  <button
                    type="button"
                    onClick={() => setXfer({ mode: "out", tk: r.tk })}
                    className="text-signal-blue text-xs font-medium hover:underline"
                  >
                    Transfer
                  </button>
                )}
                {tkEditable && (
                  <button
                    type="button"
                    onClick={() => askRemove(r.tk)}
                    className="text-signal-red text-xs font-medium hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];
  const tkRows = tks.map((p) => {
    const cu = tkCustomerParts(p);
    return {
      tk: p.tk,
      order_no: p.order_no || "—",
      cid: cu.id,
      cname: cu.name,
      cargo_type: p.cargo_type || "—",
      size: p.size_class ? sizeLabel(p.size_class) : "—",
      cbm: p.cbm ? `${Number(p.cbm).toFixed(3)} m³` : "—",
      origin: p.origin_wh_code || p.warehouse || "—",
      dest: p.dest_branch_code || "—",
      status: p.status || "—",
      added: addedAt.get(tkKey(p.tk))
        ? formatIso(addedAt.get(tkKey(p.tk)))
        : "—",
    };
  });

  return (
    <div className="space-y-5">
      {back}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-ink-900/5 text-ink-800 flex items-center justify-center shrink-0">
            <ContainerIcon size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ink-900">
              {container.container_number}
            </h1>
            <p className="text-sm text-ink-600/55 mt-0.5">
              {wh(container.origin_wh_code)} → {wh(container.dest_wh_code)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ManifestMenu container={container} tks={tks} whRows={store.whRows} />
          <StatusBadge label={st} />
        </div>
      </div>

      {flash && (
        <div className="flex items-center gap-2 text-sm text-signal-teal bg-signal-teal/10 rounded-md px-3 py-2">
          <Check size={14} />
          {flash}
        </div>
      )}

      {canManage && (
        <div className={`${CT_CARD} p-4 flex flex-wrap gap-2`}>
          {tkEditable && (
            <button
              type="button"
              className={CT_BTN_PRIMARY}
              onClick={() => setAddOpen(true)}
            >
              <Plus size={15} />
              Scan / Add TK
            </button>
          )}
          {st === "Empty" && (
            <button
              type="button"
              className={CT_BTN_GHOST}
              onClick={() =>
                ask({
                  title: "Start Loading",
                  message: "តើអ្នកប្រាកដថាចង់ចាប់ផ្តើម Loading Container នេះ?",
                  confirmLabel: "Start Loading",
                  onConfirm: run("Loading", "Container ចាប់ផ្តើម Loading"),
                })
              }
            >
              Start Loading
            </button>
          )}
          {["Empty", "Loading"].includes(st) && (
            <button
              type="button"
              className={CT_BTN_PRIMARY}
              onClick={() =>
                ask({
                  title: "Depart China",
                  message: `សូមប្រាកដថាទំនិញគ្រប់ចំនួនហើយ។ Container នឹងក្លាយជា Departure China Warehouse ហើយ TK ${s.tk} នឹងផ្លាស់ទៅ Outbound Origin។`,
                  confirmLabel: "Depart China",
                  onConfirm: async () => {
                    const r = await store.departChina(container);
                    showFlash(
                      `Container ចេញពីឃ្លាំងចិនហើយ (${r.tks} TK)` +
                        (r.warn
                          ? ` — ${r.warn} TK មិនទាន់ធ្វើបច្ចុប្បន្នភាព សូមពិនិត្យ`
                          : ""),
                    );
                  },
                })
              }
            >
              Depart China
            </button>
          )}
          {(editable || canForceEdit) && (
            <button
              type="button"
              className={CT_BTN_GHOST}
              onClick={() => setEdit(true)}
            >
              <Icons.Pencil size={14} />
              Edit
            </button>
          )}
          {canDeleteContainer && (
            <button
              type="button"
              className={`${CT_BTN_GHOST} !text-signal-red !border-signal-red/30`}
              onClick={() =>
                ask({
                  title: "Delete Container",
                  message: `លុប Container ${container.container_number} ជាអចិន្ត្រៃយ៍? TK Allក្នុងនោះនឹងត្រូវដោះចេញ ហើយ History នឹងត្រូវលុប។ This action cannot be undone.`,
                  confirmLabel: "Delete",
                  danger: true,
                  onConfirm: async () => {
                    await store.deleteContainer(container);
                    navigate("/containers");
                  },
                })
              }
            >
              <Icons.Trash2 size={14} />
              Delete
            </button>
          )}
          {["Empty", "Loading"].includes(st) && (
            <button
              type="button"
              className={CT_BTN_DANGER}
              onClick={() =>
                ask({
                  title: "Cancel Container",
                  message:
                    "តើអ្នកប្រាកដថាចង់Cancel Container នេះ? TK Allនឹងត្រូវដោះលែងចេញ។",
                  confirmLabel: "Cancel Container",
                  danger: true,
                  askReason: true,
                  onConfirm: run("Cancelled", "Container ត្រូវបានCancel"),
                })
              }
            >
              Cancel Container
            </button>
          )}
        </div>
      )}

      {(canManage || canKh) &&
        containerStage(st) >= 2 &&
        st !== "Arrived Destination" &&
        st !== "Cancelled" && (
          <div className={`${CT_CARD} p-4 space-y-3`}>
            <h2 className="font-display font-bold text-sm text-ink-900">
              Update Container Status
            </h2>
            <div className="flex flex-wrap gap-2">
              {CONTAINER_CUSTOMS_ACTIONS.filter((x) =>
                containerCanMove(st, x),
              ).map((x) => (
                <button
                  key={x}
                  type="button"
                  className={
                    /Failed/.test(x)
                      ? CT_BTN_DANGER
                      : /Hold/.test(x)
                        ? CT_BTN_GHOST
                        : CT_BTN_PRIMARY
                  }
                  onClick={() =>
                    ask({
                      title: x,
                      message: `កំណត់ Container ${container.container_number} ជា "${x}"?`,
                      confirmLabel: "Update Status",
                      danger: /Failed/.test(x),
                      askReason: !/Completed/.test(x),
                      onConfirm: run(x, `Container: ${x}`),
                    })
                  }
                >
                  {x}
                </button>
              ))}
              {canKh && (
                <button
                  type="button"
                  className={CT_BTN_PRIMARY}
                  onClick={() =>
                    ask({
                      title: "Confirm Arrival",
                      message: `Confirmថា Container ${container.container_number} បានមកដល់ឃ្លាំងទទួលទំនិញ? វាមិនប៉ះពាល់ TK ទេ — TK នៅ Outbound រហូតដល់ឃ្លាំង Scan Arrive V2។`,
                      confirmLabel: "Confirm Arrival",
                      onConfirm: async () => {
                        await store.confirmArrival(container);
                        showFlash("Container Arrived Destination");
                      },
                    })
                  }
                >
                  Arrived Destination
                </button>
              )}
            </div>
          </div>
        )}

      {st === "Arrived Destination" && <ArrivalProgressCard tks={tks} />}

      {/* C. Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon="Package" label="Total TK" value={s.tk} />
        <StatCard icon="ClipboardList" label="Total Orders" value={s.orders} />
        <StatCard icon="Users" label="Total Customers" value={s.customers} />
        <StatCard
          icon="Box"
          label="Total CBM"
          value={s.cbm.toFixed(2)}
          unit="m³"
        />
        <StatCard
          icon="Weight"
          label="Total Weight"
          value={s.weight.toFixed(1)}
          unit="kg"
        />
        <StatCard
          icon="Banknote"
          label="Total Freight"
          value={money(s.freight)}
        />
      </div>

      {/* Loading CBM */}
      {(() => {
        const cap = CONTAINER_CBM_CAPACITY[container.container_type] || 0;
        const loaded = s.cbm;
        const pct = cap ? Math.min(100, Math.round((loaded / cap) * 100)) : 0;
        const R = 34;
        const C = 2 * Math.PI * R;
        return (
          <div className={`${CT_CARD} p-5`}>
            <h2 className="font-display font-bold text-sm text-ink-900">
              Loading CBM
            </h2>
            <p className="text-xs text-ink-600/55 mb-4">
              CBM សរុបដែលបានដាក់ចូល Container
            </p>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r={R}
                    fill="none"
                    strokeWidth="8"
                    className="stroke-mist-100"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r={R}
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - pct / 100)}
                    className={
                      pct >= 100 ? "stroke-signal-red" : "stroke-signal-amber"
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display font-extrabold text-lg text-ink-900">
                    {cap ? `${pct}%` : "—"}
                  </span>
                  <span className="text-[10px] text-ink-600/50">full</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div>
                  <div className="text-xs text-ink-600/55">Loaded</div>
                  <div className="font-display font-bold text-ink-900">
                    {loaded.toFixed(2)} m³
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-600/55">Capacity</div>
                  <div className="font-display font-bold text-ink-900">
                    {cap ? `${cap.toFixed(2)} m³` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ink-600/55">Free</div>
                  <div className="font-display font-bold text-ink-900">
                    {cap ? `${Math.max(0, cap - loaded).toFixed(2)} m³` : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="flex items-center gap-1 border-b border-mist-200">
            {[
              ["measurements", "Loaded Measurements"],
              ["tracking", "Container Tracking"],
              ["history", "Container History"],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${tab === k ? "border-signal-blue text-signal-blue" : "border-transparent text-ink-600/60 hover:text-ink-900"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "tracking" && (
            <div className={`${CT_CARD} p-5`}>
              <Timeline steps={timeline} />
            </div>
          )}
          {tab === "measurements" && (
            <div className={CT_CARD}>
              <div className="flex items-center justify-between px-4 lg:px-5 py-3.5 border-b border-mist-200">
                <h2 className="font-display font-bold text-sm text-ink-900">
                  TK ក្នុង Container ({tks.length})
                </h2>
                {transferIn && (
                  <button
                    type="button"
                    onClick={() => setXfer({ mode: "in" })}
                    className={CT_BTN_GHOST}
                  >
                    <Icons.ArrowLeftRight size={14} />
                    Move TK here
                  </button>
                )}
              </div>
              {!CONTAINER_TK_EDITABLE.includes(st) && (
                <div className="px-4 lg:px-5 py-2.5 text-xs text-ink-600/55 bg-mist-50/60 border-b border-mist-200">
                  Container ស្ថិតក្នុង {st} — បញ្ជី TK ត្រូវបានចាក់សោ។
                </div>
              )}
              <div className="hidden md:block">
                <DataTable
                  columns={tkColumns}
                  rows={tkRows}
                  loading={!pkgReady}
                  skeletonRows={4}
                />
              </div>
              <div className="md:hidden divide-y divide-mist-100">
                {!pkgReady && <SkeletonCardList count={2} className="p-3" />}
                {pkgReady &&
                  tkRows.map((r) => (
                    <div key={r.tk} className="p-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/packages/${r.tk}`}
                          className="font-medium text-signal-blue"
                        >
                          {r.tk}
                        </Link>
                        <StatusBadge label={r.status} />
                      </div>
                      <p className="text-sm text-ink-800">
                        {r.cid} · {r.cname}
                      </p>
                      <p className="text-xs text-ink-600/55">
                        {r.order_no} · {r.cargo_type} · {r.cbm}
                      </p>
                      <p className="text-xs text-ink-600/55">→ {r.dest}</p>
                      {(tkEditable || transferOut) && (
                        <div className="flex items-center gap-4 pt-1">
                          {transferOut && (
                            <button
                              type="button"
                              onClick={() => setXfer({ mode: "out", tk: r.tk })}
                              className="text-signal-blue text-xs font-medium"
                            >
                              Transfer
                            </button>
                          )}
                          {tkEditable && (
                            <button
                              type="button"
                              onClick={() => askRemove(r.tk)}
                              className="text-signal-red text-xs font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                {pkgReady && tkRows.length === 0 && (
                  <div className="p-8 text-center text-sm text-ink-600/40">
                    No TKs in this container yet.
                  </div>
                )}
              </div>
            </div>
          )}
          {tab === "history" && (
            <div className={`${CT_CARD} p-5`}>
              <h2 className="font-display font-bold text-sm text-ink-900 mb-4">
                Container History
              </h2>
              <ol className="space-y-3">
                {myHistory.map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <span className="w-40 shrink-0 text-xs text-ink-600/50 tabular-nums">
                      {formatIso(h.created_at)}
                    </span>
                    <div>
                      <span className="font-medium text-ink-900">
                        {h.action}
                      </span>
                      {h.detail && (
                        <span className="text-ink-600/70"> — {h.detail}</span>
                      )}
                      <div className="text-xs text-ink-600/45">
                        By: {h.created_by || "—"}
                      </div>
                    </div>
                  </li>
                ))}
                {myHistory.length === 0 && (
                  <li className="text-sm text-ink-600/40">No history yet.</li>
                )}
              </ol>
            </div>
          )}
        </div>

        {/* A. Information */}
        <div className={`${CT_CARD} p-5`}>
          <h2 className="font-display font-bold text-sm text-ink-900 mb-4">
            Container information
          </h2>
          <InfoGrid
            items={[
              { label: "Container Number", value: container.container_number },
              { label: "Type", value: container.container_type },
              { label: "Seal Number", value: container.seal_number || "—" },
              {
                label: "Shipping Method",
                value: container.shipping_method || "—",
              },
              { label: "Carrier", value: container.carrier || "—" },
              { label: "Shipment ID", value: container.shipment_no || "—" },
              {
                label: "Origin",
                value: wh(container.origin_wh_code),
                span: true,
              },
              {
                label: "Destination",
                value: wh(container.dest_wh_code),
                span: true,
              },
              {
                label: "Planned Departure",
                value: fmtDate(container.departure_date),
              },
              { label: "ETA", value: fmtDate(container.eta) },
              ...(container.sealed_at
                ? [
                    {
                      label: "Sealed",
                      value: `${container.sealed_by || "—"} · ${formatIso(container.sealed_at)}`,
                      span: true,
                    },
                  ]
                : []),
              ...(container.departed_at
                ? [
                    {
                      label: "Departed China",
                      value: `${container.departed_by || "—"} · ${formatIso(container.departed_at)}`,
                      span: true,
                    },
                  ]
                : []),
              ...(container.arrived_at
                ? [
                    {
                      label: "Actual Arrival",
                      value: `${container.arrived_by || "—"} · ${formatIso(container.arrived_at)}`,
                      span: true,
                    },
                  ]
                : []),
              ...(container.unloading_started_at
                ? [
                    {
                      label: "Unloading Started",
                      value: `${container.unloading_started_by || "—"} · ${formatIso(container.unloading_started_at)}`,
                      span: true,
                    },
                  ]
                : []),
              ...(container.completed_at
                ? [
                    {
                      label: "Completed",
                      value: `${container.completed_by || "—"} · ${formatIso(container.completed_at)}`,
                      span: true,
                    },
                  ]
                : []),
              {
                label: "Created",
                value: `${container.created_by || "—"} · ${formatIso(container.created_at)}`,
                span: true,
              },
              {
                label: "Updated",
                value: `${container.updated_by || "—"} · ${formatIso(container.updated_at)}`,
                span: true,
              },
              ...(container.remark
                ? [{ label: "Remark", value: container.remark, span: true }]
                : []),
            ]}
          />
        </div>
      </div>

      {/* PHASE 6 — Exception / Photo / Transfer */}
      <ContainerExceptionsCard
        container={container}
        store={store}
        canP6={canP6}
        onAsk={ask}
        onReport={() => setExOpen(true)}
      />
      <ContainerPhotosCard
        container={container}
        store={store}
        canP6={canP6}
        onFlash={showFlash}
      />
      <ContainerTransfersCard container={container} store={store} />

      <ContainerExceptionModal
        open={exOpen}
        container={container}
        tks={tks}
        store={store}
        onClose={() => setExOpen(false)}
        onDone={(res) =>
          showFlash(
            res.warning
              ? `Exception reported — ${res.warning}`
              : "Exception reported",
          )
        }
      />
      <TransferTkModal
        open={!!xfer}
        mode={xfer?.mode}
        presetTk={xfer?.tk}
        container={container}
        store={store}
        packages={packages}
        onClose={() => setXfer(null)}
        onDone={(res, from, to) =>
          showFlash(
            `បានផ្ទេរ TK ${res.pkg.tk} ពី ${from.container_number} ទៅ ${to.container_number}` +
              (res.warning ? ` — ${res.warning}` : ""),
          )
        }
      />
      <ContainerFormModal
        open={edit}
        existing={container}
        whRows={store.whRows}
        onClose={() => setEdit(false)}
        onSave={(v) =>
          canForceEdit
            ? store.forceUpdateContainer(container, v)
            : store.updateContainer(container, v)
        }
      />
      <ConfirmModal
        open={!!confirm}
        {...(confirm || {})}
        onClose={() => setConfirm(null)}
      />
      <SealModal
        open={sealOpen}
        container={container}
        tkCount={s.tk}
        by={store.by}
        onSeal={async (seal) => {
          await store.sealContainer(container, seal);
          showFlash("Container sealed");
        }}
        onClose={() => setSealOpen(false)}
      />
      <AddTkModal
        open={addOpen}
        container={container}
        store={store}
        packages={packages}
        onClose={() => setAddOpen(false)}
        onDone={(res) =>
          showFlash(
            `TK បានបន្ថែមជោគជ័យ (${res.added.length})` +
              (res.warn
                ? ` — ${res.warn} TK មិនទាន់ធ្វើសមកាលកម្ម Container No`
                : ""),
          )
        }
      />
    </div>
  );
}

// ------------------------------------------------------------
// CUSTOMER PORTAL (route: /customer/*) — separate from Admin/Staff
// ------------------------------------------------------------
// Wrapped in an IIFE so its helper names (Card, Btn, Field, Row, Auth,
// Shell, Profile ...) can never collide with the admin code above.
// Uses only imports already at the top of this file.
const CustomerApp = (() => {
  const {
    Home,
    Package,
    MapPin,
    User,
    ChevronRight,
    ArrowLeft,
    Search,
    Eye,
    EyeOff,
    Copy,
    Check,
    Plus,
    Pencil,
    Trash2,
    Lock,
    Phone,
    Mail,
    Info,
    LogOut,
    Bell,
    HelpCircle,
    Warehouse,
    Ship,
    X,
    ShieldCheck,
  } = Icons;
  // =============================================================
  // Customer Portal — SEPARATE from Admin/Staff (Cargo Bridge)
  // Mobile-first. Needs: react-router-dom, lucide-react, Tailwind.
  // Mount on its own entry/domain (see customer-main.jsx note below).
  //
  // PRIVACY: the filter `s.cid === me.id` below is UI-only. Real isolation
  // MUST be enforced by Supabase RLS (customer_id = auth.uid()) and by a
  // customer view that has NO staff/scanner/cost/profit columns.
  // =============================================================

  if (
    typeof document !== "undefined" &&
    !document.getElementById("drsb-font")
  ) {
    const l = document.createElement("link");
    l.id = "drsb-font";
    l.rel = "stylesheet";
    l.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Khmer:wght@400;500;600;700&display=swap";
    document.head.appendChild(l);
  }
  const FONT = { fontFamily: "Inter,'Noto Sans Khmer',system-ui,sans-serif" };

  // ---------- constants & helpers ----------
  const STEPS = [
    ["Inbound", "ចូលឃ្លាំងចិន"],
    ["Outbound", "ចេញពីចិន"],
    ["Arrived", "មកដល់កម្ពុជា"],
    ["Shipping to Branch", "កំពុងដឹកទៅសាខា"],
    ["Inbound Warehouse", "ចូលឃ្លាំងសាខា"],
    ["Complete", "បញ្ចប់"],
  ];
  const STEP_OF_STATUS = {
    Inbound: 0,
    Outbound: 1,
    Arrived: 2,
    "Shipping to Branch": 3,
    "Inbound Warehouse": 4,
    Complete: 5,
  };
  const stepOf = (status) =>
    status in STEP_OF_STATUS ? STEP_OF_STATUS[status] : -1; // -1 = "Processing" (no status_history yet)
  const statusOf = (n) =>
    n < 0
      ? ["Processing", "bg-slate-100 text-slate-500"]
      : n <= 1
        ? ["In Transit", "bg-blue-50 text-blue-700"]
        : n <= 3
          ? ["Arrived", "bg-green-50 text-green-700"]
          : n === 4
            ? ["Ready for Pickup", "bg-orange-50 text-orange-600"]
            : ["Completed", "bg-slate-100 text-slate-600"];
  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";
  const digitsOnly = (s) => (s || "").replace(/\D/g, "");
  // Supabase Auth needs an email to sign in with password; customers only
  // ever see/enter their phone. We derive a stable, private-looking email
  // from the phone number so `supabase.auth.signInWithPassword` still works
  // under the hood. IMPORTANT: turn OFF "Confirm email" in Supabase Auth
  // settings for this to work — these addresses can't receive mail, so a
  // confirmation link would leave the customer stuck.
  const fakeEmailForPhone = (phone) =>
    `${digitsOnly(phone)}@customer.drsb.internal`;

  const P = (p = "") => "/customer" + p; // every customer URL lives under /customer
  const Ctx = createContext();
  const useApp = () => useContext(Ctx);
  const copy = async (t) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {}
  };

  function Provider({ children }) {
    const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
    const [me, setMe] = useState(null);
    const [ships, setShips] = useState([]);
    const [addrs, setAddrs] = useState([]);
    const [branches, setBranches] = useState([]); // Active Cambodia receiving branches
    const [branchErr, setBranchErr] = useState("");
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState("");
    const say = (m) => {
      setToast(m);
      setTimeout(() => setToast(""), 1800);
    };

    const loadMe = async (uid) => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("auth_user_id", uid)
        .maybeSingle();
      if (error || !data) {
        say("Unable to load account");
        return null;
      }
      setMe(data);
      return data;
    };
    const loadShips = async () => {
      const [{ data: pkgs }, { data: ords }] = await Promise.all([
        supabase
          .from("customer_packages")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("customer_orders").select("order_no, platform"),
      ]);
      const shopOf = Object.fromEntries(
        (ords || []).map((o) => [o.order_no, o.platform]),
      );
      setShips(
        (pkgs || []).map((p) => ({
          tk: p.tk,
          shop: shopOf[p.order_no] || p.cargo_type || "—",
          desc: p.product_name || "—",
          step: stepOf(p.status),
          createdAt: p.created_at,
        })),
      );
    };
    const loadAddrs = async () => {
      const { data } = await supabase
        .from("customer_addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      setAddrs(
        (data || []).map((r) => ({
          id: r.id,
          label: r.label,
          name: r.recipient_name,
          phone: r.phone,
          province: r.province,
          district: r.district,
          commune: r.commune,
          addr: r.address,
          note: r.additional_info,
          def: r.is_default,
          branch: r.kh_branch_code || "",
        })),
      );
    };
    // Needs a select policy on `warehouses` for authenticated customers
    // (see SQL in the Addresses section comment).
    const loadBranches = async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("code, name, province, district, commune, address, map_url")
        .eq("type", "cambodia")
        .eq("status", "Active")
        .order("province")
        .order("name");
      setBranchErr(error ? error.message || "error" : "");
      setBranches(data || []);
    };

    useEffect(() => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      supabase.auth
        .getSession()
        .then(({ data }) => setSession(data.session ?? null));
      const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) =>
        setSession(s),
      );
      return () => sub.subscription.unsubscribe();
    }, []);

    useEffect(() => {
      if (session === undefined) return;
      if (!session) {
        setMe(null);
        setShips([]);
        setAddrs([]);
        setLoading(false);
        return;
      }
      (async () => {
        setLoading(true);
        const m = await loadMe(session.user.id);
        if (m) await Promise.all([loadShips(), loadAddrs(), loadBranches()]);
        setLoading(false);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    const login = async (phone, pw) => {
      if (!supabase) return "Supabase មិនទាន់តភ្ជាប់";
      if (!phone || !pw) return "Please enter your phone number and password.";
      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmailForPhone(phone),
        password: pw,
      });
      return error ? "Incorrect phone number or password." : null;
    };
    const signup = async (name, phone, email, pw) => {
      if (!supabase) return "Supabase មិនទាន់តភ្ជាប់";
      const { data, error } = await supabase.auth.signUp({
        email: fakeEmailForPhone(phone),
        password: pw,
      });
      if (error)
        return /already|registered|exists/i.test(error.message)
          ? "Phone numberនេះបានប្រើរួចហើយ"
          : "Unable to create account";
      if (!data.session) return "signup-needs-confirm"; // "Confirm email" is ON in Supabase — turn it off, see code comment above
      const { error: insErr } = await supabase.from("customers").insert({
        auth_user_id: data.user.id,
        name,
        phone,
        email: email || null,
        status: "active",
      });
      if (insErr) return "Unable to save account: " + insErr.message;
      await loadMe(data.user.id);
      await Promise.all([loadShips(), loadAddrs()]);
      return null;
    };
    const logout = () => supabase && supabase.auth.signOut();

    const saveAddr = async (a) => {
      const row = {
        label: a.label,
        recipient_name: a.name,
        phone: a.phone,
        province: a.province,
        district: a.district,
        commune: a.commune,
        address: a.addr,
        additional_info: a.note,
        is_default: !!a.def,
        kh_branch_code: a.branch || null,
      };
      if (a.id)
        await supabase.from("customer_addresses").update(row).eq("id", a.id);
      else
        await supabase
          .from("customer_addresses")
          .insert({ ...row, customer_id: me.id });
      // Default address → its branch becomes the customer's default
      // Receiving Branch for NEW orders (old orders never change).
      if (a.def && a.branch)
        await supabase
          .from("customers")
          .update({ default_kh_branch: a.branch })
          .eq("id", me.id);
      await loadAddrs();
    };
    const delAddr = async (id) => {
      await supabase.from("customer_addresses").delete().eq("id", id);
      await loadAddrs();
    };
    const setDef = async (id) => {
      await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("customer_id", me.id);
      await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", id);
      const picked = addrs.find((x) => x.id === id);
      if (picked?.branch)
        await supabase
          .from("customers")
          .update({ default_kh_branch: picked.branch })
          .eq("id", me.id);
      await loadAddrs();
    };

    const v = {
      me,
      say,
      toast,
      loading,
      login,
      signup,
      logout,
      ships,
      addrs,
      branches,
      branchErr,
      saveAddr,
      delAddr,
      setDef,
    };
    return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
  }

  // ---------- UI atoms ----------
  const Badge = ({ n }) => {
    const [l, c] = statusOf(n);
    return (
      <span
        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${c}`}
      >
        {l}
      </span>
    );
  };
  const Btn = ({ children, ghost, danger, ...p }) => (
    <button
      {...p}
      className={`w-full h-12 rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[.98] transition disabled:opacity-50 ${ghost ? "bg-white text-blue-700 border border-blue-200" : danger ? "bg-white text-red-600 border border-red-200" : "bg-blue-600 text-white shadow-[0_6px_16px_-6px_rgba(37,99,235,.6)]"} ${p.className || ""}`}
    >
      {children}
    </button>
  );
  const Field = ({ label, icon: I, pw, v, set, ph, type = "text" }) => {
    const [show, setShow] = useState(false);
    return (
      <label className="block">
        {label && (
          <span className="text-[13px] font-semibold text-slate-700 mb-1.5 block">
            {label}
          </span>
        )}
        <span className="flex items-center gap-2.5 h-12 px-3.5 rounded-xl bg-white border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
          {I && <I size={18} className="text-slate-400" />}
          <input
            value={v}
            onChange={(e) => set(e.target.value)}
            placeholder={ph}
            type={pw && !show ? "password" : type}
            className="flex-1 bg-transparent outline-none text-[15px] text-slate-900 min-w-0"
          />
          {pw && (
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="text-slate-400"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </span>
      </label>
    );
  };
  const Card = ({ children, className = "", ...p }) => (
    <div
      {...p}
      className={`bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(15,40,90,.12)] ${className}`}
    >
      {children}
    </div>
  );
  const Top = ({ title, back, right }) => {
    const nav = useNavigate();
    return (
      <header className="bg-blue-600 text-white px-4 pt-5 pb-5 flex items-center gap-3 rounded-b-3xl">
        {back && (
          <button
            onClick={() => nav(-1)}
            className="w-9 h-9 grid place-items-center rounded-full bg-white/15"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="font-bold text-lg flex-1">{title}</h1>
        {right}
      </header>
    );
  };
  const Icon = ({ i: I, c = "bg-blue-50 text-blue-600" }) => (
    <span
      className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${c}`}
    >
      <I size={22} />
    </span>
  );

  // ---------- Auth ----------
  function Auth() {
    const { login, signup, me } = useApp();
    const [mode, setMode] = useState("login");
    const [f, setF] = useState({
      id: "",
      pw: "",
      name: "",
      phone: "",
      email: "",
    });
    const [err, setErr] = useState("");
    const [busy, setBusy] = useState(false);
    const s = (k) => (v) => setF({ ...f, [k]: v });
    if (me) return <Navigate to={P()} replace />;
    const go = async () => {
      setErr("");
      if (mode === "forgot") {
        setMode("login");
        setErr("សូមទាក់ទងផ្នែកជំនួយ ដើម្បីកំណត់លេខសម្ងាត់ឡើងវិញ");
        return;
      }
      if (mode === "signup" && !(f.name && f.phone && f.pw.length >= 4)) {
        setErr("សូមបំពេញឈ្មោះ Phone number និងលេខសម្ងាត់ (≥4)");
        return;
      }
      if (mode === "login" && !(f.id && f.pw)) {
        setErr("Please enter your phone number and password.");
        return;
      }
      setBusy(true);
      const e =
        mode === "login"
          ? await login(f.id, f.pw)
          : await signup(f.name, f.phone, f.email, f.pw);
      setBusy(false);
      if (e === "signup-needs-confirm") setErr("គណនីបានបង្កើត សូមចូលម្ដងទៀត");
      else if (e) setErr(e);
    };
    return (
      <div className="min-h-screen bg-slate-50" style={FONT}>
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-b from-blue-700 to-blue-500 text-white px-6 pt-14 pb-16 rounded-b-[36px] text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-white/15 grid place-items-center mb-3">
              <Ship size={32} />
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              Cargo Bridge
            </div>
            <p className="text-blue-100 text-xs">Global to Your Door</p>
            <p className="mt-5 font-semibold">Customer Portal</p>
            <p className="text-blue-100 text-sm">
              តាមដានទំនិញរបស់អ្នក គ្រប់ពេល គ្រប់ទីកន្លែង
            </p>
          </div>
          <Card className="mx-4 -mt-8 p-5 space-y-4">
            <h2 className="font-bold text-lg text-slate-900">
              {mode === "login"
                ? "ចូលគណនី"
                : mode === "signup"
                  ? "បង្កើតគណនី"
                  : "ភ្លេចលេខសម្ងាត់"}
            </h2>
            {mode === "signup" && (
              <Field
                icon={User}
                ph="Full name / ឈ្មោះពេញ"
                v={f.name}
                set={s("name")}
              />
            )}
            {mode === "signup" ? (
              <Field
                icon={Phone}
                ph="Phone number / Phone number"
                v={f.phone}
                set={s("phone")}
              />
            ) : (
              <Field
                icon={Phone}
                ph="Phone number / Phone number"
                v={f.id}
                set={s("id")}
              />
            )}
            {mode === "signup" && (
              <Field
                icon={Mail}
                ph="Email (optional)"
                v={f.email}
                set={s("email")}
              />
            )}
            {mode !== "forgot" && (
              <Field
                icon={Lock}
                pw
                ph="Password / លេខសម្ងាត់"
                v={f.pw}
                set={s("pw")}
              />
            )}
            {err && (
              <p className="text-[13px] text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {err}
              </p>
            )}
            <Btn disabled={busy} onClick={go}>
              {busy
                ? "សូមរង់ចាំ..."
                : mode === "login"
                  ? "Login"
                  : mode === "signup"
                    ? "Sign Up"
                    : "Send reset link"}
            </Btn>
            {mode === "login" && (
              <button
                onClick={() => setMode("forgot")}
                className="w-full text-center text-sm text-blue-700 font-medium"
              >
                Forgot password?
              </button>
            )}
            <p className="text-center text-sm text-slate-500">
              {mode === "signup"
                ? "មានគណនីរួចហើយ?"
                : mode === "login"
                  ? "មិនទាន់មានគណនី?"
                  : "ចាំលេខសម្ងាត់ហើយ?"}{" "}
              <button
                onClick={() =>
                  setMode(
                    mode === "signup" || mode === "forgot" ? "login" : "signup",
                  )
                }
                className="text-blue-700 font-semibold"
              >
                {mode === "login" ? "Sign Up" : "Login"}
              </button>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // ---------- Shell (bottom nav) ----------
  function Shell() {
    const { me, toast, loading } = useApp();
    if (loading)
      return (
        <div
          className="min-h-screen grid place-items-center text-slate-400 text-sm"
          style={FONT}
        >
          Loading...
        </div>
      );
    if (!me) return <Navigate to={P("/login")} replace />;
    const tabs = [
      [P(), Home, "Home"],
      [P("/shipments"), Package, "Shipments"],
      [P("/addresses"), MapPin, "Address"],
      [P("/profile"), User, "Profile"],
    ];
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" style={FONT}>
        <div className="max-w-md mx-auto pb-24 relative">
          <Outlet />
          {toast && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
              {toast}
            </div>
          )}
        </div>
        <nav
          className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="max-w-md mx-auto grid grid-cols-4">
            {tabs.map(([to, I, l]) => (
              <NavLink
                key={to}
                to={to}
                end={to === P()}
                className={({ isActive }) =>
                  `py-2.5 flex flex-col items-center gap-0.5 text-[11px] font-medium ${isActive ? "text-blue-600" : "text-slate-400"}`
                }
              >
                <I size={22} />
                {l}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  // ---------- Shipment row ----------
  function Row({ s }) {
    const nav = useNavigate();
    return (
      <Card
        onClick={() => nav(P("/shipments/" + s.tk))}
        className="p-3.5 flex items-center gap-3 cursor-pointer active:bg-slate-50"
      >
        <Icon i={Package} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <b className="text-[15px] truncate">{s.tk}</b>
            <Badge n={s.step} />
          </div>
          <p className="text-[13px] text-slate-500 truncate">
            {s.shop} · {s.desc}
          </p>
          <p className="text-xs text-slate-400">
            Shipped: {fmtDate(s.createdAt)}
          </p>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </Card>
    );
  }

  // ---------- Home ----------
  function HomePage() {
    const { me, ships } = useApp();
    const nav = useNavigate();
    const [q, setQ] = useState("");
    const cnt = (f) => ships.filter((s) => f(s.step)).length;
    const stats = [
      ["Total", "សរុប", ships.length, "bg-slate-100 text-slate-700", Package],
      [
        "In Transit",
        "កំពុងដឹក",
        cnt((n) => n >= 0 && n <= 1),
        "bg-blue-50 text-blue-600",
        Ship,
      ],
      [
        "Arrived",
        "មកដល់",
        cnt((n) => n === 2 || n === 3),
        "bg-green-50 text-green-600",
        Check,
      ],
      [
        "Ready for Pickup",
        "ត្រៀមយក",
        cnt((n) => n === 4),
        "bg-orange-50 text-orange-500",
        Warehouse,
      ],
      [
        "Completed",
        "បញ្ចប់",
        cnt((n) => n === 5),
        "bg-violet-50 text-violet-600",
        ShieldCheck,
      ],
    ];
    const hit =
      q && ships.filter((s) => s.tk.toLowerCase().includes(q.toLowerCase()));
    return (
      <>
        <header className="bg-blue-600 text-white px-5 pt-6 pb-16 rounded-b-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Hello {me.name} 👋</h1>
              <p className="text-blue-100 text-sm">Welcome to Cargo Bridge</p>
            </div>
            <span className="w-10 h-10 grid place-items-center rounded-full bg-white/15">
              <Bell size={20} />
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 h-12 bg-white rounded-xl px-3.5 text-slate-900">
            <Search size={18} className="text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tracking number"
              className="flex-1 outline-none text-[15px]"
            />
          </div>
        </header>
        <div className="px-4 -mt-9 space-y-5">
          {q ? (
            <div className="space-y-2.5 pt-10">
              {hit.length ? (
                hit.map((s) => <Row key={s.tk} s={s} />)
              ) : (
                <p className="text-center text-sm text-slate-400 py-6">
                  No matching tracking number found in your account.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {stats.map(([l, k, n, c, I], i) => (
                  <Card
                    key={l}
                    className={`p-3.5 flex items-center gap-3 ${i === 0 ? "col-span-2" : ""}`}
                  >
                    <Icon i={I} c={c} />
                    <div>
                      <p className="text-xs text-slate-500">
                        {l} · {k}
                      </p>
                      <p className="text-2xl font-bold leading-tight">{n}</p>
                    </div>
                  </Card>
                ))}
              </div>
              <Card
                onClick={() => nav(P("/warehouse"))}
                className="p-4 flex items-center gap-3 cursor-pointer bg-gradient-to-r from-blue-50 to-white"
              >
                <Icon i={Warehouse} />
                <div className="flex-1">
                  <b className="text-[15px]">My China Warehouse</b>
                  <p className="text-xs text-slate-500">
                    ចម្លងអាសយដ្ឋានឃ្លាំងចិន ផ្ញើទៅអ្នកលក់
                  </p>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </Card>
              <section>
                <div className="flex justify-between items-center mb-2.5">
                  <h2 className="font-bold">Recent Shipments</h2>
                  <button
                    onClick={() => nav(P("/shipments"))}
                    className="text-sm text-blue-600 font-medium"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-2.5">
                  {ships.slice(0, 3).map((s) => (
                    <Row key={s.tk} s={s} />
                  ))}
                </div>
                {!ships.length && (
                  <p className="text-center text-sm text-slate-400 py-6">
                    No shipments yet
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </>
    );
  }

  // ---------- Shipments list ----------
  function Shipments() {
    const { ships } = useApp();
    const [t, setT] = useState("All");
    const tabs = {
      All: () => true,
      "In Transit": (n) => n >= 0 && n <= 1,
      Arrived: (n) => n === 2 || n === 3,
      Ready: (n) => n === 4,
      Completed: (n) => n === 5,
    };
    const list = ships.filter((s) => tabs[t](s.step));
    return (
      <>
        <Top title="My Shipments" />
        <div className="px-4 pt-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.keys(tabs).map((k) => (
              <button
                key={k}
                onClick={() => setT(k)}
                className={`px-4 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap ${t === k ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
              >
                {k}
              </button>
            ))}
          </div>
          {list.map((s) => (
            <Row key={s.tk} s={s} />
          ))}
          {!list.length && (
            <p className="text-center text-sm text-slate-400 py-10">
              No shipments yetក្នុងស្ថានភាពនេះ
            </p>
          )}
        </div>
      </>
    );
  }

  // ---------- Tracking (customer view: status + dates ONLY) ----------
  function Detail() {
    const { tk } = useParams();
    const { ships } = useApp();
    const s = ships.find((x) => x.tk === tk);
    const [reached, setReached] = useState(null); // { "Inbound": iso, "Outbound": iso, ... }
    useEffect(() => {
      if (!supabase || !tk) return;
      supabase
        .from("customer_package_timeline")
        .select("status, reached_at")
        .eq("tk", tk)
        .then(({ data }) =>
          setReached(
            Object.fromEntries(
              (data || []).map((r) => [r.status, r.reached_at]),
            ),
          ),
        );
    }, [tk]);
    if (!s)
      return (
        <>
          <Top title="Shipment Detail" back />
          <p className="text-center text-slate-400 py-16">No shipment found</p>
        </>
      );
    return (
      <>
        <Top title="Shipment Detail" back />
        <div className="px-4 pt-4 space-y-4">
          <Card className="p-4 flex items-center gap-3">
            <Icon i={Package} />
            <div className="flex-1 min-w-0">
              <b>{s.tk}</b>
              <p className="text-[13px] text-slate-500">
                Shop: {s.shop} · {s.desc}
              </p>
            </div>
            <Badge n={s.step} />
          </Card>
          <Card className="p-5">
            <h2 className="font-bold mb-4">Tracking Status</h2>
            {STEPS.map(([en, km], i) => {
              const done = i < s.step || s.step === 5,
                cur = i === s.step && s.step < 5;
              return (
                <div key={en} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${done ? "bg-green-500 text-white" : cur ? "bg-white border-[6px] border-blue-600" : "bg-slate-200"}`}
                    >
                      {done && <Check size={16} strokeWidth={3} />}
                    </span>
                    {i < 5 && (
                      <span
                        className={`w-0.5 flex-1 min-h-[28px] ${done ? "bg-green-400" : "bg-slate-200"}`}
                      />
                    )}
                  </div>
                  <div className="pb-5">
                    <p
                      className={`font-semibold text-[15px] ${cur ? "text-blue-700" : done ? "text-slate-900" : "text-slate-400"}`}
                    >
                      {en} <span className="font-normal text-xs">· {km}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {reached
                        ? fmtDate(reached[en]) === "—"
                          ? "Pending"
                          : fmtDate(reached[en])
                        : "..."}
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
          <p className="flex gap-2 text-xs text-slate-500 bg-blue-50 rounded-xl p-3">
            <Info size={16} className="shrink-0 text-blue-500" />
            Detailed staff and internal information is not visible to customers.
          </p>
        </div>
      </>
    );
  }

  // ---------- China warehouse ----------
  function ChinaWH() {
    const { say } = useApp();
    const [wh, setWh] = useState(undefined); // undefined = loading, null = none assigned
    useEffect(() => {
      if (!supabase) return;
      supabase
        .from("customer_china_warehouse")
        .select("*")
        .maybeSingle()
        .then(({ data }) => setWh(data ?? null));
    }, []);
    if (wh === undefined)
      return (
        <>
          <Top title="My China Warehouse" back />
          <p className="text-center text-slate-400 py-16">Loading...</p>
        </>
      );
    if (!wh)
      return (
        <>
          <Top title="My China Warehouse" back />
          <p className="text-center text-slate-400 py-16">
            មិនទាន់បានកំណត់ឃ្លាំងចិន សូមទាក់ទងផ្នែកជំនួយ
          </p>
        </>
      );
    const rows = [
      ["Receiver Name", wh.recipient_name],
      ["Phone", wh.phone],
      ["Province", wh.province],
      ["City", wh.city],
      ["District", wh.district],
      ["Detailed Address", wh.address],
      ["Customer Code", wh.customer_code],
    ];
    const text = `${wh.recipient_name}\n${wh.phone}\n${wh.province} ${wh.city} ${wh.district}\n${wh.address}\nCustomer Code: ${wh.customer_code}`;
    return (
      <>
        <Top title="My China Warehouse" back />
        <div className="px-4 pt-4 space-y-4">
          <Card className="p-4">
            <p className="text-sm text-slate-500 mb-3">
              ចម្លងអាសយដ្ឋាននេះ ហើយផ្ញើទៅអ្នកលក់ចិនរបស់អ្នក។
            </p>
            <div className="rounded-xl bg-slate-50 divide-y divide-slate-100">
              {rows.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 px-3.5 py-2.5 text-[13px]"
                >
                  <span className="text-slate-500 shrink-0">{k}</span>
                  <span
                    className={`text-right font-semibold ${k === "Customer Code" ? "text-blue-700" : ""}`}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Btn
            onClick={() => {
              copy(text);
              say("បានចម្លងអាសយដ្ឋាន");
            }}
          >
            <Copy size={18} />
            Copy Address
          </Btn>
          <Btn
            ghost
            onClick={() => {
              copy(wh.customer_code);
              say("បានចម្លង Customer Code");
            }}
          >
            <Copy size={18} />
            Copy Customer Code
          </Btn>
          <p className="flex gap-2 text-xs text-slate-600 bg-blue-50 rounded-xl p-3">
            <Info size={16} className="shrink-0 text-blue-500" />
            Copy this address and send it to your Chinese supplier so they can
            ship your goods to our China warehouse. សូមប្រើ Customer Code (
            {wh.customer_code}) ពេលបញ្ជូនទំនិញ។
          </p>
        </div>
      </>
    );
  }

  // ---------- Cambodia addresses ----------
  const EMPTY = {
    label: "",
    name: "",
    phone: "",
    province: "",
    district: "",
    commune: "",
    addr: "",
    note: "",
    branch: "",
  };
  // SQL (run once in Supabase):
  //   alter table customer_addresses add column if not exists kh_branch_code text;
  //   alter table warehouses enable row level security;  -- if not already
  //   create policy "customers read active KH branches" on warehouses
  //     for select to authenticated
  //     using (type = 'cambodia' and status = 'Active');
  // Select from the areas that really have a branch; "Other" lets the
  // customer type a place that has no branch yet.
  function LocPick({ label, value, options, onPick, disabled, ph }) {
    const [other, setOther] = useState(false);
    const typed = other || (value && !options.includes(value));
    const box =
      "w-full h-12 px-3.5 rounded-xl bg-white border border-slate-200 text-[15px] outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400";
    return (
      <label className="block">
        <span className="text-[13px] font-semibold text-slate-700 mb-1.5 block">
          {label}
        </span>
        {typed ? (
          <div className="flex gap-2">
            <input
              value={value}
              onChange={(e) => onPick(e.target.value)}
              placeholder={ph}
              className={box}
            />
            {options.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOther(false);
                  onPick("");
                }}
                className="px-3 rounded-xl border border-slate-200 bg-white text-xs text-blue-600 shrink-0"
              >
                បញ្ជី
              </button>
            )}
          </div>
        ) : (
          <select
            value={value || ""}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value === "__other") {
                setOther(true);
                onPick("");
              } else onPick(e.target.value);
            }}
            className={box}
          >
            <option value="">— ជ្រើសរើស —</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value="__other">ផ្សេងទៀត (វាយខ្លួនឯង)</option>
          </select>
        )}
      </label>
    );
  }
  function Addresses() {
    const { addrs, branches, branchErr, saveAddr, delAddr, setDef, say } =
      useApp();
    const [ed, setEd] = useState(null);
    const [busy, setBusy] = useState(false);
    const [pickBranch, setPickBranch] = useState(false);
    const [bq, setBq] = useState("");
    const branchOf = (code) => branches.find((b) => b.code === code);
    const norm = (x) =>
      String(x || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    const same = (a, b) => norm(a) === norm(b);
    // Branches that serve the chosen area: narrow Province → District →
    // Commune, but never narrow to zero (fall back to the wider level).
    const matchBranches = (loc) => {
      if (!loc.province) return [];
      let m = branches.filter((b) => same(b.province, loc.province));
      if (loc.district) {
        const d = m.filter((b) => same(b.district, loc.district));
        if (d.length) m = d;
      }
      if (loc.commune) {
        const c = m.filter((b) => same(b.commune, loc.commune));
        if (c.length) m = c;
      }
      return m;
    };
    // Change province/district/commune and auto-pick the branch.
    const setLoc = (patch) => {
      const next = { ...ed, ...patch };
      if ("province" in patch) {
        next.district = patch.district ?? "";
        next.commune = patch.commune ?? "";
      } else if ("district" in patch) next.commune = "";
      const m = matchBranches(next);
      if (m.length === 1) next.branch = m[0].code;
      else if (m.length > 1 && !m.some((b) => b.code === next.branch))
        next.branch = "";
      setEd(next);
    };
    const provinces = uniq(branches.map((b) => b.province));
    const districts = uniq(
      branches
        .filter((b) => same(b.province, ed?.province))
        .map((b) => b.district),
    );
    const communes = uniq(
      branches
        .filter(
          (b) =>
            same(b.province, ed?.province) &&
            (!ed?.district || same(b.district, ed.district)),
        )
        .map((b) => b.commune),
    );
    const s = (k) => (v) => setEd({ ...ed, [k]: v });
    return (
      <>
        <Top
          title="My Addresses"
          right={
            <button
              onClick={() => setEd({ ...EMPTY })}
              className="h-9 px-3 rounded-full bg-white text-blue-700 text-sm font-semibold flex items-center gap-1"
            >
              <Plus size={16} />
              Add New
            </button>
          }
        />
        <div className="px-4 pt-4 space-y-3">
          {addrs.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <Icon i={a.label === "Office" ? Warehouse : Home} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <b>{a.label || "Address"}</b>
                    {a.def && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.phone}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {[a.addr, a.commune, a.district, a.province]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {a.branch && (
                    <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                      <Warehouse size={12} />
                      {branchOf(a.branch)?.name || a.branch}
                    </p>
                  )}
                  {a.note && (
                    <p className="text-xs text-slate-400 mt-1">
                      Note: {a.note}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                {!a.def && (
                  <button
                    onClick={() => {
                      setDef(a.id);
                      say("បានកំណត់ជា Default");
                    }}
                    className="text-[13px] font-semibold text-blue-600 mr-auto"
                  >
                    Set as Default
                  </button>
                )}
                <span className="flex-1" />
                <button
                  onClick={() => setEd(a)}
                  className="w-9 h-9 grid place-items-center rounded-full bg-blue-50 text-blue-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() =>
                    window.confirm("លុបអាសយដ្ឋាននេះ?") && delAddr(a.id)
                  }
                  className="w-9 h-9 grid place-items-center rounded-full bg-red-50 text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
          {!addrs.length && (
            <p className="text-center text-sm text-slate-400 py-10">
              មិនទាន់មានអាសយដ្ឋាន — ចុច Add New
            </p>
          )}
        </div>
        {ed && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-50 flex items-end justify-center"
            onClick={() => setEd(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-50 w-full max-w-md rounded-t-3xl p-5 space-y-3 max-h-[92vh] overflow-y-auto"
              style={FONT}
            >
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">
                  {ed.id ? "Edit Address" : "Add Address"}
                </h2>
                <button onClick={() => setEd(null)}>
                  <X size={22} />
                </button>
              </div>
              <Field
                label="Label"
                ph="Home / Office"
                v={ed.label}
                set={s("label")}
              />
              <Field label="Full Name" v={ed.name} set={s("name")} />
              <Field label="Phone Number" v={ed.phone} set={s("phone")} />
              <LocPick
                label="Province"
                value={ed.province}
                options={provinces}
                onPick={(v) => setLoc({ province: v })}
              />
              <LocPick
                label="District"
                value={ed.district}
                options={districts}
                disabled={!ed.province}
                onPick={(v) => setLoc({ district: v })}
              />
              <LocPick
                label="Commune"
                value={ed.commune}
                options={communes}
                disabled={!ed.district}
                onPick={(v) => setLoc({ commune: v })}
              />
              <Field label="Detailed Address" v={ed.addr} set={s("addr")} />
              <div>
                <p className="text-[13px] font-medium text-slate-600 mb-1">
                  Nearby Receiving Warehouse{" "}
                  <span className="text-red-500">*</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setBq("");
                    setPickBranch(true);
                  }}
                  className="w-full min-h-12 px-3 py-2 rounded-xl border border-slate-200 bg-white flex items-center gap-2 text-left"
                >
                  <Warehouse size={18} className="text-slate-400 shrink-0" />
                  <span
                    className={`flex-1 text-sm ${ed.branch ? "text-slate-900" : "text-slate-400"}`}
                  >
                    {ed.branch
                      ? branchOf(ed.branch)?.name || ed.branch
                      : "Select Nearby Warehouse"}
                  </span>
                  <ChevronRight size={18} className="text-slate-400" />
                </button>
                {(() => {
                  const m = matchBranches(ed);
                  if (ed.branch && m.length === 1 && m[0].code === ed.branch)
                    return (
                      <p className="text-[11px] text-green-700 mt-1">
                        ✓ ជ្រើសសាខាដោយស្វ័យប្រវត្តិតាមតំបន់របស់អ្នក
                      </p>
                    );
                  if (!ed.branch && m.length > 1)
                    return (
                      <p className="text-[11px] text-orange-600 mt-1">
                        មាន {m.length} សាខាក្នុងតំបន់នេះ — សូមជ្រើសមួយ
                      </p>
                    );
                  return null;
                })()}
              </div>
              <Field label="Delivery Note" v={ed.note} set={s("note")} />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!ed.def}
                  onChange={(e) => setEd({ ...ed, def: e.target.checked })}
                  className="w-4 h-4"
                />
                Set as Default
              </label>
              <Btn
                disabled={busy || !ed.name || !ed.phone || !ed.branch}
                onClick={async () => {
                  setBusy(true);
                  await saveAddr(ed);
                  setBusy(false);
                  setEd(null);
                  say("បានSave");
                }}
              >
                Save Address
              </Btn>
            </div>
          </div>
        )}
        {ed && pickBranch && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-[60] flex items-end justify-center"
            onClick={() => setPickBranch(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-50 w-full max-w-md rounded-t-3xl p-5 space-y-3 h-[85vh] flex flex-col"
              style={FONT}
            >
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">Select Nearby Warehouse</h2>
                <button onClick={() => setPickBranch(false)}>
                  <X size={22} />
                </button>
              </div>
              <input
                value={bq}
                onChange={(e) => setBq(e.target.value)}
                placeholder="Searchសាខា ឬ ខេត្ត..."
                className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none"
              />
              <div className="flex-1 overflow-y-auto space-y-2">
                {(() => {
                  const k = bq.trim().toLowerCase();
                  const list = branches
                    .filter(
                      (b) =>
                        !k ||
                        [b.name, b.code, b.province, b.district, b.address]
                          .join(" ")
                          .toLowerCase()
                          .includes(k),
                    )
                    // branches serving the customer's area come first
                    .sort((a, b) => {
                      const ids = matchBranches(ed).map((x) => x.code);
                      return ids.includes(b.code) - ids.includes(a.code);
                    });
                  if (!list.length)
                    return (
                      <p className="text-center text-sm text-slate-400 py-10 px-4">
                        {branchErr
                          ? "Unable to load branch list — សូមឱ្យ Admin ត្រួតពិនិត្យ permission លើតារាង warehouses (" +
                            branchErr +
                            ")"
                          : "No active receiving branches available."}
                      </p>
                    );
                  return list.map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => {
                        setEd({ ...ed, branch: b.code });
                        setPickBranch(false);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border flex gap-3 ${
                        ed.branch === b.code
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <span
                        className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 ${
                          ed.branch === b.code
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300"
                        }`}
                      />
                      <span className="min-w-0">
                        <b className="block text-sm">{b.name}</b>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {b.address ||
                            [b.commune, b.district, b.province]
                              .filter(Boolean)
                              .join(", ")}
                        </span>
                      </span>
                    </button>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ---------- Profile ----------
  function Profile() {
    const { me, addrs, logout } = useApp();
    const nav = useNavigate();
    const def = addrs.find((a) => a.def);
    const info = [
      ["Full Name", me.name],
      ["Phone Number", me.phone],
      ["Email", me.email || "—"],
      [
        "Default Address",
        def ? [def.district, def.province].filter(Boolean).join(", ") : "—",
      ],
    ];
    const links = [
      [Warehouse, "My China Warehouse", () => nav(P("/warehouse"))],
      [Lock, "Change Password"],
      [Bell, "Notification Settings"],
      [HelpCircle, "Help & Support"],
    ];
    return (
      <>
        <Top title="Profile" />
        <div className="px-4 pt-5 space-y-4">
          <div className="text-center">
            <span className="w-20 h-20 mx-auto rounded-full bg-blue-600 text-white text-3xl font-bold grid place-items-center">
              {me.name?.[0] || "?"}
            </span>
            <p className="font-bold text-lg mt-2">{me.name}</p>
            <p className="text-xs text-slate-500">
              Customer ID: {me.customer_code || "—"}
            </p>
          </div>
          <Card className="divide-y divide-slate-100">
            {info.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </Card>
          <Card className="divide-y divide-slate-100">
            {links.map(([I, l, fn]) => (
              <button
                key={l}
                onClick={fn}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium"
              >
                <I size={18} className="text-blue-600" />
                <span className="flex-1 text-left">{l}</span>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
            ))}
          </Card>
          <Btn danger onClick={logout}>
            <LogOut size={18} />
            Log Out
          </Btn>
        </div>
      </>
    );
  }

  // ---------- Root ----------
  // Mounted inside the admin App at /customer/* (see App.jsx snippet).
  // It has its own provider + auth check and does NOT use admin Layout.
  function CustomerApp() {
    return (
      <Provider>
        <Routes>
          <Route path="login" element={<Auth />} />
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="shipments" element={<Shipments />} />
            <Route path="shipments/:tk" element={<Detail />} />
            <Route path="warehouse" element={<ChinaWH />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to={P()} replace />} />
        </Routes>
      </Provider>
    );
  }

  return CustomerApp;
})();

// ------------------------------------------------------------
// pages/RoleManagement.jsx — Role list + Permission Matrix
// ------------------------------------------------------------
// Roles are columns, permissions are rows grouped by module (category
// rows). Only Super Admin may edit (role.manage). Super Admin itself is a
// locked system role and is not part of the matrix.
const sameKeys = (a = [], b = []) =>
  a.length === b.length && a.every((k) => b.includes(k));

function GroupCheck({ state, disabled, onChange, title }) {
  return (
    <input
      type="checkbox"
      title={title}
      disabled={disabled}
      checked={state === "all"}
      ref={(el) => {
        if (el) el.indeterminate = state === "some";
      }}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded accent-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

function CreateRoleModal({ open, roles, onClose, onCreate }) {
  const [f, setF] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setF({ scope: "WAREHOUSE", copyFrom: "" });
      setError("");
    }
  }, [open]);
  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    const name = String(f.name || "").trim();
    if (!name) return setError("សូមបញ្ចូលឈ្មោះ Role");
    if (name.toLowerCase() === "customer")
      return setError(
        '"Customer" ជា account របស់អតិថិជន មិនមែន Role បុគ្គលិកទេ',
      );
    if (roles.some((r) => r.name.toLowerCase() === name.toLowerCase()))
      return setError("ឈ្មោះ Role នេះមានរួចហើយ");
    setBusy(true);
    try {
      const src = roles.find((r) => r.name === f.copyFrom);
      await onCreate({
        name,
        level: f.level === "" || f.level == null ? null : Number(f.level),
        scope: f.scope,
        description: f.description || "",
        permissions: src ? src.permissions : [],
      });
      onClose();
    } catch (err) {
      setError(err.message || "មិនអាចបង្កើត Role បានទេ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink-900/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-md shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-mist-200">
          <h3 className="font-display font-bold text-base text-ink-900">
            Create Role
          </h3>
        </div>
        <div className="p-5 space-y-3.5">
          {error && <p className="text-xs text-signal-red">{error}</p>}
          <div>
            <label className={LABEL_CLS}>Role Name</label>
            <input
              autoFocus
              className={INPUT_CLS}
              value={f.name ?? ""}
              onChange={(e) => setF((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Level (hierarchy)</label>
              <input
                type="number"
                min={1}
                className={INPUT_CLS}
                value={f.level ?? ""}
                placeholder="e.g. 5"
                onChange={(e) => setF((v) => ({ ...v, level: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Data Scope</label>
              <select
                className={INPUT_CLS}
                value={f.scope}
                onChange={(e) => setF((v) => ({ ...v, scope: e.target.value }))}
              >
                {ROLE_SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL_CLS}>Copy permissions from</label>
            <select
              className={INPUT_CLS}
              value={f.copyFrom}
              onChange={(e) =>
                setF((v) => ({ ...v, copyFrom: e.target.value }))
              }
            >
              <option value="">— Start empty —</option>
              {roles
                .filter((r) => r.name !== SUPER_ADMIN)
                .map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Description</label>
            <input
              className={INPUT_CLS}
              value={f.description ?? ""}
              onChange={(e) =>
                setF((v) => ({ ...v, description: e.target.value }))
              }
            />
          </div>
          <p className="text-xs text-ink-600/50">
            Level is only for the organization hierarchy — permissions are
            controlled explicitly in the matrix.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-mist-200">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md hover:bg-mist-50"
          >
            Cancel
          </button>
          <button
            disabled={busy}
            className="text-sm font-medium bg-signal-blue text-white px-3.5 py-2 rounded-md disabled:opacity-60"
          >
            Create Role
          </button>
        </div>
      </form>
    </div>
  );
}

function RoleManagementPage() {
  const { user } = useAuth();
  const roles = useRoles();
  const canManage = hasPermission(user, "role.manage");
  const { rows: userRows } = useTableRows("/users", []);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [permQ, setPermQ] = useState("");
  const [draft, setDraft] = useState({}); // roleName -> permission keys (unsaved)
  const [collapsed, setCollapsed] = useState({});
  const [menuFor, setMenuFor] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: ok | warn | err, text }

  useEffect(() => {
    syncRolesFromServer();
  }, []);

  const savedOf = (name) =>
    roles.find((r) => r.name === name)?.permissions ?? [];
  const permsOf = (name) => draft[name] ?? savedOf(name);
  const dirtyNames = Object.keys(draft).filter(
    (n) => roles.some((r) => r.name === n) && !sameKeys(draft[n], savedOf(n)),
  );
  const dirty = dirtyNames.length > 0;

  // Unsaved-changes warning when leaving / reloading the page.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function userCount(name) {
    return (userRows || []).filter(
      (u) => u.role === name && (!dept || u.department === dept),
    ).length;
  }

  const staffRoles = roles.filter((r) => r.name !== SUPER_ADMIN);
  const listRoles = roles.filter(
    (r) =>
      (!q || r.name.toLowerCase().includes(q.toLowerCase())) &&
      (!status || r.status === status),
  );
  const matrixRoles = staffRoles.filter(
    (r) => !roleFilter || r.name === roleFilter,
  );
  const groups = PERMISSION_GROUPS.map((g) => ({
    ...g,
    perms: g.perms.filter(
      ([, label]) =>
        !permQ || label.toLowerCase().includes(permQ.toLowerCase()),
    ),
  })).filter((g) => g.perms.length > 0);

  function setPerms(name, update) {
    if (!canManage) return;
    setDraft((d) => {
      const base = d[name] ?? savedOf(name);
      return { ...d, [name]: [...update(new Set(base))] };
    });
  }

  // Turning an action on also turns on that module's View (so the page can
  // open); turning View off turns the module's other actions off.
  function toggle(name, key) {
    setPerms(name, (set) => {
      const prefix = key.split(".")[0];
      if (set.has(key)) {
        set.delete(key);
        if (key === `${prefix}.view`)
          ALL_PERMISSION_KEYS.forEach((k) => {
            if (k.split(".")[0] === prefix) set.delete(k);
          });
      } else {
        set.add(key);
        if (PERMISSION_LABEL[`${prefix}.view`]) set.add(`${prefix}.view`);
      }
      return set;
    });
  }

  function setMany(name, keys, on) {
    setPerms(name, (set) => {
      keys.forEach((k) => {
        if (on) {
          set.add(k);
          const v = `${k.split(".")[0]}.view`;
          if (PERMISSION_LABEL[v]) set.add(v);
        } else set.delete(k);
      });
      return set;
    });
  }

  async function run(fn, okText) {
    setMsg(null);
    try {
      const res = await fn();
      if (res?.error)
        setMsg({
          type: "warn",
          text: `Saved in this browser only — Supabase: ${res.error.message}. Run the roles SQL (see lib/permissions.js) so every user gets the change.`,
        });
      else if (res?.local)
        setMsg({
          type: "ok",
          text: `${okText} (demo mode — saved in this browser)`,
        });
      else setMsg({ type: "ok", text: okText });
      return true;
    } catch (err) {
      setMsg({ type: "err", text: err.message || NO_PERM_MSG });
      return false;
    }
  }

  async function saveChanges() {
    setSaving(true);
    const ok = await run(async () => {
      requirePermission(
        user,
        "role.manage",
        "មានតែ Super Admin ទេដែលអាចកែ Role",
      );
      const cur = loadRoles();
      const next = cur.map((r) =>
        r.name !== SUPER_ADMIN && draft[r.name]
          ? normalizeRole({ ...r, permissions: draft[r.name] })
          : r,
      );
      commitRoles(next); // takes effect for every user of the role right away
      return persistRoles(next.filter((r) => dirtyNames.includes(r.name)));
    }, `Saveសិទ្ធិរបស់ ${dirtyNames.length} Role រួចរាល់`);
    if (ok) setDraft({});
    setSaving(false);
  }

  function cancelChanges() {
    setDraft({});
    setMsg(null);
  }

  function updateMeta(name, patch) {
    return run(async () => {
      requirePermission(
        user,
        "role.manage",
        "មានតែ Super Admin ទេដែលអាចកែ Role",
      );
      const next = loadRoles().map((r) =>
        r.name === name ? normalizeRole({ ...r, ...patch }) : r,
      );
      commitRoles(next);
      return persistRoles(next.filter((r) => r.name === name));
    }, "បានកែ Role");
  }

  function toggleStatus(r) {
    const next = r.status === "Active" ? "Inactive" : "Active";
    const n = userCount(r.name);
    if (
      next === "Inactive" &&
      n > 0 &&
      !window.confirm(
        `${n} user កំពុងប្រើ Role "${r.name}" — Closeវាធ្វើឱ្យ user ទាំងនោះបាត់សិទ្ធិAll។ បន្ត?`,
      )
    )
      return;
    updateMeta(r.name, { status: next });
  }

  async function removeRole(r) {
    if (userCount(r.name) > 0)
      return setMsg({
        type: "err",
        text: `មិនអាចលុប "${r.name}" បានទេ — នៅមាន user កំពុងប្រើ`,
      });
    if (!window.confirm(`លុប Role "${r.name}"?`)) return;
    run(async () => {
      requirePermission(
        user,
        "role.manage",
        "មានតែ Super Admin ទេដែលអាចកែ Role",
      );
      commitRoles(loadRoles().filter((x) => x.name !== r.name));
      setDraft((d) => {
        const { [r.name]: _drop, ...rest } = d;
        return rest;
      });
      if (!supabase) return { error: null, local: true };
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("name", r.name);
      return { error };
    }, `បានលុប Role "${r.name}"`);
  }

  async function createRole(values) {
    requirePermission(user, "role.manage", "មានតែ Super Admin ទេដែលអាចកែ Role");
    const role = normalizeRole(values);
    commitRoles([...loadRoles(), role]);
    const res = await persistRoles([role]);
    setMsg(
      res?.error
        ? {
            type: "warn",
            text: `បង្កើត "${role.name}" តែក្នុង browser នេះ — ${res.error.message}`,
          }
        : { type: "ok", text: `បានបង្កើត Role "${role.name}"` },
    );
  }

  const th =
    "sticky top-0 z-20 bg-mist-50 border-b border-mist-200 px-3 py-3 text-center font-semibold text-ink-900 whitespace-nowrap";
  const msgCls = {
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    err: "bg-signal-red/10 text-signal-red",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-xl text-ink-900">
            Role Management
          </h1>
          <p className="text-sm text-ink-600/55 mt-0.5">
            Role = អ្វីដែល user ធ្វើបាន · Department / Warehouse = ធ្វើបាននៅទីណា
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90"
          >
            <Plus size={16} />
            Create Role
          </button>
        )}
      </div>

      {!canManage && (
        <div className="flex items-center gap-2 text-sm text-ink-700 bg-mist-100 rounded-md px-3 py-2">
          <Icons.Lock size={14} />
          View only — មានតែ Super Admin ទេដែលអាចកែ Role និង Permission។
        </div>
      )}
      {msg && (
        <div
          className={`flex items-start gap-2 text-sm rounded-md px-3 py-2 ${msgCls[msg.type]}`}
        >
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          {msg.text}
        </div>
      )}
      {canManage && supabase && rolesStore.server === false && (
        <div className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
          តារាង `roles` មិនទាន់មានក្នុង Supabase — ការកែនឹងមានតែក្នុង browser
          នេះ។ សូមរត់ SQL នៅ lib/permissions.js។
        </div>
      )}

      {/* ---------- Filters ---------- */}
      <div className="bg-white border border-mist-200 rounded-md p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-600/40"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search role"
            className={`${INPUT_CLS} pl-8`}
          />
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className={`${INPUT_CLS} !w-auto`}
          title="Count users of this department"
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${INPUT_CLS} !w-auto`}
        >
          <option value="">All status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* ---------- Role list ---------- */}
      <div className="bg-white border border-mist-200 rounded-md overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-mist-50 text-left text-xs uppercase tracking-wide text-ink-600/55">
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-3 py-2.5 font-semibold">Level</th>
              <th className="px-3 py-2.5 font-semibold">Data Scope</th>
              <th className="px-3 py-2.5 font-semibold">Users</th>
              <th className="px-3 py-2.5 font-semibold">Permissions</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {listRoles.map((r) => {
              const isSuper = r.name === SUPER_ADMIN;
              return (
                <tr key={r.name} className="border-t border-mist-200">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 font-semibold text-ink-900">
                      {isSuper && (
                        <Icons.Lock size={13} className="text-ink-600/50" />
                      )}
                      {r.name}
                      {isSuper && (
                        <span className="text-[10px] font-semibold uppercase bg-ink-900 text-white rounded px-1.5 py-0.5">
                          System
                        </span>
                      )}
                      {r.legacy && (
                        <span className="text-[10px] font-semibold uppercase bg-mist-100 text-ink-600 rounded px-1.5 py-0.5">
                          Legacy
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <div className="text-xs text-ink-600/50 mt-0.5">
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-ink-800">
                    {r.level == null ? "—" : `Level ${r.level}`}
                  </td>
                  <td className="px-3 py-2.5">
                    {isSuper || !canManage ? (
                      <span title={SCOPE_HINT[r.scope]}>{r.scope}</span>
                    ) : (
                      <select
                        value={r.scope}
                        title={SCOPE_HINT[r.scope]}
                        onChange={(e) =>
                          updateMeta(r.name, { scope: e.target.value })
                        }
                        className="border border-mist-200 rounded-md px-2 py-1 text-xs bg-white"
                      >
                        {ROLE_SCOPES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-ink-800">
                    {userCount(r.name)}
                  </td>
                  <td className="px-3 py-2.5 text-ink-800">
                    {isSuper ? (
                      "Full access"
                    ) : (
                      <>
                        {permsOf(r.name).length} / {ALL_PERMISSION_KEYS.length}
                        {dirtyNames.includes(r.name) && (
                          <span className="ml-1.5 text-[10px] font-semibold text-amber-600">
                            UNSAVED
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                        r.status === "Active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-mist-100 text-ink-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {!isSuper && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRoleFilter(r.name);
                            document
                              .getElementById("permission-matrix")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="text-xs font-medium text-signal-blue px-2 py-1 rounded hover:bg-mist-50"
                        >
                          {canManage ? "Edit permissions" : "View permissions"}
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleStatus(r)}
                              className="text-xs font-medium text-ink-700 px-2 py-1 rounded hover:bg-mist-50"
                            >
                              {r.status === "Active" ? "Disable" : "Enable"}
                            </button>
                            {!r.system && (
                              <button
                                type="button"
                                title="Delete role"
                                onClick={() => removeRole(r)}
                                className="p-1.5 rounded-md text-ink-600/50 hover:text-signal-red hover:bg-signal-red/5 align-middle"
                              >
                                <Icons.Trash2 size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {listRoles.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-ink-600/50"
                >
                  រកមិនឃើញ Role ទេ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- Permission matrix ---------- */}
      <div
        id="permission-matrix"
        className="bg-white border border-mist-200 rounded-md"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap p-3 border-b border-mist-200">
          <div>
            <h2 className="font-display font-bold text-base text-ink-900">
              Permission Matrix
              {roleFilter && (
                <span className="font-normal text-ink-600/60">
                  {" "}
                  — Edit Role: {roleFilter}
                </span>
              )}
            </h2>
            <p className="text-xs text-ink-600/50 mt-0.5">
              Super Admin មានសិទ្ធិគ្រប់យ៉ាងជានិច្ច ហើយមិនត្រូវបានគ្រប់គ្រងក្នុង
              matrix នេះទេ។
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-600/40"
              />
              <input
                value={permQ}
                onChange={(e) => setPermQ(e.target.value)}
                placeholder="Search permission"
                className={`${INPUT_CLS} !w-48 pl-7`}
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`${INPUT_CLS} !w-auto`}
            >
              <option value="">All roles</option>
              {staffRoles.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            {canManage && (
              <>
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={cancelChanges}
                  className="text-sm font-medium text-ink-700 px-3.5 py-2 rounded-md border border-mist-200 hover:bg-mist-50 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={saveChanges}
                  className="flex items-center gap-1.5 bg-signal-blue text-white text-sm font-medium px-3.5 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-40"
                >
                  <Icons.Save size={14} />
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>

        {dirty && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 border-b border-mist-200">
            <TriangleAlert size={13} />
            មាន Unsaved changes ({dirtyNames.join(", ")}) — ចុច Save Changes
            ដើម្បីអនុវត្តលើ user Allនៃ Role នោះ។
          </div>
        )}

        <div
          className="overflow-auto max-h-[70vh]"
          onClick={() => setMenuFor(null)}
        >
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  className={`${th} left-0 z-30 min-w-[280px] text-left !px-4 border-r border-mist-200`}
                >
                  Permissions
                </th>
                {matrixRoles.map((r) => (
                  <th key={r.name} className={`${th} min-w-[150px]`}>
                    <div className="relative inline-block">
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuFor(menuFor === r.name ? null : r.name);
                        }}
                        className={`inline-flex items-center gap-1 ${
                          r.status === "Active" ? "" : "opacity-50"
                        }`}
                      >
                        {r.name}
                        {canManage && <ChevronDown size={13} />}
                      </button>
                      <div className="text-[10px] font-normal text-ink-600/50">
                        {r.level == null ? "Legacy" : `Level ${r.level}`}
                        {r.status !== "Active" && " · Inactive"}
                      </div>
                      {menuFor === r.name && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-40 bg-white border border-mist-200 rounded-md shadow-lg py-1 w-36 text-left"
                        >
                          <button
                            type="button"
                            className="block w-full text-left text-xs px-3 py-1.5 hover:bg-mist-50"
                            onClick={() => {
                              setMany(r.name, ALL_PERMISSION_KEYS, true);
                              setMenuFor(null);
                            }}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="block w-full text-left text-xs px-3 py-1.5 hover:bg-mist-50"
                            onClick={() => {
                              setMany(r.name, ALL_PERMISSION_KEYS, false);
                              setMenuFor(null);
                            }}
                          >
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const keys = g.perms.map((p) => p[0]);
                const open = !collapsed[g.key];
                return (
                  <React.Fragment key={g.key}>
                    <tr>
                      <td className="sticky left-0 z-10 bg-mist-100 border-b border-r border-mist-200 px-4 py-2 font-display font-bold text-ink-900">
                        <button
                          type="button"
                          className="flex items-center gap-1.5"
                          onClick={() =>
                            setCollapsed((c) => ({ ...c, [g.key]: open }))
                          }
                        >
                          {open ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          {g.label}
                        </button>
                      </td>
                      {matrixRoles.map((r) => {
                        const have = keys.filter((k) =>
                          permsOf(r.name).includes(k),
                        );
                        const state =
                          have.length === 0
                            ? "none"
                            : have.length === keys.length
                              ? "all"
                              : "some";
                        return (
                          <td
                            key={r.name}
                            className="bg-mist-100 border-b border-mist-200 text-center"
                          >
                            <GroupCheck
                              state={state}
                              disabled={!canManage}
                              title={`${g.label} — all`}
                              onChange={(on) => setMany(r.name, keys, on)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    {open &&
                      g.perms.map(([key, label]) => (
                        <tr key={key} className="group">
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-mist-50 border-b border-r border-mist-200 pl-9 pr-4 py-2 text-ink-800">
                            {label}
                          </td>
                          {matrixRoles.map((r) => {
                            const on = permsOf(r.name).includes(key);
                            const changed =
                              on !== savedOf(r.name).includes(key);
                            return (
                              <td
                                key={r.name}
                                className={`border-b border-mist-200 text-center group-hover:bg-mist-50 ${
                                  changed ? "bg-amber-50" : "bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  disabled={!canManage}
                                  onChange={() => toggle(r.name, key)}
                                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
              {groups.length === 0 && (
                <tr>
                  <td
                    colSpan={matrixRoles.length + 1}
                    className="px-4 py-8 text-center text-ink-600/50"
                  >
                    រកមិនឃើញ Permission ទេ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateRoleModal
        open={createOpen}
        roles={roles}
        onClose={() => setCreateOpen(false)}
        onCreate={createRole}
      />
    </div>
  );
}

// ------------------------------------------------------------
// pages/ProcessTrackingPage.jsx
// ------------------------------------------------------------
// End-to-end TK tracking view restored alongside Scan Center.
// Search a shared package registry record, inspect its journey timeline,
// recent activity, and open the detailed package / scan workflows.
function ProcessTrackingPage() {
  const { user } = useAuth();
  const { packages, getTimeline, getHistory, ready } = usePackageTracking();
  const [query, setQuery] = useState("");
  const [selectedTk, setSelectedTk] = useState("");

  const canView =
    hasPermission(user, "tk.view") || hasPermission(user, "tk.scan");

  const matches = React.useMemo(() => {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => {
      const haystack = [
        p.tk,
        p.order_no,
        p.order_id,
        p.customer,
        p.customer_name,
        p.container_no,
        p.container,
        p.branch,
        p.receiving_branch,
        p.receivingBranch,
        p.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [packages, query]);

  useEffect(() => {
    if (!selectedTk || !matches.some((p) => p.tk === selectedTk)) {
      setSelectedTk(matches[0]?.tk || "");
    }
  }, [matches, selectedTk]);

  const selected = matches.find((p) => p.tk === selectedTk) || null;
  const timeline = selected ? getTimeline(selected.tk) : [];
  const history = selected
    ? [...getHistory(selected.tk)].reverse().slice(0, 8)
    : [];
  const currentIndex = Math.max(
    0,
    PACKAGE_STAGES.indexOf(selected?.status || ""),
  );

  const stageCount = (status) =>
    packages.filter((p) => p.status === status).length;

  if (!canView) {
    return (
      <div className="bg-white border border-mist-200 rounded-md shadow-panel p-10 text-center">
        <Icons.LockKeyhole size={28} className="mx-auto text-ink-600/25 mb-3" />
        <h1 className="font-display font-bold text-lg text-ink-900">
          Process Tracking
        </h1>
        <p className="text-sm text-ink-600/55 mt-1">
          You do not have permission to view package tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-signal-blue/10 text-signal-blue flex items-center justify-center">
              <Icons.Route size={19} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-ink-900">
                Process Tracking
              </h1>
              <p className="text-sm text-ink-600/55">
                Follow a TK from Inbound Origin through delivery completion.
              </p>
            </div>
          </div>
        </div>
        <Link
          to="/scan-center"
          className="inline-flex items-center gap-2 bg-signal-blue text-white text-sm font-semibold px-3.5 py-2.5 rounded-md hover:bg-signal-blue/90"
        >
          <ScanLine size={15} /> Scan TK
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {PACKAGE_STAGES.map((stage, i) => (
          <div
            key={stage}
            className="bg-white border border-mist-200 rounded-md shadow-panel px-4 py-3"
          >
            <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-600/45">
              {stage}
            </div>
            <div className="text-xl font-bold text-ink-900 mt-1">
              {stageCount(stage).toLocaleString("en-US")}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5 items-start">
        <div className="bg-white border border-mist-200 rounded-md shadow-panel overflow-hidden lg:sticky lg:top-5">
          <div className="px-4 py-4 border-b border-mist-200">
            <div className="flex items-center gap-2 border border-mist-200 rounded-md px-3 py-2 focus-within:border-signal-blue">
              <Search size={15} className="text-ink-600/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search TK, order, customer, container..."
                className="flex-1 min-w-0 outline-none bg-transparent text-sm"
              />
            </div>
            <div className="text-xs text-ink-600/45 mt-2">
              {ready
                ? `${matches.length} package${matches.length === 1 ? "" : "s"}`
                : "Loading packages..."}
            </div>
          </div>
          <div className="max-h-[620px] overflow-y-auto divide-y divide-mist-100">
            {!matches.length ? (
              <div className="px-5 py-12 text-center text-sm text-ink-600/45">
                No matching packages.
              </div>
            ) : (
              matches.map((p) => (
                <button
                  type="button"
                  key={p.tk}
                  onClick={() => setSelectedTk(p.tk)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-mist-50 transition-colors ${selectedTk === p.tk ? "bg-signal-blue/5 border-l-2 border-signal-blue" : "border-l-2 border-transparent"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-bold text-ink-900 truncate">
                      {p.tk}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-mist-100 text-ink-600/60 whitespace-nowrap">
                      {p.status || "Inbound Origin"}
                    </span>
                  </div>
                  <div className="text-xs text-ink-600/55 mt-1 truncate">
                    {p.customer || p.customer_name || "Unknown customer"}
                  </div>
                  <div className="text-[11px] text-ink-600/40 mt-1 truncate">
                    Order {p.order_no || p.order_id || "—"} · Container{" "}
                    {p.container_no || p.container || "—"}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          {!selected ? (
            <div className="bg-white border border-mist-200 rounded-md shadow-panel px-6 py-16 text-center">
              <Icons.Route size={32} className="mx-auto text-ink-600/20 mb-3" />
              <h2 className="text-sm font-semibold text-ink-900">
                Select a package
              </h2>
              <p className="text-sm text-ink-600/45 mt-1">
                Choose a TK from the list to view its complete process journey.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-mist-200 rounded-md shadow-panel overflow-hidden">
                <div className="px-5 py-4 border-b border-mist-200 flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-ink-900">
                        {selected.tk}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-signal-blue/10 text-signal-blue">
                        {selected.status || "Inbound Origin"}
                      </span>
                    </div>
                    <p className="text-sm text-ink-600/55 mt-1">
                      {selected.customer ||
                        selected.customer_name ||
                        "Unknown customer"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/packages/${encodeURIComponent(selected.tk)}`}
                      className="inline-flex items-center gap-1.5 border border-mist-200 text-ink-800 text-sm font-semibold px-3 py-2 rounded-md hover:bg-mist-50"
                    >
                      <Eye size={15} /> Package Details
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
                  {[
                    [
                      "Customer",
                      selected.customer || selected.customer_name || "—",
                    ],
                    ["Order", selected.order_no || selected.order_id || "—"],
                    [
                      "Container",
                      selected.container_no || selected.container || "—",
                    ],
                    [
                      "Receiving Branch",
                      selected.branch ||
                        selected.receiving_branch ||
                        selected.receivingBranch ||
                        "—",
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg bg-mist-50 border border-mist-200 p-3"
                    >
                      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-600/45">
                        {label}
                      </div>
                      <div
                        className="text-sm font-semibold text-ink-900 mt-1 truncate"
                        title={String(value)}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-ink-900">
                      Package Journey
                    </h2>
                    <p className="text-xs text-ink-600/50 mt-0.5">
                      Current stage:{" "}
                      {selected.status || PACKAGE_STAGES[currentIndex]}
                    </p>
                  </div>
                  <span className="text-xs text-ink-600/45">
                    Step {currentIndex + 1} of {PACKAGE_STAGES.length}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-mist-200" />
                  <div className="space-y-5">
                    {timeline.map((step, i) => (
                      <div
                        key={`${step.label}-${i}`}
                        className="relative flex items-start gap-3"
                      >
                        <div
                          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${step.state === "done" ? "bg-signal-teal text-white border-signal-teal" : step.state === "active" ? "bg-signal-blue text-white border-signal-blue" : "bg-white text-ink-600/30 border-mist-200"}`}
                        >
                          {step.state === "done" ? (
                            <Check size={14} />
                          ) : (
                            <span className="text-[11px] font-bold">
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <div className="text-sm font-semibold text-ink-900">
                            {step.label}
                          </div>
                          <div className="text-xs text-ink-600/45 mt-0.5">
                            {step.time
                              ? formatIso(step.time)
                              : step.state === "pending"
                                ? "Pending"
                                : "In progress"}
                            {step.proceedBy ? ` · ${step.proceedBy}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-ink-900">
                      Activity History
                    </h2>
                    <p className="text-xs text-ink-600/50 mt-0.5">
                      Latest events recorded for this TK.
                    </p>
                  </div>
                  <History size={17} className="text-ink-600/35" />
                </div>
                {history.length ? (
                  <div className="divide-y divide-mist-200">
                    {history.map((h, i) => (
                      <div
                        key={`${h.at}-${i}`}
                        className="py-3 flex items-start gap-3"
                      >
                        <div className="w-7 h-7 rounded-full bg-mist-100 flex items-center justify-center shrink-0">
                          <Check size={13} className="text-signal-teal" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink-900">
                              {h.status}
                            </span>
                            <span className="text-xs text-ink-600/40">
                              {h.user || "System"}
                            </span>
                          </div>
                          <div className="text-xs text-ink-600/45 mt-0.5">
                            {h.at ? formatIso(h.at) : "—"}
                            {h.remark ? ` · ${h.remark}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-ink-600/45 py-5 text-center">
                    No activity history yet.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// pages/ScanCenterPage.jsx
// ------------------------------------------------------------
// Central operator scan flow:
// Scan TK -> identify the shared package record -> review current status
// -> confirm the next explicit scan action -> write status/history.
// This page deliberately never changes a TK just because a container arrived.
// A TK changes here only after the operator scans and confirms that TK.
function ScanCenterPage() {
  const { user } = useAuth();
  const { packages, findPackage, getHistory, syncTimelineToStatus, ready } =
    usePackageTracking();
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState(null);
  const [phase, setPhase] = useState("idle");
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const canScan = hasPermission(user, "tk.scan");
  const canProcess =
    hasPermission(user, "tk.process") || hasPermission(user, "tk.scan");

  useEffect(() => {
    inputRef.current?.focus();
    return () => clearTimeout(timerRef.current);
  }, []);

  const stageIndex = (status) => PACKAGE_STAGES.indexOf(status);
  const nextStageFor = (pkg) => {
    if (!pkg) return null;
    const current = pkg.status || "Inbound Origin";
    const idx = stageIndex(current);
    if (idx < 0 || idx >= PACKAGE_STAGES.length - 1) return null;
    return PACKAGE_STAGES[idx + 1];
  };

  const actionMeta = (pkg) => {
    if (!pkg) return null;
    const next = nextStageFor(pkg);
    if (!next) return { label: "Completed", tone: "done", disabled: true };
    if (pkg.status === "Inbound Origin") {
      const containerNo = pkg.container_no || pkg.container || "";
      if (!containerNo) {
        return {
          label: "Outbound Origin",
          tone: "blocked",
          disabled: true,
          note: "Container Number is required before this TK can leave Inbound Origin.",
        };
      }
    }
    if (VERIFY_GATED_STAGES[pkg.status]) {
      return {
        label: next,
        tone: "waiting",
        disabled: true,
        note: VERIFY_GATED_STAGES[pkg.status].note,
      };
    }
    return { label: next, tone: "ready", disabled: false };
  };

  function lookup(raw) {
    const tk = String(raw || "").trim();
    if (!tk) return;
    clearTimeout(timerRef.current);
    setPhase("scanning");
    const pkg = findPackage(tk);
    if (!pkg) {
      setSelected(null);
      setNotice({ type: "error", text: `TK "${tk}" was not found.` });
      setPhase("error");
      setValue("");
      inputRef.current?.focus();
      return;
    }
    setSelected(pkg);
    setValue("");
    setNotice(null);
    setPhase("success");
    inputRef.current?.focus();
  }

  function onInput(e) {
    const v = e.target.value;
    setValue(v);
    if (!v.trim()) {
      setPhase("idle");
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => lookup(v), 300);
  }

  async function confirmNext() {
    if (!selected || confirming || !canProcess) return;
    const meta = actionMeta(selected);
    if (!meta || meta.disabled) return;
    const next = meta.label;
    setConfirming(true);
    try {
      await syncTimelineToStatus(
        selected.tk,
        next,
        user?.name || "Operator",
        `Scan Center confirmation: ${selected.tk}`,
      );
      const updated = findPackage(selected.tk) || { ...selected, status: next };
      setSelected(updated);
      setNotice({
        type: "success",
        text: `${selected.tk} verified and moved to ${next}.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        text: err?.message || "The scan could not be confirmed.",
      });
    } finally {
      setConfirming(false);
      inputRef.current?.focus();
    }
  }

  const history = selected
    ? [...getHistory(selected.tk)].reverse().slice(0, 8)
    : [];
  const meta = actionMeta(selected);
  const customerText = selected?.customer || selected?.customer_name || "—";
  const orderText =
    selected?.order_no || selected?.order || selected?.orderNo || "—";
  const containerText = selected?.container_no || selected?.container || "—";
  const branchText =
    selected?.branch ||
    selected?.receiving_branch ||
    selected?.receivingBranch ||
    "—";
  const weightText =
    selected?.weight_kg != null
      ? `${selected.weight_kg} kg`
      : selected?.weight
        ? `${selected.weight} kg`
        : "—";
  const cbmText = selected?.cbm != null ? selected.cbm : "—";

  const statusClass = {
    ready: "bg-signal-blue/10 text-signal-blue",
    blocked: "bg-amber-50 text-amber-700",
    waiting: "bg-amber-50 text-amber-700",
    done: "bg-signal-teal/10 text-signal-teal",
  }[meta?.tone || "ready"];

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-signal-blue/10 text-signal-blue flex items-center justify-center">
            <ScanLine size={19} />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ink-900">
              Scan Center
            </h1>
            <p className="text-sm text-ink-600/55">
              Scan a TK, verify the package, and record the next confirmed
              movement.
            </p>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${notice.type === "success" ? "bg-signal-teal/10 border-signal-teal/25 text-signal-teal" : "bg-signal-red/10 border-signal-red/25 text-signal-red"}`}
        >
          {notice.type === "success" ? (
            <Check size={15} />
          ) : (
            <TriangleAlert size={15} />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <div className="space-y-5">
          <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">
                  Scan Tracking Number
                </h2>
                <p className="text-xs text-ink-600/50 mt-0.5">
                  Use a barcode scanner or type a TK manually.
                </p>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full ${phase === "success" ? "bg-signal-teal/10 text-signal-teal" : phase === "error" ? "bg-signal-red/10 text-signal-red" : "bg-mist-100 text-ink-600/55"}`}
              >
                {phase === "success"
                  ? "Verified"
                  : phase === "error"
                    ? "Not Found"
                    : "Ready to scan"}
              </span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookup(value);
              }}
            >
              <div className="flex items-center gap-3 border-2 border-mist-200 rounded-lg px-4 py-3.5 focus-within:border-signal-blue focus-within:ring-4 focus-within:ring-signal-blue/5">
                <ScanLine size={20} className="text-signal-blue shrink-0" />
                <input
                  ref={inputRef}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  value={value}
                  onChange={onInput}
                  disabled={!canScan || !ready}
                  placeholder="Scan or enter TK number…"
                  className="flex-1 min-w-0 outline-none text-base font-medium bg-transparent placeholder:font-normal placeholder:text-ink-600/35"
                />
                <button
                  type="submit"
                  disabled={!value.trim() || !canScan || !ready}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-signal-blue text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-signal-blue/90 disabled:opacity-40"
                >
                  <Search size={15} /> Verify
                </button>
              </div>
            </form>
            {!canScan && (
              <p className="text-xs text-signal-red mt-2">
                You do not have permission to scan TKs.
              </p>
            )}
          </div>

          <div className="bg-white border border-mist-200 rounded-md shadow-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-mist-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink-900">
                  Package Information
                </h2>
                <p className="text-xs text-ink-600/50 mt-0.5">
                  The package record is identified by TK — no customer phone
                  entry is required.
                </p>
              </div>
              {selected && (
                <span className="text-xs font-mono font-semibold text-ink-700 bg-mist-100 px-2 py-1 rounded">
                  {selected.tk}
                </span>
              )}
            </div>
            {!selected ? (
              <div className="px-5 py-14 text-center text-ink-600/40">
                <Package size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">
                  Scan a TK to load package details
                </p>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ["Customer", customerText],
                    ["Order", orderText],
                    ["Container", containerText],
                    ["Receiving Branch", branchText],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg bg-mist-50 border border-mist-200 p-3"
                    >
                      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-600/45">
                        {k}
                      </div>
                      <div
                        className="text-sm font-semibold text-ink-900 mt-1 truncate"
                        title={String(v)}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-mist-200 pt-4">
                  <span className="text-xs font-semibold text-ink-600/50 uppercase tracking-wide">
                    Current Status
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-signal-blue/10 text-signal-blue text-xs font-semibold">
                    <Circle size={8} fill="currentColor" />{" "}
                    {selected.status || "Unknown"}
                  </span>
                  <span className="text-xs text-ink-600/45">
                    Weight: {weightText} · CBM: {cbmText}
                  </span>
                </div>
              </div>
            )}
          </div>

          {selected && (
            <div className="bg-white border border-mist-200 rounded-md shadow-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">
                    Recent Activity
                  </h2>
                  <p className="text-xs text-ink-600/50 mt-0.5">
                    Latest status events recorded for this TK.
                  </p>
                </div>
                <History size={17} className="text-ink-600/35" />
              </div>
              {history.length ? (
                <div className="divide-y divide-mist-200">
                  {history.map((h, i) => (
                    <div
                      key={`${h.at}-${i}`}
                      className="py-3 flex items-start gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-mist-100 flex items-center justify-center shrink-0">
                        <Check size={13} className="text-signal-teal" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink-900">
                            {h.status}
                          </span>
                          <span className="text-xs text-ink-600/40">
                            {h.user || "System"}
                          </span>
                        </div>
                        <div className="text-xs text-ink-600/45 mt-0.5">
                          {h.at ? formatIso(h.at) : "—"}
                          {h.remark ? ` · ${h.remark}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-ink-600/45 py-5 text-center">
                  No activity history yet.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-mist-200 rounded-md shadow-panel overflow-hidden xl:sticky xl:top-5">
          <div className="px-5 py-4 border-b border-mist-200">
            <h2 className="text-sm font-semibold text-ink-900">Next Action</h2>
            <p className="text-xs text-ink-600/50 mt-0.5">
              Confirm only after the physical TK scan is verified.
            </p>
          </div>
          <div className="p-5">
            {!selected ? (
              <div className="py-10 text-center">
                <ScanLine size={30} className="mx-auto text-ink-600/20 mb-3" />
                <p className="text-sm font-medium text-ink-600/55">
                  Waiting for TK scan
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-lg px-4 py-4 ${statusClass}`}>
                  <div className="text-[11px] uppercase tracking-wide font-semibold opacity-70">
                    Next Available Action
                  </div>
                  <div className="text-lg font-bold mt-1">
                    {meta?.label || "—"}
                  </div>
                  {meta?.note && (
                    <p className="text-xs mt-2 leading-5 opacity-80">
                      {meta.note}
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-600/50">TK</span>
                    <span className="font-semibold text-ink-900">
                      {selected.tk}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-600/50">Current</span>
                    <span className="font-semibold text-ink-900">
                      {selected.status || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-600/50">Next</span>
                    <span className="font-semibold text-ink-900">
                      {meta?.label || "—"}
                    </span>
                  </div>
                </div>
                {meta?.tone === "blocked" &&
                selected.status === "Inbound Origin" ? (
                  <Link
                    to={`/outbound-origin?tk=${encodeURIComponent(selected.tk)}`}
                    className="w-full inline-flex justify-center items-center gap-2 border border-mist-200 text-ink-800 text-sm font-semibold px-4 py-2.5 rounded-md hover:bg-mist-50"
                  >
                    <ArrowRight size={15} /> Open Outbound Origin
                  </Link>
                ) : (
                  <button
                    onClick={confirmNext}
                    disabled={meta?.disabled || confirming || !canProcess}
                    className="w-full inline-flex justify-center items-center gap-2 bg-signal-blue text-white text-sm font-semibold px-4 py-2.5 rounded-md hover:bg-signal-blue/90 disabled:opacity-40"
                  >
                    {confirming ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    {confirming ? "Confirming…" : "Confirm Scan"}
                  </button>
                )}
                {!canProcess && (
                  <p className="text-xs text-ink-600/45 text-center">
                    View only — your role cannot confirm this scan.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// pages/Placeholder.jsx
// ------------------------------------------------------------
function Placeholder({ title }) {
  return (
    <div className="h-[70vh] flex flex-col items-center justify-center text-center bg-white border border-dashed border-mist-200 rounded-md">
      <div className="w-12 h-12 rounded-full bg-ink-900/5 text-ink-700 flex items-center justify-center mb-3">
        <Construction size={22} />
      </div>
      <h2 className="font-display font-bold text-ink-900">{title}</h2>
      <p className="text-sm text-ink-600/55 mt-1 max-w-xs">
        Module នេះកំពុងត្រូវបានអភិវឌ្ឍ។ Layout និង Dashboard
        ត្រូវបានបញ្ចប់ជាPreviousសិន។
      </p>
    </div>
  );
}

// ------------------------------------------------------------
// App.jsx
// ------------------------------------------------------------
// Every nav item except Dashboard gets its module config rendered as a
// ListPage (filter bar + table). Anything without a config yet falls
// back to a placeholder, so a newly added nav item never breaks routing.
const OTHER_ROUTES = NAV_SECTIONS.flatMap((s) => s.items).filter(
  (item) => item.path !== "/",
);

function AdminApp() {
  return (
    <PackageTrackingProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/packages/:tk" element={<PackageDetail />} />
          <Route path="/containers" element={<ContainersPage />} />
          <Route path="/containers/:id" element={<ContainerDetail />} />
          <Route path="/shipment-lookup" element={<ShipmentLookup />} />
          <Route path="/scan-center" element={<ScanCenterPage />} />
          <Route path="/process-tracking" element={<ProcessTrackingPage />} />
          <Route path="/wh-arrived" element={<WHArrivedPage />} />
          <Route path="/sorting" element={<SortingPage />} />
          <Route path="/warehouses" element={<WarehouseManagementPage />} />
          <Route path="/kh-warehouse" element={<KhWarehousePage />} />
          <Route path="/roles" element={<RoleManagementPage />} />
          <Route
            path="/permissions"
            element={<Navigate to="/roles" replace />}
          />
          {OTHER_ROUTES.filter(
            (item) =>
              ![
                "/process-tracking",
                "/wh-arrived",
                "/sorting",
                "/warehouses",
                "/kh-warehouse",
                "/containers",
                "/roles",
              ].includes(item.path),
          ).map((item) => {
            const config = MODULES[item.path];
            return (
              <Route
                key={item.path}
                path={item.path}
                element={
                  config ? (
                    <ListPage {...config} path={item.path} />
                  ) : (
                    <Placeholder title={item.label} />
                  )
                }
              />
            );
          })}
        </Route>
      </Routes>
    </PackageTrackingProvider>
  );
}

const CB_DESIGN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root{--cb-primary:#2563eb;--cb-primary-dark:#1d4ed8;--cb-navy:#0f1f3d;--cb-bg:#f4f7fb;--cb-border:#e5eaf2;--cb-text:#10213f;--cb-muted:#6b7b96;}
html,body,#root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
body{background:var(--cb-bg);color:var(--cb-text);}
.cb-app{min-height:100vh;background:var(--cb-bg);}
.cb-app *{font-family:inherit;}
.cb-surface{background:#fff;border:1px solid var(--cb-border);border-radius:16px;box-shadow:0 8px 30px rgba(15,31,61,.055);}
.cb-sidebar{background:linear-gradient(180deg,#0b1b38 0%,#0f2346 100%);}
.cb-sidebar .cb-active{background:linear-gradient(135deg,#2f75f4,#2563eb);box-shadow:0 8px 20px rgba(37,99,235,.22);}
.cb-topbar{background:rgba(255,255,255,.92);backdrop-filter:blur(14px);border-bottom:1px solid rgba(229,234,242,.9);}
.cb-input{border:1px solid var(--cb-border);background:#fbfcfe;border-radius:12px;transition:.2s ease;}
.cb-input:focus{border-color:#60a5fa;box-shadow:0 0 0 4px rgba(37,99,235,.09);background:#fff;outline:none;}
.cb-card{border-radius:16px!important;box-shadow:0 8px 28px rgba(15,31,61,.055)!important;}
.cb-stat{transition:transform .18s ease,box-shadow .18s ease;}
.cb-stat:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(15,31,61,.08)!important;}
.cb-route{background:linear-gradient(135deg,#0d2144 0%,#163764 55%,#1d4f91 100%);border-radius:18px!important;box-shadow:0 14px 36px rgba(15,31,61,.14);}
.cb-page-title{letter-spacing:-.025em;}
.cb-table-row:hover{background:#f8fbff;}
@media(max-width:1023px){.cb-sidebar{box-shadow:20px 0 60px rgba(15,31,61,.22);}}
`;

function App() {
  return (
    <>
      <style>{CB_DESIGN_CSS}</style>
      <Routes>
        <Route path="/customer/*" element={<CustomerApp />} />
        <Route path="/*" element={<AdminApp />} />
      </Routes>
    </>
  );
}

export default App;
