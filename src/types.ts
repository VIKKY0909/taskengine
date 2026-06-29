export type TeamRole = 'Developer' | 'SEO Lead' | 'Founder' | 'Operations';

export type TaskWeek = 'Week 1' | 'Week 2' | 'Week 3' | 'Week 4' | 'Suggested/Optional';

export type TaskCategory = 'Technical' | 'On-Page' | 'Local SEO' | 'Content' | 'Strategy';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface TaskHistoryEntry {
  date: string;
  contributor: string;
  action: string; // e.g. "Created Task", "Updated Status", "Edited Details"
  details: string; // e.g. "Status changed from Pending to Completed"
}

export interface Task {
  _id?: string; // MongoDB ObjectId string
  title: string;
  description: string;
  role: TeamRole;
  week: TaskWeek;
  category: TaskCategory;
  status: TaskStatus;
  isOptional?: boolean;
  contributor: string; // Last contributor
  history: TaskHistoryEntry[];
  updatedAt: string;
  createdAt?: string;
}

export interface DBConfig {
  isConnected: boolean;
  dbType: 'MongoDB Atlas' | 'Local JSON Fallback';
  connectionUriProvided: boolean;
  connectionError?: string | null;
  uriMasked?: string | null;
}
