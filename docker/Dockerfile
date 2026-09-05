FROM node:24.16.0-bookworm-slim

WORKDIR /app
COPY . /app
ENV PM2_HOME='/app/.pm2'
RUN npm install
RUN npm run build
RUN npm install --location=global pm2
RUN pm2 install pm2-intercom
COPY ./docker/wait-for-it.sh /usr/local
RUN chmod +x /usr/local/wait-for-it.sh
EXPOSE 3001
