FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache build-base python3 cairo-dev jpeg-dev pango-dev giflib-dev
COPY package.json ./
COPY package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build
CMD ["npm", "start"]
