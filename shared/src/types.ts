// === Database Row Types ===
export type UserRole = 'admin' | 'staff';

export interface User {
  id: number;
  name: string;
  role: UserRole;
  is_active: boolean; // D1 stores as 0/1
  has_passkey: boolean;
  created_at: number; // unix epoch
  updated_at: number;
}

export interface PasskeyCredential {
  id: number;
  credential_id: string;
  user_id: number;
  public_key: string;
  counter: number;
  device_name: string | null;
  created_at: number;
}

export interface WebAuthnChallenge {
  id: string;
  challenge: string;
  user_id: number | null;
  type: 'registration' | 'authentication';
  expires_at: number;
  created_at: number;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: number;
  created_at: number;
}

export interface RegistrationToken {
  token: string;
  user_id: number | null;
  pre_filled_name: string;
  role: UserRole;
  expires_at: number;
  used_at: number | null;
  created_by: number;
  created_at: number;
}

export interface Language {
  code: string; // 2-char e.g. 'GB'
  display_name: string;
  is_base: boolean;
  sort_order: number;
  created_at: number;
}

export interface MenuItem {
  id: number;
  sort_order: number;
  is_visible: boolean;
  base_price: number;
  created_at: number;
  updated_at: number;
}

export interface MenuItemName {
  id: number;
  menu_item_id: number;
  language_code: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export type MediaType = 'image' | 'video';

export interface MediaVariant {
  id: number;
  menu_item_id: number;
  language_code: string;
  media_type: MediaType;
  r2_key: string;
  original_filename: string | null;
  content_type: string;
  file_size: number;
  created_at: number;
  updated_at: number;
}

// === Customer Interaction Types ===
export interface Trait {
  id: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface TraitName {
  id: number;
  trait_id: number;
  language_code: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface TraitGroup {
  id: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface TraitGroupName {
  id: number;
  trait_group_id: number;
  language_code: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface OptionGroup {
  id: number;
  multi_select: number;
  required: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface OptionGroupName {
  id: number;
  option_group_id: number;
  language_code: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface Option {
  id: number;
  option_group_id: number;
  price_delta: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface OptionName {
  id: number;
  option_id: number;
  language_code: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: number;
}

// Composed types
export interface TraitWithDetails extends Trait {
  names: TraitName[];
}

export interface TraitGroupWithDetails extends TraitGroup {
  names: TraitGroupName[];
  traits: TraitWithDetails[];
}

export interface OptionWithDetails extends Option {
  names: OptionName[];
}

export interface OptionGroupWithDetails extends OptionGroup {
  names: OptionGroupName[];
  options: OptionWithDetails[];
}

// === API Response Types ===
export interface MenuItemWithDetails extends MenuItem {
  names: MenuItemName[];
  media: MediaVariant[];
  traits: TraitWithDetails[];
  optionGroups: OptionGroupWithDetails[];
}

export interface PublicMenuResponse {
  items: MenuItemWithDetails[];
  languages: Language[];
  traitGroups: TraitGroupWithDetails[];
  optionGroups: OptionGroupWithDetails[];
  settings: Record<string, string>;
  version: number; // unix timestamp for cache diffing
}

// === Realtime ===
export type ResourceKey = 'menuItem' | 'media' | 'language' | 'user' | 'trait' | 'traitGroup' | 'option' | 'optionGroup' | 'setting';

export interface VersionVector {
  [key: string]: number; // ResourceKey -> version timestamp
}

export interface VersionVectorMessage {
  type: 'version_update';
  vector: VersionVector;
}

// === API Common ===
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}
