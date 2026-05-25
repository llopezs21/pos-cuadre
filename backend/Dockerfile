FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install

# Instala cliente MySQL para uso dentro del contenedor backend
RUN apt-get update && apt-get install -y default-mysql-client && rm -rf /var/lib/apt/lists/*

COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]