#!/bin/bash
echo "====================================="
echo "       MDMS 一鍵部署流程開始"
echo "====================================="

PROJECT_DIR=~/Documents/0.SPI_Project/MDMS

cd "$PROJECT_DIR" || exit

echo "→ 停用 system nginx（避免佔用 port 80）"
sudo systemctl stop nginx 2>/dev/null

echo "→ 停止舊 Docker 服務"
docker compose down

echo "→ 清除未使用容器、網路、images（不刪 volume）"
docker system prune -af

echo "→ 重新建置前端（Vue）"
cd frontend
npm install
npm run build
cd ..

echo "→ 重新建置 Docker Images"
docker compose build

echo "→ 啟動所有服務"
docker compose up -d

echo "→ 重啟 Cloudflare Tunnel"
sudo systemctl restart cloudflared 2>/dev/null

echo "→ 等待服務啟動..."
sleep 3

echo "====================================="
echo "       MDMS 部署完成 ✔"
echo "====================================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
