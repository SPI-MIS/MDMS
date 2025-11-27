# --- Build Stage ---
FROM node:20 AS builder

WORKDIR /app
COPY . .
RUN npm install && npm run build

# --- Production Stage ---
FROM nginx:stable-alpine

# 移除預設頁面
RUN rm -rf /usr/share/nginx/html/*

# 複製 build 完的前端進 Nginx 靜態資源目錄
COPY --from=builder /app/dist /usr/share/nginx/html

# 可選：自定義 Nginx 設定（如下方 nginx.conf）
COPY nginx.conf /etc/nginx/conf.d/default.conf

