FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY server.js ./
EXPOSE 9000
EXPOSE 9099
CMD ["npm", "start"]
