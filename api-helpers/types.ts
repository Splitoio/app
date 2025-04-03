type SplitType =
  | "EQUAL"
  | "PERCENTAGE"
  | "EXACT"
  | "SHARE"
  | "ADJUSTMENT"
  | "SETTLEMENT";

export interface Account {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  accessTokenExpiresAt?: Date | null;
  refreshTokenExpiresAt?: Date | null;
  scope?: string | null;
  password?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: User;
}

export interface Session {
  id: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
  user: User;
}

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified: boolean;
  image?: string | null;
  currency: string;
  stellarAccount?: string | null;
  accounts: Account[];
  sessions: Session[];
  groups: Group[];
  associatedGroups: GroupUser[];
  expenseParticipants: ExpenseParticipant[];
  expenseNotes: ExpenseNote[];
  userBalances: Balance[];
  friendBalances: Balance[];
  groupUserBalances: GroupBalance[];
  groupFriendBalances: GroupBalance[];
  paidExpenses: Expense[];
  addedExpenses: Expense[];
  deletedExpenses: Expense[];
  updatedExpenses: Expense[];
  createdAt: Date;
  updatedAt: Date;
  friends: Friendship[];
  friendOf: Friendship[];
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

export interface Balance {
  userId: string;
  currency: string;
  friendId: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
  importedFromSplitwise: boolean;
  user: User;
  friend: User;
}

export interface Group {
  id: string;
  name: string;
  userId: string;
  description?: string | null;
  image?: string | null;
  defaultCurrency: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: User;
  groupUsers: GroupUser[];
  expenses: Expense[];
  groupBalances: GroupBalance[];
}

export interface GroupUser {
  groupId: string;
  userId: string;
  user: User;
  group: Group;
}

export interface GroupBalance {
  groupId: string;
  currency: string;
  userId: string;
  firendId: string;
  amount: number;
  updatedAt: Date;
  group: Group;
  user: User;
  friend: User;
}

export interface Expense {
  id: string;
  paidBy: string;
  addedBy: string;
  name: string;
  category: string;
  amount: number;
  splitType: SplitType;
  expenseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  fileKey?: string | null;
  groupId?: string | null;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  updatedBy?: string | null;
  group?: Group | null;
  paidByUser: User;
  addedByUser: User;
  deletedByUser?: User | null;
  updatedByUser?: User | null;
  expenseParticipants: ExpenseParticipant[];
  expenseNotes: ExpenseNote[];
}

export interface ExpenseParticipant {
  expenseId: string;
  userId: string;
  amount: number;
  user: User;
  expense: Expense;
}

export interface ExpenseNote {
  id: string;
  expenseId: string;
  note: string;
  createdById: string;
  createdAt: Date;
  createdBy: User;
  expense: Expense;
}

export interface PushNotification {
  userId: string;
  subscription: string;
}

export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface Friendship {
  userId: string;
  friendId: string;
  createdAt: Date;
  user: User;
  friend: User;
}
