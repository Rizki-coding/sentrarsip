// TypeScript interfaces for the Sentrarsip system

export interface Organization {
  id: number;
  parent_id: number | null;
  parent?: Organization;
  children?: Organization[];
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: number;
  parent_id?: number | null;
  parent?: Position;
  organization_id: number;
  organization?: Organization;
  name: string;
  level: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  nip: string;
  role: "superadmin" | "admin" | "pegawai";
  organization_id: number;
  organization?: Organization;
  position_id: number;
  position?: Position;
  positions?: UserPosition[];
  signature_path: string;
  avatar_path: string;
  is_active: boolean;
  permissions?: string; // JSON string of role permissions
  created_at: string;
  updated_at: string;
}

export interface UserPosition {
  id: number;
  user_id: number;
  user?: User;
  position_id: number;
  position?: Position;
  is_primary: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface Classification {
  id: number;
  parent_id: number | null;
  parent?: Classification;
  children?: Classification[];
  code: string;
  name: string;
  retention_active_years: number;
  retention_inactive_years: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface LetterCategory {
  id: number;
  name: string;
  code: string;
  description: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface LetterType {
  id: number;
  name: string;
  code: string;
  description: string;
  letter_category_id?: number;
  letter_category?: LetterCategory;
  created_at: string;
  updated_at: string;
}

export interface Urgency {
  id: number;
  name: string;
  code: string;
}

export interface SecurityLevel {
  id: number;
  name: string;
  code: string;
}

export interface DocumentLocation {
  id: number;
  name: string;
  code: string;
  description: string;
  room: string;
  shelf: string;
  box: string;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: number;
  name: string;
  letter_type_id: number;
  letter_type?: LetterType;
  html_content: string;
  variables_json: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Archive {
  id: number;
  agenda_number: string;
  classification_id: number;
  classification?: Classification;
  letter_type_id: number;
  letter_type?: LetterType;
  urgency_id: number | null;
  urgency?: Urgency;
  security_level_id: number | null;
  security_level?: SecurityLevel;
  document_location_id: number | null;
  document_location?: DocumentLocation;
  origin: string;
  subject: string;
  letter_date: string | null;
  received_date: string | null;
  file_path: string;
  description: string;
  created_by: number;
  creator?: User;
  retention_due_at: string | null;
  status: "aktif" | "inaktif" | "musnah";
  created_at: string;
  updated_at: string;
}

export interface LetterRecipient {
  id: number;
  letter_id: number;
  recipient_type: "personal" | "organization" | "position" | "group";
  recipient_id: number;
  recipient_name: string;
  created_at: string;
}

export interface WorkflowLog {
  id: number;
  letter_id: number;
  user_id: number;
  user?: User;
  action: string;
  from_status: string;
  to_status: string;
  comments: string;
  created_at: string;
}

export interface Letter {
  id: number;
  letter_number: string;
  letter_type_id: number;
  letter_type?: LetterType;
  template_id: number | null;
  template?: Template;
  urgency_id: number | null;
  urgency?: Urgency;
  security_level_id: number | null;
  security_level?: SecurityLevel;
  direction: string;
  subject: string;
  content_html: string;
  letter_date: string | null;
  status:
    | "draft"
    | "pending_review"
    | "revision"
    | "pending_sign"
    | "signed"
    | "published";
  created_by: number;
  creator?: User;
  checkers?: User[];
  approvers?: User[];
  publisher_id?: number;
  publisher?: User;
  current_checker_index?: number;
  current_approver_index?: number;
  qr_code_path: string;
  pdf_path: string;
  recipients?: LetterRecipient[];
  workflow_logs?: WorkflowLog[];
  created_at: string;
  updated_at: string;
}

export interface LetterForward {
  id: number;
  letter_id: number;
  from_user_id: number;
  from_user?: User;
  to_user_id: number;
  to_user?: User;
  notes: string;
  created_at: string;
}

export interface Disposition {
  id: number;
  letter_id: number;
  letter?: Letter;
  from_user_id: number;
  from_user?: User;
  to_user_id: number;
  to_user?: User;
  instruction: string;
  priority: string;
  deadline: string | null;
  status: "pending" | "read" | "done";
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  members?: GroupMember[];
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  user?: User;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
