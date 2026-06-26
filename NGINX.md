# Nginx 部署文档

本文说明如何把 `AI_WEB` 部署到域名 `ai.du-ai.top`，并通过同一域名访问：

- 前端：`https://ai.du-ai.top/aiweb/`
- 后端：`https://ai.du-ai.top/aiapi/`

当前项目基于 `Vite + Vue 3`，`vite.config.ts` 已配置：

```ts
base: '/aiweb/'
```

因此线上访问路径必须带 `/aiweb/`。

## 1. 前端构建

在项目根目录执行：

```bash
npm install
npm run build
```

打包完成后，静态文件输出到：

```text
dist/
```

## 2. 服务器目录建议

如果你是普通 Linux 安装的 Nginx，建议准备目录：

```text
/var/www/aiweb/
```

把 `dist/` 目录中的文件复制到这里。

例如：

```bash
mkdir -p /var/www/aiweb
cp -r dist/* /var/www/aiweb/
```

如果你当前用的是 Docker Nginx，并且容器挂载如下：

```text
/root/nginx/html:/usr/share/nginx/html:ro
/root/nginx/conf/default.conf:/etc/nginx/conf.d/default.conf:ro
```

那么前端文件应放到宿主机目录：

```text
/root/nginx/html/aiweb/
```

对应容器内目录：

```text
/usr/share/nginx/html/aiweb/
```

## 3. Nginx 配置

下面这份配置适用于普通 Linux 安装的 Nginx：

- 域名：`ai.du-ai.top`
- 前端目录：`/var/www/aiweb`
- 后端服务：`127.0.0.1:1888`
- 后端基路径：`/aiapi`

```nginx
server {
    listen 80;
    server_name ai.du-ai.top;

    location = / {
        return 301 /aiweb/;
    }

    location /aiweb/ {
        alias /var/www/aiweb/;
        index index.html;
        try_files $uri $uri/ /aiweb/index.html;
    }

    location /aiapi/ {
        proxy_pass http://127.0.0.1:1888/aiapi/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
}
```

如果你当前使用的是 Docker Nginx，并且静态目录挂载到 `/usr/share/nginx/html`，更适合直接用 `root` 方式：

```nginx
server {
    listen 80;
    server_name ai.du-ai.top;

    root /usr/share/nginx/html;
    index index.html;

    location = / {
        return 301 /aiweb/;
    }

    location /aiweb/ {
        try_files $uri $uri/ /aiweb/index.html;
    }

    location /aiapi/ {
        proxy_pass http://host.docker.internal:1888/aiapi/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
}
```

注意：

- 如果 Docker 容器里不能解析 `host.docker.internal`，就把它改成宿主机内网 IP，例如 `http://172.17.0.1:1888/aiapi/`
- 你现在 `default.conf` 是单文件挂载，修改的是宿主机文件 `/root/nginx/conf/default.conf`
- 因为挂载是 `:ro`，需要先在宿主机改文件内容，再重启或 reload 容器

## 4. HTTPS 配置示例

如果你已经申请好 SSL 证书，可以使用下面这份配置：

```nginx
server {
    listen 80;
    server_name ai.du-ai.top;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ai.du-ai.top;

    ssl_certificate /etc/nginx/ssl/ai.du-ai.top.pem;
    ssl_certificate_key /etc/nginx/ssl/ai.du-ai.top.key;

    location = / {
        return 301 /aiweb/;
    }

    location /aiweb/ {
        alias /var/www/aiweb/;
        index index.html;
        try_files $uri $uri/ /aiweb/index.html;
    }

    location /aiapi/ {
        proxy_pass http://127.0.0.1:1888/aiapi/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
}
```

## 5. 配置说明

- 前端必须访问 `https://ai.du-ai.top/aiweb/`，因为构建基路径是 `/aiweb/`
- `/aiapi/` 会转发到本机 `1888` 端口上的后端服务
- `try_files $uri $uri/ /aiweb/index.html;` 用来解决 Vue Router 刷新 404
- `location = /` 会把根路径重定向到 `/aiweb/`
- Docker Nginx 场景下，静态文件实际放在宿主机 `/root/nginx/html/aiweb/`
- Docker Nginx 场景下，配置文件实际修改宿主机 `/root/nginx/conf/default.conf`

## 6. 后端要求

后端当前应满足：

- 监听本机 `1888` 端口
- WebFlux 基路径为 `/aiapi`

因此登录接口最终地址是：

```text
https://ai.du-ai.top/aiapi/auth/login
```

## 7. 检查命令

检查 Nginx 配置：

```bash
nginx -t
```

重载 Nginx：

```bash
systemctl reload nginx
```

检查后端端口：

```bash
ss -lntp | grep 1888
```

## 8. 更新前端

前端代码有更新时：

```bash
git pull
npm install
npm run build
cp -r dist/* /var/www/aiweb/
systemctl reload nginx
```

如果你当前用的是 Docker Nginx，改成：

```bash
git pull
npm install
npm run build
mkdir -p /root/nginx/html/aiweb
cp -r dist/* /root/nginx/html/aiweb/
docker restart nginx1
```

如果只是改了 `/root/nginx/conf/default.conf`，也可以直接：

```bash
docker restart nginx1
```

## 9. 常见问题

### 9.1 打开首页 404

确认访问的是：

```text
https://ai.du-ai.top/aiweb/
```

不是直接访问 `https://ai.du-ai.top/`，除非你保留了根路径跳转配置。

### 9.2 页面刷新 404

确认 `location /aiweb/` 中已配置：

```nginx
try_files $uri $uri/ /aiweb/index.html;
```

### 9.3 接口 404

确认后端接口实际地址是：

```text
/aiapi/auth/login
```

不是旧的 `/api/auth/login`。

### 9.4 前端能打开但接口报跨域

如果前后端都走同一个域名 `https://ai.du-ai.top`，正常不应该再有跨域问题。

如果你前端仍然直接请求 `http://127.0.0.1:8888`，说明生产环境变量没有生效，检查：

```text
.env.production
```

当前生产配置应为：

```properties
VITE_API_BASE=https://ai.du-ai.top/aiapi
```

### 9.5 Docker Nginx 无法访问宿主机 1888

先进入容器测试：

```bash
docker exec -it nginx1 sh
```

然后在容器里访问后端：

```bash
wget -O- http://host.docker.internal:1888/aiapi/auth/login
```

如果失败，通常是以下原因：

- 容器里不能解析 `host.docker.internal`
- 后端只监听了 `127.0.0.1`，没有监听宿主机可访问地址
- 宿主机防火墙限制了容器到 `1888` 的访问

这种情况下，优先把 `proxy_pass` 改成宿主机桥接地址，例如：

```nginx
proxy_pass http://172.17.0.1:1888/aiapi/;
```
