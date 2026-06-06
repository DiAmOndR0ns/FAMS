export interface Member {
  id: string;
  name: string;
  gender: string;
  age: number;
  barangay: string;
  status: "Active" | "Inactive";
  registeredAt: string;
  contactNo: string;
  farmSizeHa: number;
  primaryCrops: string[];
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  minutes: string;
  resolutions: string[];
  attendeesCount: number;
  recordedBy: string;
}

export interface CashFlow {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  category: string;
  date: string;
  description: string;
  loggedBy: string;
  period: string;
  auditStatus?: "Pending" | "Approved" | "Flagged";
  auditComment?: string;
  auditedBy?: string;
  auditedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  published: boolean;
  author: string;
}

export interface Product {
  id: string;
  name: string;
  quantity: string;
  price: number;
  contact: string;
  description: string;
  postedBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  domain: string;
  details: string;
}

export interface DelegationState {
  active: boolean;
  requestedAt: string;
  approvedAt: string | null;
  status: "Pending" | "Approved" | "Declined";
}

export interface User {
  username: string;
  role: "President" | "Vice President" | "Secretary" | "Treasurer" | "Auditor" | "PIO";
  fullName: string;
}

export interface OfflineSyncOp {
  id: string;
  type: "create" | "edit" | "delete";
  entity: "members" | "meetings" | "cashflow" | "announcements" | "products";
  payload: any;
  timestamp: string;
  actor: string;
}
