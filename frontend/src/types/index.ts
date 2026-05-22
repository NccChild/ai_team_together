/**
 * API 类型定义
 */

// 通用响应
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T = any> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 人员管理
export interface Member {
  id: number;
  name: string;
  unit: string;
  contact?: string;
  email?: string;
  skill_tags?: string[];
  is_backbone: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MemberCreate {
  name: string;
  unit: string;
  contact?: string;
  email?: string;
  skill_tags?: string[];
  is_backbone?: boolean;
}

// 周次管理
export interface Week {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface WeekCreate {
  name: string;
  start_date: string;
  end_date: string;
  status?: string;
  remark?: string;
}

// 任务管理
export interface Task {
  id: number;
  name: string;
  description?: string;
  task_type: string;
  difficulty: string;
  assignee_id: number;
  assignee_name?: string;
  collaborator_ids?: number[];
  week_id: number;
  week_name?: string;
  deadline: string;
  delivery_requirement?: string;
  status: string;
  is_overdue: boolean;
  creator_id?: number;
  created_at: string;
  updated_at: string;
  deliveries?: Delivery[];
  evaluations?: Evaluation[];
}

export interface TaskCreate {
  name: string;
  description?: string;
  task_type: string;
  difficulty: string;
  assignee_id: number;
  collaborator_ids?: number[];
  week_id: number;
  deadline: string;
  delivery_requirement?: string;
  creator_id?: number;
}

export interface TaskFilter {
  keyword?: string;
  week_id?: number;
  assignee_id?: number;
  task_type?: string;
  difficulty?: string;
  status?: string;
  is_overdue?: boolean;
  page?: number;
  page_size?: number;
}

// 成果提交
export interface Delivery {
  id: number;
  task_id: number;
  name: string;
  description?: string;
  link?: string;
  delivery_type?: string;
  submitter_id: number;
  submitter_name?: string;
  submitted_at: string;
  is_latest: boolean;
  update_description?: string;
}

export interface DeliveryCreate {
  task_id: number;
  name: string;
  description?: string;
  link?: string;
  delivery_type?: string;
  submitter_id: number;
  update_description?: string;
}

// 评价管理
export interface Evaluation {
  id: number;
  task_id: number;
  task_name?: string;
  level: string;
  comment?: string;
  base_score: number;
  bonus_score: number;
  final_score: number;
  evaluator_id: number;
  evaluator_name?: string;
  member_id: number;
  member_name?: string;
  evaluated_at: string;
}

export interface EvaluationCreate {
  task_id: number;
  level: string;
  comment?: string;
  base_score?: number;
  bonus_score?: number;
  final_score?: number;
  evaluator_id: number;
  member_id: number;
}

// 周报分析
export interface WeeklyReport {
  id: number;
  week_id: number;
  week_name?: string;
  member_id: number;
  member_name?: string;
  work_content?: string;
  main_results?: string;
  problems?: string;
  next_week_plan?: string;
  raw_text?: string;
  submitted_at: string;
  updated_at: string;
  has_analysis?: boolean;
  analysis?: WeeklyReportAnalysis;
}

export interface WeeklyReportCreate {
  week_id: number;
  member_id: number;
  work_content?: string;
  main_results?: string;
  problems?: string;
  next_week_plan?: string;
  raw_text?: string;
}

export interface WeeklyReportAnalysis {
  id: number;
  main_work?: string[];
  matched_tasks?: any[];
  delivery_status?: any;
  quality_assessment?: string;
  problems_found?: string[];
  next_week_items?: string[];
  candidate_tasks?: any[];
  contribution_summary?: string;
  risk_alerts?: string[];
  analyzed_at: string;
}

// 成果库
export interface Achievement {
  id: number;
  delivery_id?: number;
  task_id?: number;
  task_name?: string;
  name: string;
  description?: string;
  link?: string;
  achievement_type?: string;
  member_id: number;
  member_name?: string;
  week_id?: number;
  week_name?: string;
  is_excellent: boolean;
  created_at: string;
}

export interface AchievementCreate {
  name: string;
  description?: string;
  link?: string;
  achievement_type?: string;
  member_id: number;
  week_id?: number;
}

// 统计
export interface DashboardStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_evaluation: number;
  need_revision: number;
  overdue_tasks: number;
  week_id?: number;
  week_name?: string;
}

export interface MemberRanking {
  member_id: number;
  member_name: string;
  unit: string;
  weekly_score: number;
  total_score: number;
  excellent_count: number;
  rank: number;
}

export interface WeekSummary {
  week_id: number;
  week_name: string;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  excellent_count: number;
  total_score: number;
  member_stats?: MemberStats[];
}

export interface MemberStats {
  member_id: number;
  member_name: string;
  unit: string;
  weekly_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  need_revision_tasks: number;
  excellent_tasks: number;
  weekly_score: number;
  total_score: number;
  delivery_count: number;
}

// 字典
export interface DictionaryItem {
  value: string;
  label: string;
}

export interface Dictionaries {
  task_type: DictionaryItem[];
  task_difficulty: DictionaryItem[];
  task_status: DictionaryItem[];
  evaluation_level: DictionaryItem[];
  delivery_type: DictionaryItem[];
  skill_tag: DictionaryItem[];
  member_status: DictionaryItem[];
  week_status: DictionaryItem[];
  bonus_item: DictionaryItem[];
}

// 待评价任务
export interface PendingEvaluation {
  task_id: number;
  task_name: string;
  assignee_id: number;
  assignee_name?: string;
  deadline: string;
  submitted_at?: string;
  week_name?: string;
}
