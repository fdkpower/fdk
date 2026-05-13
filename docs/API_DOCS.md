# GenSet Hub API 文档

## 📋 API 概览

**基础 URL**: `https://api.genset-hub.com/api`

**API 版本**: `v1`

**响应格式**: JSON

---

## 🔐 认证方式

### JWT 认证

所有受保护的端点都需要在请求头中包含 JWT Token：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token 有效期
- **Access Token**: 1 小时
- **Refresh Token**: 30 天

---

## 📝 标准响应格式

### 成功响应 (200)

```json
{
    "code": 200,
    "message": "成功",
    "data": {
        // 具体数据
    }
}
```

### 错误响应

```json
{
    "code": 400,
    "message": "请求参数有误",
    "errors": [
        {
            "field": "email",
            "message": "邮箱格式不正确"
        }
    ]
}
```

### 常见错误码

| 码 | 含义 |
|----|------|
| 200 | 成功 |
| 400 | 请求参数有误 |
| 401 | 未授权 / Token 过期 |
| 403 | 禁止访问 / 权限不足 |
| 404 | 资源不存在 |
| 409 | 冲突 / 资源已存在 |
| 500 | 服务器错误 |

---

## 🔓 认证接口

### 1. 用户注册

**请求**:
```
POST /auth/register
Content-Type: application/json
```

**请求体**:
```json
{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "confirm_password": "SecurePass123!"
}
```

**响应** (201):
```json
{
    "code": 201,
    "message": "注册成功",
    "data": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "access_token": "eyJhbGc...",
        "refresh_token": "eyJhbGc..."
    }
}
```

**验证规则**:
- 用户名: 3-50 字符，只能包含字母、数字、下划线
- 邮箱: 有效的邮箱格式
- 密码: 至少 8 字符，必须包含大小写字母和数字

---

### 2. 用户登录

**请求**:
```
POST /auth/login
Content-Type: application/json
```

**请求体**:
```json
{
    "email": "john@example.com",
    "password": "SecurePass123!"
}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "登录成功",
    "data": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "avatar_url": "https://...",
        "access_token": "eyJhbGc...",
        "refresh_token": "eyJhbGc..."
    }
}
```

---

### 3. 刷新令牌

**请求**:
```
POST /auth/refresh
Content-Type: application/json
Authorization: Bearer {refresh_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "Token 刷新成功",
    "data": {
        "access_token": "eyJhbGc...",
        "refresh_token": "eyJhbGc..."
    }
}
```

---

### 4. 用户登出

**请求**:
```
POST /auth/logout
Authorization: Bearer {access_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "登出成功"
}
```

---

## ❓ 问题接口

### 1. 获取问题列表

**请求**:
```
GET /questions?page=1&limit=20&sort=newest&status=open&tag=故障排查
```

**查询参数**:
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20，最大 100）
- `sort`: 排序方式 (newest, popular, unanswered, active)
- `status`: 问题状态 (open, closed, solved)
- `tag`: 标签名称（可多个）

**响应** (200):
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "total": 150,
        "page": 1,
        "limit": 20,
        "items": [
            {
                "id": 1,
                "title": "发电机组无法启动怎么办？",
                "description": "我的发电机组突然无法启动，检查了燃油和油门...",
                "view_count": 245,
                "answer_count": 3,
                "upvote_count": 5,
                "status": "solved",
                "tags": ["故障排查", "启动系统"],
                "user": {
                    "id": 10,
                    "username": "mechanic_tom",
                    "avatar_url": "https://..."
                },
                "created_at": "2026-05-10T10:30:00Z"
            }
        ]
    }
}
```

---

### 2. 创建问题

**请求**:
```
POST /questions
Content-Type: application/json
Authorization: Bearer {access_token}
```

**请求体**:
```json
{
    "title": "发电机组无法启动怎么办？",
    "description": "我的发电机组突然无法启动，检查了燃油和油门，但仍无反应。这是什么原因？",
    "tags": ["故障排查", "启动系统"]
}
```

**响应** (201):
```json
{
    "code": 201,
    "message": "问题创建成功",
    "data": {
        "id": 101,
        "title": "发电机组无法启动怎么办？",
        "description": "我的发电机组突然无法启动...",
        "user_id": 1,
        "status": "open",
        "created_at": "2026-05-13T12:00:00Z"
    }
}
```

---

### 3. 获取问题详情

**请求**:
```
GET /questions/:id
```

**响应** (200):
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "id": 1,
        "title": "发电机组无法启动怎么办？",
        "description": "我的发电机组突然无法启动...",
        "content_html": "<p>我的发电机组突然无法启动...</p>",
        "view_count": 246,
        "answer_count": 3,
        "upvote_count": 5,
        "status": "solved",
        "is_featured": false,
        "tags": ["故障排查", "启动系统"],
        "user": {
            "id": 10,
            "username": "mechanic_tom",
            "avatar_url": "https://...",
            "reputation_score": 1250
        },
        "accepted_answer": {
            "id": 5,
            "content": "检查电池电压和点火系统...",
            "user": { /* user info */ },
            "upvote_count": 8
        },
        "answers": [
            {
                "id": 5,
                "content": "检查电池电压和点火系统...",
                "upvote_count": 8,
                "is_accepted": true,
                "user": { /* user info */ }
            }
        ],
        "created_at": "2026-05-10T10:30:00Z",
        "updated_at": "2026-05-10T10:30:00Z"
    }
}
```

---

### 4. 编辑问题

**请求**:
```
PUT /questions/:id
Content-Type: application/json
Authorization: Bearer {access_token}
```

**请求体**:
```json
{
    "title": "发电机组无法启动的解决方案",
    "description": "更新的描述内容...",
    "tags": ["故障排查", "启动系统", "电气系统"]
}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "问题已更新"
}
```

---

### 5. 删除问题

**请求**:
```
DELETE /questions/:id
Authorization: Bearer {access_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "问题已删除"
}
```

---

## 💬 回答接口

### 1. 提交回答

**请求**:
```
POST /questions/:id/answers
Content-Type: application/json
Authorization: Bearer {access_token}
```

**请求体**:
```json
{
    "content": "检查以下几点：\n1. 电池电压是否足够...\n2. 点火系统是否正常..."
}
```

**响应** (201):
```json
{
    "code": 201,
    "message": "回答已提交",
    "data": {
        "id": 102,
        "question_id": 1,
        "content": "检查以下几点...",
        "user_id": 2,
        "upvote_count": 0,
        "is_accepted": false,
        "created_at": "2026-05-13T12:10:00Z"
    }
}
```

---

### 2. 编辑回答

**请求**:
```
PUT /answers/:id
Content-Type: application/json
Authorization: Bearer {access_token}
```

**请求体**:
```json
{
    "content": "更新的回答内容..."
}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "回答已更新"
}
```

---

### 3. 删除回答

**请求**:
```
DELETE /answers/:id
Authorization: Bearer {access_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "回答已删除"
}
```

---

### 4. 采纳回答

**请求**:
```
POST /answers/:id/accept
Authorization: Bearer {access_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "回答已采纳",
    "data": {
        "accepted_at": "2026-05-13T12:20:00Z"
    }
}
```

---

## 👍 投票接口

### 1. 点赞

**请求**:
```
POST /votes
Content-Type: application/json
Authorization: Bearer {access_token}
```

**请求体**:
```json
{
    "votable_type": "question",  // 或 "answer"
    "votable_id": 1,
    "vote_type": 1  // 1 = upvote, -1 = downvote
}
```

**响应** (201):
```json
{
    "code": 201,
    "message": "点赞成功",
    "data": {
        "id": 501,
        "votable_type": "question",
        "votable_id": 1,
        "vote_type": 1
    }
}
```

---

### 2. 取消或修改投票

**请求**:
```
PUT /votes/:id
Content-Type: application/json
Authorization: Bearer {access_token}
```

**请求体**:
```json
{
    "vote_type": -1  // 改为点踩
}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "投票已更新"
}
```

---

### 3. 取消投票

**请求**:
```
DELETE /votes/:id
Authorization: Bearer {access_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "投票已取消"
}
```

---

## 🔍 搜索接口

### 1. 全文搜索

**请求**:
```
GET /search?q=发电机组&type=questions&page=1&limit=20
```

**查询参数**:
- `q`: 搜索关键词（必需）
- `type`: 搜索类型 (questions, answers, users, tags)
- `page`: 页码
- `limit`: 每页数量

**响应** (200):
```json
{
    "code": 200,
    "message": "搜索成功",
    "data": {
        "questions": {
            "total": 45,
            "items": [
                {
                    "id": 1,
                    "title": "发电机组无法启动怎么办？",
                    "snippet": "...发电机组突然无法启动，检查了燃油和油门..."
                }
            ]
        },
        "users": {
            "total": 12,
            "items": [
                {
                    "id": 10,
                    "username": "mechanic_tom",
                    "avatar_url": "https://..."
                }
            ]
        }
    }
}
```

---

## 👤 用户接口

### 1. 获取当前用户信息

**请求**:
```
GET /users/me
Authorization: Bearer {access_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "full_name": "John Doe",
        "avatar_url": "https://...",
        "bio": "发电机组维修工程师",
        "location": "北京",
        "website": "https://example.com",
        "reputation_score": 850,
        "user_level": 5,
        "question_count": 12,
        "answer_count": 35,
        "accepted_answer_count": 8,
        "is_verified": true,
        "created_at": "2026-01-01T00:00:00Z"
    }
}
```

---

### 2. 获取用户资料

**请求**:
```
GET /users/:id
```

**响应** (200):
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "id": 10,
        "username": "mechanic_tom",
        "avatar_url": "https://...",
        "bio": "资深维修师傅",
        "reputation_score": 2450,
        "user_level": 8,
        "question_count": 25,
        "answer_count": 89,
        "accepted_answer_count": 34,
        "followers_count": 145,
        "following_count": 28,
        "created_at": "2025-06-01T00:00:00Z"
    }
}
```

---

### 3. 更新用户资料

**请求**:
```
PUT /users/me
Content-Type: application/json
Authorization: Bearer {access_token}
```

**请求体**:
```json
{
    "full_name": "John Doe",
    "bio": "发电机组维修工程师",
    "location": "北京",
    "website": "https://example.com",
    "avatar_url": "https://..."
}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "用户资料已更新"
}
```

---

### 4. 用户排行榜

**请求**:
```
GET /users/leaderboard?sort=reputation&limit=100
```

**查询参数**:
- `sort`: 排序方式 (reputation, questions, answers, followers)
- `limit`: 返回数量

**响应** (200):
```json
{
    "code": 200,
    "message": "获取成功",
    "data": [
        {
            "rank": 1,
            "id": 10,
            "username": "mechanic_tom",
            "avatar_url": "https://...",
            "reputation_score": 2450,
            "answer_count": 89
        }
    ]
}
```

---

## 🏷️ 标签接口

### 1. 获取标签列表

**请求**:
```
GET /tags?page=1&limit=50&sort=popular
```

**响应** (200):
```json
{
    "code": 200,
    "message": "获取成功",
    "data": [
        {
            "id": 1,
            "name": "故障排查",
            "slug": "troubleshooting",
            "description": "发电机组故障问题和诊断",
            "question_count": 245,
            "color": "#ff6b6b"
        }
    ]
}
```

---

### 2. 获取标签详情

**请求**:
```
GET /tags/:slug
```

**响应** (200):
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "id": 1,
        "name": "故障排查",
        "description": "发电机组故障问题和诊断",
        "question_count": 245,
        "recent_questions": [
            {
                "id": 1,
                "title": "发电机组无法启动...",
                "answer_count": 3,
                "created_at": "2026-05-10T10:30:00Z"
            }
        ]
    }
}
```

---

## 🔔 通知接口

### 1. 获取通知列表

**请求**:
```
GET /notifications?page=1&limit=20&unread_only=true
Authorization: Bearer {access_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "total": 12,
        "unread_count": 5,
        "items": [
            {
                "id": 301,
                "type": "question_replied",
                "actor": {
                    "id": 2,
                    "username": "tom",
                    "avatar_url": "https://..."
                },
                "content": "tom 回答了你的问题",
                "related_question_id": 1,
                "is_read": false,
                "created_at": "2026-05-13T12:00:00Z"
            }
        ]
    }
}
```

---

### 2. 标记通知为已读

**请求**:
```
PUT /notifications/:id/read
Authorization: Bearer {access_token}
```

**响应** (200):
```json
{
    "code": 200,
    "message": "通知已标记为已读"
}
```

---

## 📋 使用示例

### 示例 1: 完整的提问流程

```javascript
// 1. 登录
const loginRes = await fetch('https://api.genset-hub.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
    })
});
const { data: { access_token } } = await loginRes.json();

// 2. 提问
const questionRes = await fetch('https://api.genset-hub.com/api/questions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
    },
    body: JSON.stringify({
        title: '发电机组无法启动',
        description: '我的发电机组突然无法启动...',
        tags: ['故障排查', '启动系统']
    })
});
const question = await questionRes.json();
console.log('提问成功：', question.data.id);
```

---

**API 文档完成！** 详见每个端点的具体调用方式。
