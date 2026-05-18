"""
基础字典路由
"""

from fastapi import APIRouter, Query
from typing import Optional, List
from backend.config import (
    TASK_TYPES, TASK_DIFFICULTY, TASK_STATUS,
    EVALUATION_LEVELS, DELIVERY_TYPES, SKILL_TAGS,
    MEMBER_STATUS, WEEK_STATUS, BONUS_ITEMS
)
from backend.schemas import DictionaryItem, DictionaryResponse, ResponseModel
from backend.utils.response import success_response

router = APIRouter()

@router.get("/dictionaries", response_model=ResponseModel, summary="获取所有字典")
def get_all_dictionaries():
    """获取所有字典类型"""
    dictionaries = {
        "task_type": [
            DictionaryItem(value=k, label=v) for k, v in TASK_TYPES.items()
        ],
        "task_difficulty": [
            DictionaryItem(value=k, label=v) for k, v in TASK_DIFFICULTY.items()
        ],
        "task_status": [
            DictionaryItem(value=k, label=v) for k, v in TASK_STATUS.items()
        ],
        "evaluation_level": [
            DictionaryItem(value=k, label=v) for k, v in EVALUATION_LEVELS.items()
        ],
        "delivery_type": [
            DictionaryItem(value=k, label=v) for k, v in DELIVERY_TYPES.items()
        ],
        "skill_tag": [
            DictionaryItem(value=k, label=v) for k, v in SKILL_TAGS.items()
        ],
        "member_status": [
            DictionaryItem(value=k, label=v) for k, v in MEMBER_STATUS.items()
        ],
        "week_status": [
            DictionaryItem(value=k, label=v) for k, v in WEEK_STATUS.items()
        ],
        "bonus_item": [
            DictionaryItem(value=k, label=v) for k, v in BONUS_ITEMS.items()
        ]
    }

    return success_response(dictionaries)

@router.get("/dictionaries/{dict_type}", response_model=ResponseModel, summary="获取指定字典")
def get_dictionary(dict_type: str):
    """获取指定类型的字典"""
    dictionaries_map = {
        "task_type": TASK_TYPES,
        "task_difficulty": TASK_DIFFICULTY,
        "task_status": TASK_STATUS,
        "evaluation_level": EVALUATION_LEVELS,
        "delivery_type": DELIVERY_TYPES,
        "skill_tag": SKILL_TAGS,
        "member_status": MEMBER_STATUS,
        "week_status": WEEK_STATUS,
        "bonus_item": BONUS_ITEMS
    }

    if dict_type not in dictionaries_map:
        return success_response({"error": f"字典类型 '{dict_type}' 不存在"})

    items = [
        DictionaryItem(value=k, label=v)
        for k, v in dictionaries_map[dict_type].items()
    ]

    return success_response({
        "type": dict_type,
        "items": items
    })
