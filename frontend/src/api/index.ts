/**
 * API 接口模块
 */

import apiClient from './request';
import type {
  Member,
  MemberCreate,
  Week,
  WeekCreate,
  Task,
  TaskCreate,
  TaskFilter,
  Delivery,
  DeliveryCreate,
  Evaluation,
  EvaluationCreate,
  WeeklyReport,
  WeeklyReportCreate,
  Achievement,
  AchievementCreate,
  DashboardStats,
  MemberRanking,
  WeekSummary,
  MemberStats,
  Dictionaries,
  PendingEvaluation,
  PageResponse,
} from '../types';

// ===========================================
// 人员管理接口
// ===========================================

export const memberApi = {
  getList: (params?: {
    keyword?: string;
    unit?: string;
    skill_tag?: string;
    is_backbone?: boolean;
    status?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.get<PageResponse<Member>>('/members', params),

  getById: (id: number) => apiClient.get<Member>(`/members/${id}`),

  create: (data: MemberCreate) => apiClient.post<{ id: number }>('/members', data),

  update: (id: number, data: Partial<MemberCreate>) =>
    apiClient.put<Member>(`/members/${id}`, data),

  updateStatus: (id: number, status: string) =>
    apiClient.put<{ id: number; status: string }>(`/members/${id}/status`, { status }),

  checkUsername: (username: string) =>
    apiClient.get<{ exists: boolean }>(`/members/check-username/${username}`),

  getSummary: () =>
    apiClient.get<{ total_active: number; total_inactive: number; total_backbone: number; total: number }>('/members/summary'),
};

// ===========================================
// 周次管理接口
// ===========================================

export const weekApi = {
  getList: (params?: { status?: string; page?: number; page_size?: number }) =>
    apiClient.get<PageResponse<Week>>('/weeks', params),

  getCurrent: () => apiClient.get<Week>('/weeks/current'),

  getById: (id: number) => apiClient.get<Week>(`/weeks/${id}`),

  create: (data: WeekCreate) => apiClient.post<{ id: number }>('/weeks', data),

  update: (id: number, data: Partial<WeekCreate>) =>
    apiClient.put<Week>(`/weeks/${id}`, data),

  getTasks: (weekId: number) =>
    apiClient.get<{ items: Task[]; total: number }>(`/weeks/${weekId}/tasks`),

  getSummary: (weekId: number) => apiClient.get<WeekSummary>(`/weeks/${weekId}/summary`),
};

// ===========================================
// 任务管理接口
// ===========================================

export const taskApi = {
  getList: (params?: TaskFilter) => apiClient.get<PageResponse<Task>>('/tasks', params),

  getById: (id: number) => apiClient.get<Task>(`/tasks/${id}`),

  create: (data: TaskCreate) => apiClient.post<{ id: number }>('/tasks', data),

  update: (id: number, data: Partial<TaskCreate>) =>
    apiClient.put<Task>(`/tasks/${id}`, data),

  delete: (id: number) => apiClient.delete<null>(`/tasks/${id}`),

  updateStatus: (id: number, status: string) =>
    apiClient.put<{ id: number; status: string; is_overdue: boolean }>(`/tasks/${id}/status`, {
      status,
    }),

  getDeliveries: (taskId: number) =>
    apiClient.get<{ items: Delivery[]; total: number }>(`/tasks/${taskId}/deliveries`),

  createDelivery: (taskId: number, data: DeliveryCreate) =>
    apiClient.post<{ id: number }>(`/tasks/${taskId}/deliveries`, data),

  getEvaluations: (taskId: number) =>
    apiClient.get<{ items: Evaluation[]; total: number }>(`/tasks/${taskId}/evaluations`),
};

// ===========================================
// 评价管理接口
// ===========================================

export const evaluationApi = {
  getList: (params?: {
    task_id?: number;
    member_id?: number;
    level?: string;
    page?: number;
    page_size?: number;
  }) => apiClient.get<PageResponse<Evaluation>>('/evaluations', params),

  getById: (id: number) => apiClient.get<Evaluation>(`/evaluations/${id}`),

  create: (data: EvaluationCreate) =>
    apiClient.post<{ id: number; level: string; final_score: number; task_status: string }>(
      '/evaluations',
      data
    ),

  update: (id: number, data: Partial<EvaluationCreate>) =>
    apiClient.put<Evaluation>(`/evaluations/${id}`, data),

  getPending: () =>
    apiClient.get<{ items: PendingEvaluation[]; total: number }>('/evaluations/pending'),
};

// ===========================================
// 统计接口
// ===========================================

export const statisticsApi = {
  getDashboard: (weekId?: number) =>
    apiClient.get<DashboardStats>('/statistics/dashboard', { week_id: weekId }),

  getRanking: (weekId?: number) =>
    apiClient.get<{ items: MemberRanking[]; total: number }>('/statistics/ranking', {
      week_id: weekId,
    }),

  getWeekSummary: (weekId: number) => apiClient.get<WeekSummary>(`/statistics/week/${weekId}`),

  getMemberStats: (memberId: number, weekId?: number) =>
    apiClient.get<MemberStats>('/statistics/member/${memberId}', { week_id: weekId }),

  getTaskDistribution: (weekId?: number) =>
    apiClient.get<Record<string, number>>('/statistics/task-distribution', { week_id: weekId }),
};

// ===========================================
// 周报分析接口
// ===========================================

export const weeklyReportApi = {
  getList: (params?: {
    week_id?: number;
    member_id?: number;
    page?: number;
    page_size?: number;
  }) => apiClient.get<PageResponse<WeeklyReport>>('/weekly-reports', params),

  getById: (id: number) => apiClient.get<WeeklyReport>(`/weekly-reports/${id}`),

  create: (data: WeeklyReportCreate) =>
    apiClient.post<{ id: number }>('/weekly-reports', data),

  update: (id: number, data: Partial<WeeklyReportCreate>) =>
    apiClient.put<{ id: number }>(`/weekly-reports/${id}`, data),

  analyze: (id: number) =>
    apiClient.post<{ id: number; contribution_summary: string; risk_alerts: string[] }>(
      `/weekly-reports/${id}/analyze`
    ),

  getSummary: (weekId?: number) =>
    apiClient.get<{ week_id: number; week_name: string; items: any[]; total: number }>(
      '/weekly-reports/summary',
      { week_id: weekId }
    ),
};

// ===========================================
// 成果库接口
// ===========================================

export const achievementApi = {
  getList: (params?: {
    keyword?: string;
    achievement_type?: string;
    member_id?: number;
    week_id?: number;
    is_excellent?: boolean;
    page?: number;
    page_size?: number;
  }) => apiClient.get<PageResponse<Achievement>>('/achievements', params),

  getById: (id: number) => apiClient.get<Achievement>(`/achievements/${id}`),

  create: (data: AchievementCreate) =>
    apiClient.post<Achievement>('/achievements', data),

  markExcellent: (id: number, isExcellent: boolean) =>
    apiClient.put<{ id: number; is_excellent: boolean }>(`/achievements/${id}/excellent`, {
      is_excellent: isExcellent,
    }),

  sync: (taskId?: number, weekId?: number) =>
    apiClient.post<{ synced_count: number }>('/achievements/sync', null, {
      params: { task_id: taskId, week_id: weekId },
    }),

  getSummary: () =>
    apiClient.get<{ total: number; excellent_count: number }>('/achievements/summary'),
};

// ===========================================
// 字典接口
// ===========================================

export const dictionaryApi = {
  getAll: () => apiClient.get<Dictionaries>('/dictionaries'),

  getByType: (type: string) =>
    apiClient.get<{ type: string; items: { value: string; label: string }[] }>(
      `/dictionaries/${type}`
    ),
};

// ===========================================
// 导出接口
// ===========================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const exportApi = {
  exportWeekPlan: (weekId: number) => {
    window.open(`${API_BASE_URL}/export/week-plan?week_id=${weekId}`);
  },

  exportWeekEvaluation: (weekId: number) => {
    window.open(`${API_BASE_URL}/export/week-evaluation?week_id=${weekId}`);
  },

  exportMemberStatistics: (weekId?: number) => {
    const params = weekId ? `?week_id=${weekId}` : '';
    window.open(`${API_BASE_URL}/export/member-statistics${params}`);
  },

  exportAchievements: (weekId?: number) => {
    const params = weekId ? `?week_id=${weekId}` : '';
    window.open(`${API_BASE_URL}/export/achievements${params}`);
  },
};
