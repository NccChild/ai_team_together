"""基础字典路由"""

from fastapi import APIRouter
from backend.schemas import ResponseModel
from backend.utils.response import success_response
from backend.services import dictionary_service
from backend.schemas import DictionaryItem

router = APIRouter()


@router.get("/dictionaries", response_model=ResponseModel, summary="获取所有字典")
def get_all_dictionaries():
    result = dictionary_service.get_all_dictionaries()
    # 转换回 Pydantic 对象保持原有响应格式
    formatted = {}
    for k, items in result.items():
        formatted[k] = [DictionaryItem(value=it["value"], label=it["label"]) for it in items]
    return success_response(formatted)


@router.get("/dictionaries/{dict_type}", response_model=ResponseModel, summary="获取指定字典")
def get_dictionary(dict_type: str):
    result = dictionary_service.get_dictionary(dict_type)
    if result is None:
        return success_response({"error": f"字典类型 '{dict_type}' 不存在"})
    items = [DictionaryItem(value=it["value"], label=it["label"]) for it in result["items"]]
    return success_response({"type": result["type"], "items": items})
