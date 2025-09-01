# --- Build 階段 ---
FROM node:22 AS build
WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm install

# 複製程式碼並 build
COPY . .
RUN npm run build

# --- Serve 階段 ---
FROM nginx:alpine
# 複製 build 後的檔案到 Nginx 預設靜態目錄
COPY --from=build /app/dist /usr/share/nginx/html

# (選用) 如果是 SPA (Vue Router / React Router)，可以覆蓋 nginx.conf，讓所有路徑 fallback 到 index.html
# COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
