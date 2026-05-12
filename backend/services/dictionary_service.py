"""基础字典服务"""

from backend.config import (
    TASK_TYPES, TASK_DIFFICULTY, TASK_STATUS,
    EVALUATION_LEVELS, DELIVERY_TYPES, SKILL_TAGS,
    MEMBER_STATUS, WEEK_STATUS, BONUS_ITEMS
)

DICTIONARIES_MAP = {
    "task_type": TASK_TYPES,
    "task_difficulty": TASK_DIFFICULTY,
    "task_status": TASK_STATUS,
    "evaluation_level": EVALUATION_LEVELS,
    "delivery_type": DELIVERY_TYPES,
    "skill_tag": SKILL_TAGS,
    "member_status": MEMBER_STATUS,
    "week_status": WEEK_STATUS,
    "bonus_item": BONUS_ITEMS,
}


def get_all_dictionaries() -> dict:
    return {name: _dict_to_items(d) for name, d in DICTIONARIES_MAP.items()}


def get_dictionary(dict_type: str) -> dict:
    if dict_type not in DICTIONARIES_MAP:
        return None
    return {"type": dict_type, "items": _dict_to_items(DICTIONARIES_MAP[dict_type])}


def _dict_to_items(d: dict) -> list:
    return [{"value": k, "label": v} for k, v in d.items()]
