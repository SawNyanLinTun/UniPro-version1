# UniPro frontend — multi-stage Vite build + nginx
# Build args (set as Railway variables; Docker ARG at build time):
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
#   VITE_API_URL

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Railway sets PORT; nginx listens on it via envsubst-friendly template approach:
# use a small entrypoint to substitute PORT into the config.
ENV PORT=80
EXPOSE 80

CMD ["/bin/sh", "-c", "sed -i \"s/listen 80;/listen ${PORT};/\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
