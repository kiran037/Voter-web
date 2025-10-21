export type Gender = "M" | "F" | "O";
export type ColourCode = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
export type FamilyRole = "HEAD" | "SPOUSE" | "CHILD" | "PARENT" | "SIBLING" | "OTHER";
export type FamilyIdType = "JAN_AADHAAR_FAMILY_ID" | "RATION_CARD_NO" | "OTHER";

// Full voter record (detail page / API GET / PUT)
export type Voter = {
  id: string;
  name: string;
  voterId: string | null;
  age: number | null;
  gender: Gender | null;
  village: string | null;
  houseNo: string | null;
  address: string | null;
  boothName: string | null;
  boothNo: number | null;
  partNo: number | null;
  srn: number | null;

  /** NEW: Ward number */
  wardNo: number | null;

  mobile1: string | null;
  mobile2: string | null;
  email: string | null;
  colourCode: ColourCode;
  voted: boolean;
  starVoter: boolean;
  dead: boolean;

  // survey-ish / notes
  caste: string | null;
  profession: string | null;
  demands: string | null;
  extraInfo: string | null;
  dob: string | null;

  /** NEW: Father name */
  fatherName?: string | null;

  /** NEW: Party support */
  partySupport: string | null;

  // family (head-based)
  familyId: string | null;
  familyIdType: FamilyIdType | null;
  relationToHead: FamilyRole | null;
  headId: string | null;
  head?: { id: string; name: string } | null;

  // optional preview from API
  familyPreview?: Array<{ id: string; name: string }>;
};

// Minimal row shape sometimes returned by list endpoints
export type ListRow = {
  id: string;
  name: string;
  voterId: string | null;
  village: string | null;
  mobile1: string | null;
  colourCode: ColourCode;

  /** Optional extras commonly surfaced in lists */
  fatherName?: string | null;
  wardNo?: number | null;
  partySupport?: string | null;
};

// Shape used on the Home list/table (includes booth/part/srn + updatedAt)
export type VoterListItem = {
  id: string;
  name: string;
  voterId: string | null;
  village: string | null;

  /** NEW: father + ward for table display */
  fatherName?: string | null;
  wardNo?: number | null;

  /** NEW: Party support */
  partySupport?: string | null;

  boothNo: number | null;
  partNo: number | null;
  srn: number | null;
  mobile1: string | null;
  colourCode: ColourCode;
  voted: boolean;
  starVoter: boolean;
  dead: boolean;
  updatedAt: string;
};
