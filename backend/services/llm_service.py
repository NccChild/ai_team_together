"""
大模型服务
用于调用 DeepSeek / Qwen / MiniMax 等大模型 API
"""

import os
import json
import asyncio
import logging
from typing import Dict, Any, List, Optional
import httpx
from backend.config import LLM_PROVIDER, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL_NAME, LLM_TIMEOUT, PROMPT_DIR

logger = logging.getLogger(__name__)


def load_prompt_template(filename: str, default: str) -> str:
    """从 docs/prompts/ 加载 Prompt 模板，文件不存在时返回默认值"""
    filepath = os.path.join(PROMPT_DIR, filename)
    if os.path.isfile(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            # 提取 ``` ... ``` 代码块中的模板内容
            start = content.find("```\n")
            if start != -1:
                start += 4  # 跳过 "```\n"
                end = content.find("\n```", start)
                if end != -1:
                    return content[start:end]
            # 无代码块则返回全文
            return content
        except Exception as e:
            logger.warning(f"读取 Prompt 模板 {filename} 失败: {e}")
    return default


class LLMService:
    """大模型服务类"""

    def __init__(self):
        self.provider = LLM_PROVIDER
        self.api_key = LLM_API_KEY
        self.base_url = LLM_BASE_URL
        self.model_name = LLM_MODEL_NAME
        self.timeout = LLM_TIMEOUT

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """通用 API 调用方法"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self._get_headers(),
                    json={
                        "model": self.model_name,
                        "messages": messages,
                        "temperature": temperature,
                    },
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"LLM API 调用失败: {e}")
            raise

    def _parse_json_response(self, text: str) -> dict:
        """从 LLM 返回文本中提取并解析 JSON"""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())

    # ------------------------------------------------------------------
    # 个人周报结构化分析
    # ------------------------------------------------------------------

    def analyze_weekly_report(
        self,
        report_content: str,
        member_name: str,
        tasks: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """分析周报，提取结构化信息"""
        task_info = "\n".join([
            f"- 任务{i+1}: {t['name']} (状态: {t['status']}, 截止: {t.get('deadline', '未设置')})"
            for i, t in enumerate(tasks)
        ]) if tasks else "本周暂无任务安排"

        prompt_template = load_prompt_template(
            "weekly_report_analysis_prompt.md",
            # 默认 Prompt（文件不存在时的 fallback）
            """你是一个专业的周报分析助手。请分析以下周报内容，提取结构化信息。

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
        )

        prompt = prompt_template.format(
            member_name=member_name,
            task_info=task_info,
            report_content=report_content,
        )

        if not self.api_key or not self.base_url:
            return self._get_mock_analysis(member_name, tasks)

        try:
            messages = [{"role": "user", "content": prompt}]
            result_text = asyncio.run(self._call_api(messages))
            return self._parse_json_response(result_text)
        except Exception as e:
            logger.error(f"周报分析失败: {e}")
            return self._get_mock_analysis(member_name, tasks)

    def _get_mock_analysis(self, member_name: str, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "main_work": ["按要求完成了本周安排的工作任务"],
            "matched_tasks": [],
            "delivery_status": {"has_deliverable": True, "reason": "已完成基本任务"},
            "quality_assessment": "合格",
            "problems_found": [],
            "next_week_items": ["继续推进相关工作"],
            "candidate_tasks": [],
            "contribution_summary": f"{member_name}本周按计划完成了安排的工作任务。",
            "risk_alerts": [],
        }

    # ------------------------------------------------------------------
    # 专班周报草稿生成（调用大模型）
    # ------------------------------------------------------------------

    def generate_team_summary(
        self,
        weekly_reports: List[Dict[str, Any]],
        week_name: str,
    ) -> Dict[str, Any]:
        """
        生成专班周报草稿

        Args:
            weekly_reports: 周报列表，每项含 member_name / work_content /
                            main_results / problems / next_week_plan / analysis
            week_name: 周次名称（如 "2026年5月第3周"）

        Returns:
            {"summary_text": "...", "generated": true/false}
            其中 summary_text 为大模型生成的草稿文本
        """
        if not weekly_reports:
            return {"summary_text": "", "generated": False}

        # 组装每位成员的详细信息
        parts = []
        for r in weekly_reports:
            name = r.get("member_name", "未知")
            lines = [f"### {name}"]
            if r.get("work_content"):
                lines.append(f"- 本周工作：{r['work_content']}")
            if r.get("main_results"):
                lines.append(f"- 主要成果：{r['main_results']}")
            if r.get("problems"):
                lines.append(f"- 存在问题：{r['problems']}")
            if r.get("next_week_plan"):
                lines.append(f"- 下周计划：{r['next_week_plan']}")
            analysis = r.get("analysis") or {}
            if analysis.get("contribution_summary"):
                lines.append(f"- 贡献摘要：{analysis['contribution_summary']}")
            parts.append("\n".join(lines))

        weekly_reports_summary = "\n\n".join(parts)

        prompt_template = load_prompt_template(
            "team_weekly_summary_prompt.md",
            # 默认 Prompt（文件不存在时的 fallback）
            """请根据以下专班成员的周报内容，生成专班周报草稿。

周次：{week_name}

{weekly_reports_summary}

请生成一份简洁的专班周报草稿，包含：
1. 本周总体情况概述（1-2句话）
2. 主要工作成果（3-5个要点）
3. 存在问题和建议（2-3个要点）
4. 下周工作计划（3-5个要点）

要求：语言简洁专业，适合向领导汇报，突出重点成果，总字数控制在500字以内。
直接输出周报内容，不要额外说明。"""
        )

        prompt = prompt_template.format(
            week_name=week_name,
            weekly_reports_summary=weekly_reports_summary,
        )

        if not self.api_key or not self.base_url:
            return {"summary_text": f"{week_name}专班周报草稿（API未配置）", "generated": False}

        try:
            messages = [{"role": "user", "content": prompt}]
            result_text = asyncio.run(self._call_api(messages, temperature=0.5))
            return {"summary_text": result_text.strip(), "generated": True}
        except Exception as e:
            logger.error(f"生成专班周报失败: {e}")
            return {"summary_text": f"{week_name}专班周报草稿（生成失败）", "generated": False}

    # ------------------------------------------------------------------
    # AI 任务评价
    # ------------------------------------------------------------------

    def evaluate_task(
        self,
        task_info: Dict[str, Any],
        member_name: str,
        deliveries: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """AI 评价任务完成情况"""
        delivery_info = "\n".join([
            f"- 成果{i+1}: {d.get('name', '未命名')} (类型: {d.get('delivery_type', '未分类')})\n"
            f"  说明: {d.get('description', '无')}\n  链接: {d.get('link', '无')}"
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
            messages = [{"role": "user", "content": prompt}]
            result_text = asyncio.run(self._call_api(messages, temperature=0.3))
            return self._parse_json_response(result_text)
        except Exception as e:
            logger.error(f"任务评价失败: {e}")
            return self._get_mock_evaluation(task_info, deliveries)

    def _get_mock_evaluation(self, task_info: Dict[str, Any], deliveries: List[Dict[str, Any]]) -> Dict[str, Any]:
        has_delivery = len(deliveries) > 0
        return {
            "level": "qualified" if has_delivery else "need_revision",
            "comment": f"任务已完成，共提交{len(deliveries)}个交付物。" if has_delivery else "未找到交付物，建议补充成果提交。",
            "bonus_score": 1 if has_delivery else 0,
        }

    # ------------------------------------------------------------------
    # 任务核验
    # ------------------------------------------------------------------

    def check_task_completion(
        self,
        task_name: str,
        task_status: str,
        report_content: str,
    ) -> Dict[str, Any]:
        """核验任务完成情况"""
        if not report_content:
            return {
                "task_name": task_name,
                "status_match": False,
                "issue": "周报中未提及此任务",
                "suggestion": "建议在周报中说明此任务的完成情况",
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
                "suggestion": None,
            }

        try:
            messages = [{"role": "user", "content": prompt}]
            result_text = asyncio.run(self._call_api(messages))
            return self._parse_json_response(result_text)
        except Exception as e:
            logger.error(f"任务核验失败: {e}")
            return {
                "task_name": task_name,
                "status_match": True,
                "completion_status": "未知",
                "issue": None,
                "suggestion": None,
            }
