"""
日期时间工具函数
"""

from datetime import datetime, date, timedelta
from typing import Tuple, Optional

def get_current_week() -> Tuple[date, date]:
    """
    获取当前周的开始和结束日期

    Returns:
        (start_date, end_date) 当前周的起止日期
    """
    today = date.today()
    # 获取本周周一
    start_of_week = today - timedelta(days=today.weekday())
    # 获取本周周日
    end_of_week = start_of_week + timedelta(days=6)
    return start_of_week, end_of_week

def get_week_number(dt: date) -> int:
    """
    获取日期所在周的周数

    Args:
        dt: 日期

    Returns:
        周数 (1-53)
    """
    return dt.isocalendar()[1]

def format_date(dt: date) -> str:
    """格式化日期为字符串"""
    return dt.strftime("%Y-%m-%d")

def format_datetime(dt: datetime) -> str:
    """格式化日期时间为字符串"""
    return dt.strftime("%Y-%m-%d %H:%M:%S")

def parse_date(date_str: str) -> date:
    """解析日期字符串"""
    return datetime.strptime(date_str, "%Y-%m-%d").date()

def is_overdue(deadline: date, status: str) -> bool:
    """
    判断任务是否延期

    Args:
        deadline: 截止日期
        status: 当前状态

    Returns:
        是否延期
    """
    if status in ["completed", "submitted"]:
        return False
    return date.today() > deadline

def calculate_page(total: int, page_size: int) -> Tuple[int, int]:
    """
    计算分页参数

    Args:
        total: 总记录数
        page_size: 每页记录数

    Returns:
        (total_pages, offset)
    """
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
    return total_pages

def generate_week_name(year: int, week: int) -> str:
    """
    生成周次名称

    Args:
        year: 年份
        week: 周数

    Returns:
        周次名称，如 "2026年第19周"
    """
    return f"{year}年第{week}周"
