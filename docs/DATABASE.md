# GenSet Hub 数据库设计

## 📊 数据库架构概览

**数据库系统**: PostgreSQL 14+

**字符集**: UTF-8

**总表数**: 9

---

## 📋 数据库表设计

### 1. 用户表 (users)

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    location VARCHAR(100),
    website VARCHAR(255),
    
    -- 用户等级和积分
    reputation_score INT DEFAULT 0,
    user_level INT DEFAULT 1,
    is_verified BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    
    -- 统计信息
    question_count INT DEFAULT 0,
    answer_count INT DEFAULT 0,
    accepted_answer_count INT DEFAULT 0,
    followers_count INT DEFAULT 0,
    following_count INT DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    
    -- 索引
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_reputation (reputation_score DESC)
);
```

**字段说明**:
- `username`: 唯一用户名，用于登录和展示
- `password_hash`: bcrypt 加密的密码
- `reputation_score`: 用户声誉值，通过点赞获得
- `user_level`: 用户等级（1-10），根据声誉值自动提升

---

### 2. 问题表 (questions)

```sql
CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(300) UNIQUE,  -- SEO 友好的 URL
    description TEXT NOT NULL,
    content_html TEXT,  -- 渲染后的 HTML
    
    -- 状态和属性
    status VARCHAR(20) DEFAULT 'open',  -- open, closed, solved
    is_featured BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    
    -- 统计信息
    view_count INT DEFAULT 0,
    answer_count INT DEFAULT 0,
    upvote_count INT DEFAULT 0,
    downvote_count INT DEFAULT 0,
    
    -- 关联
    accepted_answer_id BIGINT,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    solved_at TIMESTAMP,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_view_count (view_count DESC),
    FULLTEXT INDEX idx_title_description (title, description)
);
```

**字段说明**:
- `slug`: 生成方式 `"问题id-url-slug"` 用于 SEO
- `status`: open 开放、closed 已关闭、solved 已解决
- `accepted_answer_id`: 指向被采纳的回答
- `view_count`: 页面浏览次数

---

### 3. 回答表 (answers)

```sql
CREATE TABLE answers (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    content_html TEXT,  -- 渲染后的 HTML
    
    -- 状态
    is_accepted BOOLEAN DEFAULT FALSE,
    
    -- 统计信息
    upvote_count INT DEFAULT 0,
    downvote_count INT DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    
    -- 索引
    INDEX idx_question_id (question_id),
    INDEX idx_user_id (user_id),
    INDEX idx_is_accepted (is_accepted),
    INDEX idx_created_at (created_at DESC)
);
```

**字段说明**:
- `is_accepted`: 是否被问题发布者采纳
- `accepted_at`: 采纳时间
- `upvote_count`: 点赞数

---

### 4. 标签表 (tags)

```sql
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(60) UNIQUE,
    description TEXT,
    icon_color VARCHAR(7),  -- HEX 颜色
    
    -- 统计
    question_count INT DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_name (name),
    INDEX idx_question_count (question_count DESC)
);
```

**标签分类示例**:
- 故障排查 - 发电机组故障问题和诊断
- 维修保养 - 定期维护和故障维修
- 安装调试 - 安装、初始化和调试
- 配件更换 - 配件选型和更换
- 软件设置 - 控制器软件和参数设置
- 电气 - 电气系统和连接
- 机械 - 机械系统和结构
- 供油系统 - 油箱和燃油系统
- 冷却系统 - 冷却液和散热
- 产品推荐 - 产品介绍和选型

---

### 5. 问题标签关联表 (question_tags)

```sql
CREATE TABLE question_tags (
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    
    PRIMARY KEY (question_id, tag_id),
    INDEX idx_tag_id (tag_id)
);
```

**说明**: 多对多关系表，一个问题可以有多个标签

---

### 6. 投票表 (votes)

```sql
CREATE TABLE votes (
    id BIGSERIAL PRIMARY KEY,
    
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    votable_type VARCHAR(20) NOT NULL,  -- 'question' 或 'answer'
    votable_id BIGINT NOT NULL,
    
    vote_type TINYINT NOT NULL,  -- 1 = upvote, -1 = downvote
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_votable (votable_type, votable_id),
    UNIQUE KEY uk_vote (user_id, votable_type, votable_id)
);
```

**字段说明**:
- 一个用户对同一对象只能投一次票
- `vote_type`: 1 表示点赞，-1 表示点踩

---

### 7. 用户关注表 (follows)

```sql
CREATE TABLE follows (
    id BIGSERIAL PRIMARY KEY,
    
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 约束
    UNIQUE KEY uk_follow (follower_id, following_id),
    CHECK (follower_id != following_id),
    
    -- 索引
    INDEX idx_follower_id (follower_id),
    INDEX idx_following_id (following_id)
);
```

**说明**: 用户关注关系

---

### 8. 通知表 (notifications)

```sql
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    type VARCHAR(50) NOT NULL,  -- 'question_replied', 'answer_upvoted' 等
    content TEXT,
    
    -- 关联资源
    related_question_id BIGINT REFERENCES questions(id) ON DELETE SET NULL,
    related_answer_id BIGINT REFERENCES answers(id) ON DELETE SET NULL,
    
    -- 状态
    is_read BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at DESC)
);
```

**通知类型**:
- `question_replied`: 你的问题有新回答
- `answer_accepted`: 你的回答被采纳
- `answer_upvoted`: 你的回答被点赞
- `user_followed`: 有人关注了你
- `user_mentioned`: 有人提到了你

---

### 9. 审计日志表 (audit_logs)

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    
    old_values JSON,
    new_values JSON,
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at DESC)
);
```

**说明**: 记录数据变更历史，用于审计和恢复

---

## 🔄 数据库关系图

```
users (用户)
  ├── questions (问题)
  │   ├── question_tags (问题-标签关联)
  │   │   └── tags (标签)
  │   └── answers (回答)
  │       ├── votes (投票)
  │       └── notifications (通知)
  ├── votes (投票)
  ├── follows (关注)
  └── notifications (通知)
```

---

## 📊 常见查询示例

### 1. 获取最热的问题

```sql
SELECT q.id, q.title, q.view_count, q.answer_count, u.username
FROM questions q
JOIN users u ON q.user_id = u.id
WHERE q.status = 'open'
ORDER BY q.view_count DESC
LIMIT 20;
```

### 2. 获取用户的所有回答

```sql
SELECT a.*, q.title, COUNT(v.id) as vote_count
FROM answers a
JOIN questions q ON a.question_id = q.id
LEFT JOIN votes v ON v.votable_type = 'answer' AND v.votable_id = a.id AND v.vote_type = 1
WHERE a.user_id = $1
GROUP BY a.id, q.id
ORDER BY a.created_at DESC;
```

### 3. 搜索问题

```sql
SELECT q.id, q.title, q.description, u.username
FROM questions q
JOIN users u ON q.user_id = u.id
WHERE MATCH(q.title, q.description) AGAINST($1 IN BOOLEAN MODE)
ORDER BY q.created_at DESC
LIMIT 20;
```

### 4. 获取用户排行榜

```sql
SELECT u.id, u.username, u.reputation_score, u.answer_count
FROM users u
WHERE u.is_admin = FALSE
ORDER BY u.reputation_score DESC
LIMIT 100;
```

### 5. 获取标签下的问题

```sql
SELECT q.*, COUNT(v.id) as upvote_count
FROM questions q
JOIN question_tags qt ON q.id = qt.question_id
JOIN tags t ON qt.tag_id = t.id
LEFT JOIN votes v ON v.votable_type = 'question' AND v.votable_id = q.id AND v.vote_type = 1
WHERE t.slug = $1
GROUP BY q.id
ORDER BY q.created_at DESC;
```

---

## 🔐 数据库权限管理

### 创建数据库用户

```sql
-- 创建应用用户
CREATE USER genset_app WITH PASSWORD 'strong_password_here';

-- 授予权限
GRANT CONNECT ON DATABASE genset_hub TO genset_app;
GRANT USAGE ON SCHEMA public TO genset_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO genset_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO genset_app;

-- 创建只读用户（用于报表/分析）
CREATE USER genset_read_only WITH PASSWORD 'read_only_password';
GRANT CONNECT ON DATABASE genset_hub TO genset_read_only;
GRANT USAGE ON SCHEMA public TO genset_read_only;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO genset_read_only;
```

---

## 📈 性能优化建议

### 1. 索引策略

```sql
-- 复合索引（常见查询组合）
CREATE INDEX idx_questions_status_created ON questions(status, created_at DESC);
CREATE INDEX idx_answers_question_accepted ON answers(question_id, is_accepted DESC);

-- 部分索引（仅索引活跃数据）
CREATE INDEX idx_open_questions ON questions(created_at DESC) WHERE status = 'open';
```

### 2. 查询优化

```sql
-- 使用视图简化复杂查询
CREATE VIEW v_question_stats AS
SELECT 
    q.id,
    q.title,
    COUNT(DISTINCT a.id) as answer_count,
    COUNT(DISTINCT v.id) as upvote_count,
    q.view_count,
    u.username
FROM questions q
LEFT JOIN answers a ON q.id = a.question_id
LEFT JOIN votes v ON v.votable_type = 'question' AND v.votable_id = q.id AND v.vote_type = 1
LEFT JOIN users u ON q.user_id = u.id
GROUP BY q.id, u.id;
```

### 3. 缓存策略

建议在应用层使用 Redis 缓存：

- 用户排行榜（1 小时更新）
- 热门标签（1 小时更新）
- 热门问题（30 分钟更新）
- 用户资料（24 小时更新）

---

## 🔄 数据库迁移

### 迁移文件结构

```
database/migrations/
├── 001_init_schema.sql
├── 002_create_users.sql
├── 003_create_questions.sql
├── 004_create_answers.sql
├── 005_create_tags.sql
└── 006_create_votes.sql
```

### 运行迁移

```bash
# 使用 npm 脚本
npm run db:migrate

# 手动执行
psql -U postgres -d genset_hub -f migrations/001_init_schema.sql
```

---

## 📊 数据备份和恢复

### 备份

```bash
# 完整备份
pg_dump -U postgres genset_hub > backup.sql

# 压缩备份
pg_dump -U postgres genset_hub | gzip > backup.sql.gz

# 自定义格式（便于选择性恢复）
pg_dump -U postgres -Fc genset_hub > backup.dump
```

### 恢复

```bash
# 从 SQL 文件恢复
psql -U postgres genset_hub < backup.sql

# 从压缩文件恢复
gunzip -c backup.sql.gz | psql -U postgres genset_hub

# 从自定义格式恢复
pg_restore -U postgres -d genset_hub backup.dump
```

---

## 🔍 监控和维护

### 查看表大小

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 查看慢查询

```sql
-- 启用慢查询日志
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 记录超过 1 秒的查询
SELECT pg_reload_conf();
```

### 清理表空间

```sql
-- 删除已删除行占用的空间
VACUUM ANALYZE;

-- 更激进的清理（锁表）
VACUUM FULL ANALYZE;
```

---

**数据库设计完成！** 准备好进行具体开发了吗？🚀
