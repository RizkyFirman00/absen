FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port React dev server
EXPOSE 3000

# Start React dev server
CMD ["npm", "run", "dev"]
