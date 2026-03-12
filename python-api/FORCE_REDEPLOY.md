# FORCE REDEPLOY RAILWAY

## Vấn Đề

Railway có thể đang dùng code cũ, chưa có ablation endpoint.

## Giải Pháp

### Cách 1: Thêm Comment để Trigger Deploy

Thêm comment vào `main.py` để trigger deploy:

```python
# Force redeploy - 2026-03-12
```

### Cách 2: Railway Dashboard

1. Vào Railway dashboard
2. Chọn project `voichat1012-production`
3. Click tab "Deployments"
4. Click "Redeploy" trên deployment mới nhất

### Cách 3: Git Push Empty Commit

```bash
git commit --allow-empty -m "chore: force redeploy railway"
git push origin main
```

## Kiểm Tra

Sau khi redeploy, test các endpoints:

```bash
# Test root
curl https://voichat1012-production.up.railway.app/

# Test ablation example
curl https://voichat1012-production.up.railway.app/api/ablation-study/example
```

## Logs

Xem logs trên Railway để debug:
1. Vào Railway dashboard
2. Click vào deployment
3. Xem "Deploy Logs" và "Runtime Logs"
