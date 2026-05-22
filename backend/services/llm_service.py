"""
大模型服务
用于调用 Qwen、DeepSeek、MiniMax 等大模型API
"""

import httpx
import json
from typing import Dict, Any, List, Optional
from backend.config import LLM_PROVIDER, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL_NAME, LLM_TIMEOUT
import logging

logger = logging.getLogger(__name__)

class LLMService:
    """大模型服务类"""

    def __init__(self):
        self.provider = LLM_PROVIDER
        self.api_key = LLM_API_KEY
        self.base_url = LLM_BASE_URL
        self.model_name = LLM_MODEL_NAME
        self.timeout = LLM_TIMEOUT

    def _get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """通用API调用方法"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._get_headers(),
                    json={
                        "model": self.model_name,
                        "messages": messages,
                        "temperature": temperature
                    }
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"LLM API调用失败: {e}")
            raise

    def analyze_weekly_report(
        self,
        report_content: str,
        member_name: str,
        tasks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        分析周报，提取结构化信息

        Args:
            report_content: 周报原始内容
            member_name: 成员姓名
            tasks: 该成员的任务列表

        Returns:
            结构化的分析结果
        """
        # 构建任务信息
        task_info = "\n".join([
            f"- 任务{i+1}: {t['name']} (状态: {t['status']}, 截止: {t.get('deadline', '未设置')})"
            for i, t in enumerate(tasks)
        ]) if tasks else "本周暂无任务安排"

        prompt = f"""你是一个专业的周报分析助手。请分析以下周报内容，提取结构化信息。

成员姓名：{member_name}
本周任务安排：
{task_info}

周报内容：
{report_content}

请以JSON格式输出分析结果，包含以下字段：
- main_work: 本周主要工作（数组）
- matched_tasks: 对应的系统任务（数组，包含任务名称和匹配理由）
- delivery_status: 成果交付情况（对象，包含是否有明确成果、判断理由）
- quality_assessment: 工作质量初步判断（字符串）
- problems_found: 存在问题（数组）
- next_week_items: 下周计划（数组）
- candidate_tasks: 可转为下周任务的事项（数组）
- contribution_summary: 个人贡献摘要（字符串，适合汇报使用）
- risk_alerts: 风险提示（数组）

只输出JSON，不要有其他文字。"""

        # 如果未配置API，返回模拟结果
        if not self.api_key or not self.base_url:
            return self._get_mock_analysis(member_name, tasks)

        try:
            import asyncio
            messages = [{"role": "user", "content": prompt}]
            result_text = asyncio.run(self._call_api(messages))

            # 尝试解析JSON
            # 移除可能的markdown代码块标记
            result_text = result_text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]

            return json.loads(result_text.strip())
        except Exception as e:
            logger.error(f"周报分析失败: {e}")
            return self._get_mock_analysis(member_name, tasks)

    def _get_mock_analysis(self, member_name: str, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """返回模拟分析结果（用于测试）"""
        return {
            "main_work": ["按要求完成了本周安排的工作任务"],
            "matched_tasks": [],
            "delivery_status": {
                "has_deliverable": True,
                "reason": "已完成基本任务"
            },
            "quality_assessment": "合格",
            "problems_found": [],
            "next_week_items": ["继续推进相关工作"],
            "candidate_tasks": [],
            "contribution_summary": f"{member_name}本周按计划完成了安排的工作任务。",
            "risk_alerts": []
        }

    def generate_team_summary(
        self,
        weekly_reports: List[Dict[str, Any]],
        week_name: str
    ) -> str:
        """
        生成专班周报草稿

        Args:
            weekly_reports: 所有成员的周报分析结果
            week_name: 周次名称

        Returns:
            专班周报草稿文本
        """
        if not self.api_key or not self.base_url:
            return f"{week_name}专班周报草稿（API未配置）"

        reports_summary = "\n".join([
            f"## {r.get('member_name', '未知')}\n{r.get('analysis', {}).get('contribution_summary', '无内容')}"
            for r in weekly_reports
        ])

        prompt = f"""请根据以下专班成员的周报分析结果，生成专班周报草稿。

周次：{week_name}

{reports_summary}

请生成一份简洁的专班周报草稿，包含：
1. 本周总体情况概述
2. 主要工作成果
3. 存在问题和建议
4. 下周工作计划

直接输出周报内容，不要额外说明。"""

        try:
            import asyncio
            messages = [{"role": "user", "content": prompt}]
            return asyncio.run(self._call_api(messages))
        except Exception as e:
            logger.error(f"生成专班周报失败: {e}")
            return f"{week_name}专班周报草稿（生成失败）"

    def evaluate_task(
        self,
        task_info: Dict[str, Any],
        member_name: str,
        deliveries: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        AI评价任务完成情况

        Args:
            task_info: 任务信息（name, description, task_type, difficulty等）
            member_name: 成员姓名
            deliveries: 交付物列表

        Returns:
            评价结果 {level, comment, bonus_score}
        """
        delivery_info = "\n".join([
            f"- 成果{i+1}: {d.get('name', '未命名')} (类型: {d.get('delivery_type', '未分类')})\n  说明: {d.get('description', '无')}\n  链接: {d.get('link', '无')}"
            for i, d in enumerate(deliveries)
        ]) if deliveries else "无交付物"

        prompt = f"""你是一个专业的任务评价助手。请根据以下信息对任务完成情况进行评价。

任务名称：{task_info.get('name', '未知')}
任务描述：{task_info.get('description', '无')}
任务类型：{task_info.get('task_type', '未知')}
难度：{task_info.get('difficulty', 'medium')}
交付要求：{task_info.get('delivery_requirement', '无')}
截止日期：{task_info.get('deadline', '未知')}

负责人：{member_name}

交付物：
{delivery_info}

请根据交付物质量、完成度、时效性进行综合评价，以JSON格式输出：
- level: 评价等级（excellent/qualified/need_revision/unqualified之一）
- comment: 评价意见（100-200字，包含对交付物的具体评价和改进建议）
- bonus_score: 加分（0-5的整数，优秀成果可加分）

评价标准：
- excellent: 超额完成任务，交付物质量高，有创新或可复用价值
- qualified: 按要求完成任务，交付物符合要求
- need_revision: 任务基本完成但交付物需改进
- unqualified: 任务未完成或交付物质量差

只输出JSON，不要有其他文字。"""

        if not self.api_key or not self.base_url:
            return self._get_mock_evaluation(task_info, deliveries)

        try:
            import asyncio
            messages = [{"role": "user", "content": prompt}]
            result_text = asyncio.run(self._call_api(messages, temperature=0.3))

            result_text = result_text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]

            return json.loads(result_text.strip())
        except Exception as e:
            logger.error(f"任务评价失败: {e}")
            return self._get_mock_evaluation(task_info, deliveries)

    def ai_evaluate_with_code(
        self,
        task_name: str,
        member_name: str,
        task_description: str,
        code_content: str,
    ) -> Dict[str, Any]:
        """
        根据成果说明和支撑代码生成评价，返回 comment 和 score。

        Returns:
            {"comment": "评价文本（约200字）", "score": 85}
        """
        prompt = f"""你是一个专业的代码评审助手。请根据以下信息对任务完成情况进行评价。

任务名称：{task_name}
负责人：{member_name}
任务描述：{task_description or '无'}

以下是该任务关联的成果及其支撑代码：
{code_content if code_content else '（无代码成果）'}

请综合评估代码质量、完成度和工作量，给出评价意见和评分。

以JSON格式输出：
- comment: 评价意见（约200字，具体、有针对性，提及亮点和可改进之处）
- score: 评分（0-100的整数，60以下为不合格，60-69需修改，70-89合格，90-100优秀）

只输出JSON，不要有其他文字。"""

        if not self.api_key or not self.base_url:
            return {
                "comment": f"（API未配置，无法生成评价）{member_name}完成了任务「{task_name}」，请手动评价。",
                "score": 0,
            }

        try:
            import asyncio
            messages = [{"role": "user", "content": prompt}]
            result_text = asyncio.run(self._call_api(messages, temperature=0.3))

            result_text = result_text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]

            parsed = json.loads(result_text.strip())
            return {
                "comment": parsed.get("comment", ""),
                "score": int(parsed.get("score", 0)),
            }
        except Exception as e:
            logger.error(f"AI代码评价失败: {e}")
            return {
                "comment": f"（AI评价生成失败：{str(e)}）请手动编辑评价意见。",
                "score": 0,
            }

    def _get_mock_evaluation(self, task_info: Dict[str, Any], deliveries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """返回模拟评价结果（用于测试或API未配置时）"""
        has_delivery = len(deliveries) > 0
        return {
            "level": "qualified" if has_delivery else "need_revision",
            "comment": f"任务已完成，共提交{len(deliveries)}个交付物。交付物质量符合基本要求。" if has_delivery else "未找到交付物，建议补充成果提交。",
            "bonus_score": 1 if has_delivery else 0
        }

    def check_task_completion(
        self,
        task_name: str,
        task_status: str,
        report_content: str
    ) -> Dict[str, Any]:
        """
        核验任务完成情况

        Args:
            task_name: 任务名称
            task_status: 系统中的任务状态
            report_content: 周报中关于该任务的描述

        Returns:
            核验结果
        """
        if not report_content:
            return {
                "task_name": task_name,
                "status_match": False,
                "issue": "周报中未提及此任务",
                "suggestion": "建议在周报中说明此任务的完成情况"
            }

        prompt = f"""请判断以下周报内容是否表明任务已完成：

任务名称：{task_name}
系统状态：{task_status}
周报内容：{report_content}

请以JSON格式输出判断结果：
- task_name: 任务名称
- status_match: 周报描述与系统状态是否一致
- completion_status: 周报中体现的完成状态
- issue: 发现的问题（如有）
- suggestion: 建议（如有）

只输出JSON。"""

        if not self.api_key or not self.base_url:
            return {
                "task_name": task_name,
                "status_match": True,
                "completion_status": "周报已提及",
                "issue": None,
                "suggestion": None
            }

        try:
            import asyncio
            messages = [{"role": "user", "content": prompt}]
            result_text = asyncio.run(self._call_api(messages))

            result_text = result_text.strip()
            if result_text.startswith("```json"):
                result_text = result_text[7:]
            if result_text.startswith("```"):
                result_text = result_text[3:]
            if result_text.endswith("```"):
                result_text = result_text[:-3]

            return json.loads(result_text.strip())
        except Exception as e:
            logger.error(f"任务核验失败: {e}")
            return {
                "task_name": task_name,
                "status_match": True,
                "completion_status": "未知",
                "issue": None,
                "suggestion": None
            }
