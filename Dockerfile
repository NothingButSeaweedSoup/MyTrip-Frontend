# ============================================
# Stage 1: Build with Node.js
# ============================================
FROM node:22-alpine AS build
WORKDIR /build

ARG VITE_AMAP_KEY
ARG VITE_AMAP_SECRET
ENV VITE_AMAP_KEY=${VITE_AMAP_KEY}
ENV VITE_AMAP_SECRET=${VITE_AMAP_SECRET}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ============================================
# Stage 2: Nginx runtime
# ============================================
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# 清除默认页面，复制编译产物
RUN rm -rf ./*
COPY --from=build /build/dist/ .

# 自定义 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
