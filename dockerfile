FROM node:11-alpine
WORKDIR /usr/local/src/node-epsg3395proxy
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
CMD ["node", "server.js"]
