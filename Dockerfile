FROM node:24-slim

WORKDIR /app
# Копируем пофайлово: tools/ и docs/ в образ попадать не должны.
COPY server.js /app/server.js
COPY index.html /app/index.html
COPY questions.js /app/questions.js

ENV PORT=80
EXPOSE 80

CMD ["node", "/app/server.js"]
