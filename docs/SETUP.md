# GenSet Hub 部署指南

## 🖥️ 部署环境要求

### 服务器配置（推荐）
- **操作系统**: Ubuntu 20.04 LTS 或 CentOS 7+
- **CPU**: 2 核以上
- **内存**: 4GB 以上
- **存储**: 50GB 以上
- **带宽**: 5Mbps 以上

### 软件要求
- Docker & Docker Compose
- Git
- Node.js 18+ (如果不使用 Docker)
- PostgreSQL 14+ (如果不使用 Docker)
- Redis 6+ (如果不使用 Docker)

---

## 🚀 使用 Docker Compose 部署（推荐）

### 1. 从 GitHub 克隆仓库

```bash
git clone https://github.com/fdkpower/genset-hub.git
cd genset-hub
```

### 2. 配置环境变量

```bash
# 后端环境变量
cat > backend/.env << EOF
NODE_ENV=production
PORT=5000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=genset_hub
DB_USER=postgres
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRE=3600
MAIL_FROM=noreply@genset-hub.com
EOF

# 前端环境变量
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://your-domain.com/api
NEXT_PUBLIC_APP_NAME=GenSet Hub
NEXT_PUBLIC_APP_URL=http://your-domain.com
EOF
```

### 3. 启动服务

```bash
# 构建镜像
docker-compose build

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 初始化数据库
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

### 4. 验证部署

访问以下地址验证服务：
- 前端: http://localhost:3000
- 后端 API: http://localhost:5000/api
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

## 🌐 使用 Nginx 反向代理

### 1. 安装 Nginx

```bash
# Ubuntu
sudo apt-get install nginx

# CentOS
sudo yum install nginx
```

### 2. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/genset-hub
```

添加以下配置：

```nginx
upstream backend {
    server localhost:5000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 重定向 HTTP 到 HTTPS（可选）
    # return 301 https://$server_name$request_uri;

    # 前端
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. 启用配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/genset-hub /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 🔒 配置 SSL/TLS（Let's Encrypt）

### 1. 安装 Certbot

```bash
# Ubuntu
sudo apt-get install certbot python3-certbot-nginx

# CentOS
sudo yum install certbot python3-certbot-nginx
```

### 2. 获取证书

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 3. 自动续期

```bash
# 测试自动续期
sudo certbot renew --dry-run

# 证书会自动在过期前 30 天续期
```

---

## 📊 监控和日志

### Docker 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend

# 实时日志
docker-compose logs -f

# 查看最后 100 行日志
docker-compose logs --tail=100
```

### 系统监控

```bash
# 查看容器资源使用
docker stats

# 查看容器详细信息
docker inspect container-name
```

---

## 🔄 备份和恢复

### 数据库备份

```bash
# 备份 PostgreSQL
docker-compose exec postgres pg_dump -U postgres genset_hub > backup.sql

# 恢复 PostgreSQL
docker-compose exec -T postgres psql -U postgres genset_hub < backup.sql
```

### 自动备份脚本

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# PostgreSQL 备份
docker-compose exec -T postgres pg_dump -U postgres genset_hub | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Redis 备份
docker-compose exec redis redis-cli BGSAVE

echo "备份完成: $BACKUP_DIR/db_$DATE.sql.gz"

# 删除 7 天前的备份
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

创建定时任务：
```bash
crontab -e

# 每天凌晨 2 点执行备份
0 2 * * * /path/to/backup.sh
```

---

## 🔧 维护任务

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d

# 运行数据库迁移
docker-compose exec backend npm run db:migrate
```

### 清理垃圾

```bash
# 删除未使用的镜像
docker image prune

# 删除未使用的卷
docker volume prune

# 删除停止的容器
docker container prune
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend

# 停止服务
docker-compose stop

# 启动服务
docker-compose start
```

---

## ⚠️ 常见问题

### 1. 端口已被占用

```bash
# 查找占用端口的进程
lsof -i :5000

# 修改 docker-compose.yml 中的端口映射
# ports: ["5001:5000"]
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 容器状态
docker-compose ps postgres

# 查看数据库日志
docker-compose logs postgres

# 重启数据库
docker-compose restart postgres
```

### 3. 前端无法连接后端

```bash
# 检查环境变量中的 API 地址
cat frontend/.env.local

# 检查后端是否正常运行
curl http://localhost:5000/api/health

# 查看前端日志
docker-compose logs frontend
```

### 4. 磁盘空间不足

```bash
# 查看磁盘使用情况
df -h

# 清理 Docker 数据
docker system prune -a

# 检查日志文件大小
du -sh /var/lib/docker/containers/*/
```

---

## 📈 性能优化

### 1. 数据库优化

```bash
# 连接到 PostgreSQL
docker-compose exec postgres psql -U postgres genset_hub

# 查看表大小
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# 清理表空间
VACUUM ANALYZE;
```

### 2. 缓存配置

在 `backend/.env` 中配置 Redis 缓存：

```
REDIS_HOST=redis
REDIS_PORT=6379
CACHE_TTL=3600
```

### 3. 日志轮转

```bash
# 配置日志轮转
sudo nano /etc/logrotate.d/genset-hub

/var/log/genset-hub/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
```

---

## 📞 故障排查

### 收集诊断信息

```bash
# 系统信息
uname -a
docker --version
docker-compose --version

# Docker 状态
docker-compose ps
docker-compose logs

# 网络诊断
docker exec genset-hub-backend ping redis
docker exec genset-hub-backend ping postgres

# 资源使用
docker stats
free -h
df -h
```

---

## 🔐 安全建议

1. **更改默认密码**
   - 修改 PostgreSQL 密码
   - 修改 JWT_SECRET

2. **配置防火墙**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```

3. **启用 HTTPS**
   - 使用 Let's Encrypt 获取免费证书
   - 配置强制 HTTPS 重定向

4. **定期备份**
   - 设置自动备份任务
   - 测试恢复过程

5. **更新依赖**
   ```bash
   # 检查 npm 更新
   docker-compose exec backend npm outdated
   
   # 更新依赖
   docker-compose exec backend npm update
   ```

---

## 📞 获取帮助

- GitHub Issues: https://github.com/fdkpower/genset-hub/issues
- Email: support@genset-hub.com

---

**祝部署顺利！** 🚀
