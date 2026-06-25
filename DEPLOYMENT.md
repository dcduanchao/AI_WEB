# AI_WEB 部署说明

本项目是 `Vite + Vue 3` 前端应用，线上建议按“独立子目录”方式部署，例如访问路径为 `https://example.com/aiweb/`。

## 1. Git 提交

本地开发完成后提交到仓库：

```bash
git add .
git commit -m "deploy frontend"
git push origin main
```

`.gitignore` 已忽略 `node_modules` 和 `dist`，不要把打包产物提交进仓库。

## 2. 本地打包

在项目根目录执行：

```bash
npm install
npm run build
```

打包结果会输出到 `dist/`。

## 3. 线上部署目录

如果线上还有其他项目，不要直接复用别人的 `dist` 根目录。

建议为本项目单独准备目录，例如：

```text
/var/www/aiweb/
```

然后把本次构建出来的 `dist/` 内容复制到这个目录里。

## 4. Vite 配置

如果项目线上和本地都统一通过 `/aiweb/` 子路径访问，需要修改 `vite.config.ts`：

```ts
export default defineConfig({
  base: '/aiweb/',
  plugins: [vue()],
  // ...
})
```

同时路由也要使用 `import.meta.env.BASE_URL`：

```ts
history: createWebHistory(import.meta.env.BASE_URL)
```

这样本地开发和线上部署都会使用同一套路径基准，静态资源和刷新行为保持一致。

## 5. Nginx 配置

推荐使用 `alias` 独立映射：

```nginx
server {
    listen 80;
    server_name example.com;

    location /aiweb/ {
        alias /var/www/aiweb/;
        try_files $uri $uri/ /aiweb/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8888/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

说明：

- `try_files ... /aiweb/index.html` 用来处理 Vue Router 的 history 模式刷新问题。
- `location /api/` 是后端接口反代，开发环境里 `vite.config.ts` 的 `server.proxy` 只对本地生效。

### Docker 场景

如果 Nginx 是 Docker 起的，并且你挂载的是：

```text
Host: /root/nginx/html
Container: /usr/share/nginx/html
```

那么本项目的构建产物应放到宿主机的：

```text
/root/nginx/html/aiweb/
```

对应到容器里就是：

```text
/usr/share/nginx/html/aiweb/
```

Nginx 配置可以直接按根目录方式写：

```nginx
server {
    listen 80;
    server_name example.com;

    root /usr/share/nginx/html;
    index index.html;

    location /aiweb/ {
        try_files $uri $uri/ /aiweb/index.html;
    }
}
```

这样做的好处是：宿主机只要把 `dist/` 内容同步到 `/root/nginx/html/aiweb/`，容器里就能直接访问到。

## 6. 刷新 404 的原因

当前项目路由使用的是 `createWebHistory()`。

这意味着：

- `https://example.com/aiweb/` 正常
- `https://example.com/aiweb/login` 刷新时也必须回退到 `index.html`

所以 Nginx 必须配置 `try_files`，否则刷新子路由会 404。

## 7. 部署流程建议

```bash
git pull origin main
npm install
npm run build
```

然后把 `dist/` 同步到线上 `/var/www/aiweb/`，最后重载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

## 8. 需要注意的点

- 如果站点不是 `/aiweb/`，而是别的子目录，`vite.config.ts` 里的 `base` 要同步改掉。
- 如果后端地址不是 `127.0.0.1:8888`，Nginx 的 `proxy_pass` 也要改。
- 不建议把多个项目的构建结果混在同一个目录里。
