FROM node:latest

WORKDIR /app
COPY . /app
RUN npm install
RUN npm install --global pm2
RUN pm2 install pm2-intercom
COPY ./docker/wait-for-it.sh /usr/local
RUN chmod +x /usr/local/wait-for-it.sh
EXPOSE 3001

