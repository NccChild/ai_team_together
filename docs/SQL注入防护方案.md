# SQL 注入防护方案

## 概述

本项目采用 **SQLAlchemy ORM + FastAPI 类型校验 + Pydantic Schema 验证** 三层防护体系，从架构层面杜绝 SQL 注入风险。整个后端代码中不存在任何裸 SQL 或字符串拼接的查询。

---

## 第一层：SQLAlchemy ORM（数据库层）

### ORM 查询 vs 裸 SQL

所有数据库操作统一使用 SQLAlchemy ORM 的 Query API，查询参数由底层驱动自动绑定，不做字符串拼接。

```python
# 安全：ORM 参数化查询
task = db.query(Task).filter(Task.id == task_id).first()

# 对比——如果使用裸 SQL 拼接会有注入风险
# db.execute(f"SELECT * FROM tasks WHERE id = {task_id}")  # ❌ 禁止
```

### like 模糊搜索也安全

模糊搜索虽然使用 `%` 拼接值，但 SQLAlchemy 会将其作为 bind parameter 发送给数据库，不会导致注入：

```python
# 安全：%keyword% 作为参数值传入，不参与 SQL 编译
query = query.filter(Member.name.like(f"%{keyword}%"))
```

生成的 SQL 为：
```sql
SELECT * FROM members WHERE name LIKE ?   -- 参数: %keyword%
```

### 聚合函数与复杂查询

复杂查询也完全在 ORM 框架内完成，无需退回到裸 SQL：

```python
db.query(func.coalesce(func.sum(Evaluation.final_score), 0)) \
   .join(Task, Evaluation.task_id == Task.id) \
   .filter(Task.assignee_id == member_id) \
   .scalar()
```

### 项目总览

整个项目涉及数据库操作的路由/模块清单：

| 模块 | 查询方式 | SQL注入风险 |
|------|----------|------------|
| `routers/auth.py` | ORM | 无 |
| `routers/members.py` | ORM | 无 |
| `routers/tasks.py` | ORM | 无 |
| `routers/weeks.py` | ORM | 无 |
| `routers/evaluations.py` | ORM | 无 |
| `routers/statistics.py` | ORM | 无 |
| `routers/weekly_reports.py` | ORM | 无 |
| `routers/achievements.py` | ORM | 无 |
| `routers/dictionaries.py` | ORM | 无 |
| `routers/export.py` | ORM | 无 |

**未在代码中发现任何 `text()`、`execute()` 裸 SQL 调用或字符串拼接 SQL 的行为。**

---

## 第二层：FastAPI 类型校验（接口层）

FastAPI 利用 Python type hints 在路由入口处强制执行类型约束。所有路径参数和查询参数在进入业务逻辑之前已被校验：

```python
@router.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    # task_id 如果不是合法的 int，FastAPI 直接返回 422，不会进入函数体
```

支持的校验机制：
- 路径参数类型标注（`int`、`str`、`UUID` 等）
- `Query(ge=1, le=100)` 数值范围约束
- `Query(None, max_length=50)` 字符串长度约束

---

## 第三层：Pydantic Schema（数据模型层）

所有请求 body 通过 Pydantic 模型定义，在反序列化阶段完成类型校验，非法数据无法到达数据库：

```python
class MemberCreate(MemberBase):
    username: str = Field(..., description="登录用户名")
    password: str = Field(..., min_length=6, description="登录密码")

class MemberBase(BaseModel):
    name: str
    unit: str
    contact: Optional[str] = None
    email: Optional[str] = None
    skill_tags: Optional[List[str]] = []
```

校验效果：
- `member_id: int` → 传入 `"1; DROP TABLE members"` 会直接校验失败
- `email: Optional[str]` → 不会影响 SQL 结构
- `skill_tags: Optional[List[str]]` → 列表类型由 Pydantic 保证

---

## 数据库引擎加固

`database.py` 连接配置本身也做了安全加固：

```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # 每次连接前检测有效性，防止使用已断开的连接
    echo=False               # 生产环境关闭 SQL 日志，避免敏感信息泄露
)
```

---

## 总结

| 防护层级 | 机制 | 作用 |
|----------|------|------|
| 数据库层 | SQLAlchemy ORM | 参数化查询，杜绝 SQL 拼接 |
| 接口层 | FastAPI 类型校验 | 在参数进入业务逻辑前拦截非法输入 |
| 数据模型层 | Pydantic Schema | 请求体反序列化时执行类型约束 |
| 运维层 | echo=False | 关闭 SQL 日志输出，防止敏感信息泄露 |

三层防护叠加，使得攻击者无法通过任何外部输入改变 SQL 语句的结构，从根本上消除了 SQL 注入攻击面。
