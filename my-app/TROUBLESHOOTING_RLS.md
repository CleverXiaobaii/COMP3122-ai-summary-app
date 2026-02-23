# RLS策略问题故障排除指南

## 问题描述
用户上传文件时出现错误：`❌ Upload failed: Upload failed: new row violates row-level security policy`

## 根本原因
Supabase的Row Level Security (RLS)策略与我们的自定义Cookie认证系统不兼容。RLS策略使用`auth.uid()`函数，该函数只适用于Supabase JWT认证，对于我们的自定义认证返回`null`。

## 解决方案

### 步骤1：执行全面的RLS修复脚本

在Supabase SQL Editor中执行以下脚本：

```sql
-- 文件位置: my-app/supabase/sql/comprehensive_rls_fix.sql
-- 这个脚本会：
-- 1. 禁用所有表的RLS
-- 2. 删除所有现有策略
-- 3. 重新启用RLS
-- 4. 创建宽松的RLS策略（依赖应用层权限控制）
```

**重要**：执行后，所有表的RLS策略将变为：
- `users`表：允许注册、查看、更新（应用层控制删除）
- `documents`表：允许所有操作（应用层过滤用户数据）
- `logs`表：允许所有操作

### 步骤2：验证RLS状态

执行检查脚本确认RLS策略已正确设置：

```sql
-- 文件位置: my-app/supabase/sql/check_rls_status.sql
-- 查看当前RLS策略状态
```

### 步骤3：确保服务密钥已设置

1. **获取服务密钥**：
   - 访问Supabase项目 → Settings → API
   - 复制`service_role`密钥（**不是anon/public密钥**）

2. **添加到Vercel**：
   - 访问Vercel项目 → Settings → Environment Variables
   - 添加变量：`SUPABASE_SERVICE_ROLE_KEY` = 您的服务密钥
   - 保存并重新部署

### 步骤4：测试上传功能

1. **注册新用户**：访问 https://my-app-pi-wheat.vercel.app/login
2. **上传文件**：登录后尝试上传文件
3. **验证结果**：应显示"✅ Upload successful"

## 技术实现细节

### 应用层权限控制
由于数据库层使用宽松RLS策略，权限控制完全在应用层实现：

1. **用户认证**：Cookie-based自定义认证
2. **数据过滤**：API根据用户ID过滤返回数据
3. **操作验证**：API验证用户权限后再执行操作

### API层安全措施
所有关键API操作都使用`supabaseAdmin`客户端（服务密钥）绕过RLS：
- `upload/route.ts` - 文件上传和文档元数据插入
- `files/list/route.ts` - 文档列表查询
- `files/delete/route.ts` - 文档删除
- `summarize/route.ts` - 摘要更新
- `auth/log/route.ts` - 操作日志记录

### 数据库RLS策略
执行修复脚本后，各表的RLS策略：

#### `users`表：
- `Allow user registration` - 允许注册
- `Allow user lookup` - 允许查询（用于登录验证）
- `Users can update own profile` - 允许更新个人资料
- `Only admins can delete users` - 仅管理员可删除用户

#### `documents`表：
- `Allow document insertion` - 允许插入
- `Allow document viewing` - 允许查看
- `Allow document updates` - 允许更新
- `Allow document deletion` - 允许删除

#### `logs`表：
- `Allow log viewing` - 允许查看
- `Allow log insertion` - 允许插入
- `Allow log updates` - 允许更新
- `Allow log deletion` - 允许删除

## 故障排除

### 如果问题仍然存在

1. **检查服务密钥**：
   ```bash
   # 测试连接状态
   curl https://my-app-pi-wheat.vercel.app/api/supabase/connect
   ```

2. **检查数据库错误日志**：
   - 访问Supabase → Logs → Database Logs
   - 查看上传时的错误信息

3. **检查浏览器控制台**：
   - 按F12打开开发者工具
   - 查看Network标签页中的API响应
   - 查看Console标签页的错误信息

4. **手动测试API**：
   ```bash
   # 获取已注册用户的ID
   # 然后测试上传API
   curl -X POST https://my-app-pi-wheat.vercel.app/api/upload \
     -H "Content-Type: multipart/form-data" \
     -F "file=@test.txt" \
     -F "bucket=user-YOUR_USER_ID" \
     -F "userId=YOUR_USER_ID"
   ```

### 常见问题

#### Q: 为什么需要服务密钥？
A: 服务密钥具有管理员权限，可以绕过RLS策略。普通匿名密钥受RLS限制。

#### Q: 宽松的RLS策略安全吗？
A: 是的，因为：
   - 应用层有完整的权限控制
   - API验证用户身份和权限
   - 敏感操作（如删除用户）仍有限制
   - 生产环境应定期审计

#### Q: 可以迁移到Supabase Auth吗？
A: 可以，但需要：
   - 修改认证系统使用Supabase JWT
   - 更新所有API使用JWT验证
   - 修改RLS策略使用`auth.uid()`
   - 迁移现有用户数据

## 生产环境建议

1. **定期审计**：
   - 检查服务密钥使用情况
   - 审查用户访问日志
   - 更新RLS策略

2. **监控**：
   - 监控异常上传模式
   - 设置存储空间限制
   - 记录所有文件操作

3. **备份**：
   - 定期备份用户数据
   - 备份文件存储
   - 测试恢复流程

## 联系支持

如果按照以上步骤仍无法解决问题，请提供：
1. 具体的错误信息
2. 浏览器控制台截图
3. Supabase数据库日志
4. 已执行的SQL脚本