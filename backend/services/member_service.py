"""人员管理服务"""

from sqlalchemy.orm import Session
from typing import Optional
from backend.models import Member
from backend.utils.exceptions import ResourceNotFoundException, DuplicateResourceException


def get_member_list(
    db: Session,
    keyword: Optional[str] = None,
    unit: Optional[str] = None,
    skill_tag: Optional[str] = None,
    is_backbone: Optional[bool] = None,
    status: Optional[str] = "active",
    page: int = 1,
    page_size: int = 20
) -> dict:
    query = db.query(Member)

    if keyword:
        query = query.filter(Member.name.like(f"%{keyword}%"))
    if unit:
        query = query.filter(Member.unit == unit)
    if is_backbone is not None:
        query = query.filter(Member.is_backbone == is_backbone)
    if status:
        query = query.filter(Member.status == status)
    if skill_tag:
        query = query.filter(Member.skill_tags.contains([skill_tag]))

    total = query.count()
    members = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [_member_to_dict(m) for m in members],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
    }


def create_member(db: Session, data) -> dict:
    existing = db.query(Member).filter(Member.name == data.name).first()
    if existing:
        raise DuplicateResourceException("人员", data.name)

    member = Member(
        name=data.name,
        unit=data.unit,
        contact=data.contact,
        email=data.email,
        skill_tags=data.skill_tags,
        is_backbone=data.is_backbone,
        status="active"
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return _member_to_dict(member)


def get_member_by_id(db: Session, member_id: int) -> dict:
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise ResourceNotFoundException("人员", member_id)
    return _member_to_dict(member)


def update_member(db: Session, member_id: int, data) -> dict:
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise ResourceNotFoundException("人员", member_id)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)
    return _member_to_dict(member)


def update_member_status(db: Session, member_id: int, new_status: str) -> dict:
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise ResourceNotFoundException("人员", member_id)

    member.status = new_status
    db.commit()
    db.refresh(member)
    return {"id": member.id, "status": member.status}


def _member_to_dict(m: Member) -> dict:
    return {
        "id": m.id,
        "name": m.name,
        "unit": m.unit,
        "contact": m.contact,
        "email": m.email,
        "skill_tags": m.skill_tags or [],
        "is_backbone": m.is_backbone,
        "status": m.status,
        "created_at": m.created_at,
        "updated_at": m.updated_at
    }
