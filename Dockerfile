FROM node:24-slim

WORKDIR /app
COPY server.js /app/server.js
COPY index.html /app/index.html

ENV PORT=80
EXPOSE 80

CMD ["node", "/app/server.js"]
