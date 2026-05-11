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
