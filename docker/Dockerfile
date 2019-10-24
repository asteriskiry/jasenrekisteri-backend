FROM node:latest

WORKDIR /app
COPY . /app
RUN npm install
COPY ./docker/wait-for-it.sh /usr/local
RUN chmod +x /usr/local/wait-for-it.sh
EXPOSE 3001

