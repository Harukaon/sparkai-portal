# 工单服务镜像：没有第三方依赖，只拷源码
FROM node:24-alpine

WORKDIR /app
COPY package.json ./
COPY src ./src

ENV NODE_ENV=production \
    TICKET_HOST=0.0.0.0 \
    TICKET_PORT=3100 \
    TICKET_DATA_DIR=/data

# 数据库和图片都在 /data，部署时必须挂载到宿主机目录，否则重建容器会丢
VOLUME ["/data"]
EXPOSE 3100

USER node
CMD ["node", "src/server.ts"]
