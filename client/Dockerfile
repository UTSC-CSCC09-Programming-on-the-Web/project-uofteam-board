FROM node:20-alpine as build
WORKDIR /app
RUN apk add --no-cache build-base python3 cairo-dev jpeg-dev pango-dev giflib-dev
COPY package.json ./
COPY package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

FROM nginx:1.21.6-alpine
COPY --from=build /app/build/client /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
