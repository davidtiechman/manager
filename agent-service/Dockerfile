FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY agent.js ./
CMD ["npm", "start"]
