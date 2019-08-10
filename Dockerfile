FROM node:10-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
#RUN docker run -p 49160:8080 -d phuef/node-web-app

COPY . .

EXPOSE 3000
#CMD [ "node", "server.js" ]
CMD ["npm", "start"]