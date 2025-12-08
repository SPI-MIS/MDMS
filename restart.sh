#!/bin/bash
echo "============================="
echo "   MDMS 一鍵重啟開始"
echo "============================="

cd ~/Documents/0.SPI_Project/MDMS || exit

echo "→ 停用 system nginx（避免佔用 port 80）"
sudo systemctl stop nginx 2>/dev/null

echo "→ 停止 MDMS 容器"
docker compose down

echo "→ 清除未使用的 network/container"
docker system prune -f

echo "→ 啟動 MDMS 容器"
docker compose up -d

echo "→ 檢查 Cloudflare Tunnel 狀態"
sudo systemctl restart cloudflared 2>/dev/null
sudo systemctl status cloudflared --no-pager

echo "============================="
echo "   MDMS 重啟完成 ✔"
echo "============================="
docker ps --format "table {{.Names}}\t{{.Status}}"
