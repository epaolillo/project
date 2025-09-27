# Configuración de Variables de Entorno

## 📋 Descripción

El proyecto utiliza variables de entorno para configurar las URLs del servidor y frontend, permitiendo fácil despliegue en diferentes entornos sin modificar el código.

## 🔧 Variables de Entorno

### Configuración Simplificada

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `5000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `JWT_SECRET` | Clave secreta para JWT | `your-secret-key-change-in-production` |
| `DB_PATH` | Ruta de la base de datos | `./database` |
| `BASE_URL` | URL base del servidor (servidor + frontend) | `http://localhost:5000` |

## 🚀 Configuración

### 1. Crear archivo `.env`

Copia el archivo `config.env` a `.env`:

```bash
cp config.env .env
```

### 2. Configurar variables

Edita el archivo `.env` con tus valores:

```env
# Servidor
PORT=5000
NODE_ENV=development
JWT_SECRET=mi-clave-secreta-super-segura
DB_PATH=./database

# URL Única
BASE_URL=http://localhost:5000
```

### 3. Para producción

```env
# Servidor
PORT=8080
NODE_ENV=production
JWT_SECRET=clave-super-secreta-de-produccion
DB_PATH=/var/lib/app/database

# URL Única
BASE_URL=https://mi-dominio.com
```

## 🏗️ Arquitectura

### Servidor Unificado

El servidor ahora sirve tanto la API como el frontend build:
- **API**: Disponible en `/api/*`
- **Frontend**: Servido desde `/build` para todas las rutas no-API
- **Archivos estáticos**: Uploads en `/uploads/*`

### Configuración Inyectada por el Servidor con EJS

El servidor usa EJS para inyectar automáticamente la configuración en el HTML:

```ejs
<!-- views/index.ejs -->
<script>
  window.APP_CONFIG = {
    BASE_URL: '<%= BASE_URL %>',
    API_BASE_URL: '<%= BASE_URL %>/api',
    WS_URL: '<%= BASE_URL %>'
  };
</script>
```

### Uso en el Código

```javascript
// API Service
this.baseURL = this.getConfig().API_BASE_URL;

// WebSocket Service
this.url = this.getConfig().WS_URL;

// Avatar URLs
const baseURL = window.APP_CONFIG?.BASE_URL || 'http://localhost:5000';
return `${baseURL}${user.avatar}`;
```

## 🔄 Migración Realizada

### Archivos Modificados

1. **server.js**
   - ✅ CORS origin ahora usa `BASE_URL`
   - ✅ Puerto configurable via `PORT`
   - ✅ Ruta de DB configurable via `DB_PATH`

2. **src/services/ApiService.js**
   - ✅ URL base configurable via `REACT_APP_BASE_URL`
   - ✅ Usa configuración centralizada

3. **src/services/WebSocketService.js**
   - ✅ URL del WebSocket configurable
   - ✅ Usa configuración centralizada

4. **src/components/UserWidget/UserWidget.jsx**
   - ✅ URLs de avatar configurable
   - ✅ Usa configuración centralizada

5. **src/components/UserDrawer/UserDrawer.jsx**
   - ✅ URLs de avatar configurable
   - ✅ Usa configuración centralizada

6. **seed.js**
   - ✅ URL del frontend configurable

## 🐳 Docker

### Dockerfile del Servidor

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

### Dockerfile del Frontend

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    volumes:
      - ./database:/app/database

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_BASE_URL=http://localhost:5000
```

## 🔒 Seguridad

### Variables Sensibles

- **JWT_SECRET**: Cambiar en producción
- **DB_PATH**: Configurar ruta segura
- **URLs**: Usar HTTPS en producción

### Validación

El servidor valida que las variables de entorno estén configuradas correctamente:

```javascript
// En server.js
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
  console.warn('⚠️  JWT_SECRET no configurado, usando valor por defecto');
}
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **CORS Error**
   - Verificar que `BASE_URL` esté configurado correctamente
   - Verificar que `REACT_APP_BASE_URL` sea la URL correcta del servidor

2. **WebSocket no conecta**
   - Verificar que `REACT_APP_BASE_URL` sea la URL correcta del servidor
   - Verificar que el servidor esté corriendo

3. **Imágenes no cargan**
   - Verificar que `REACT_APP_BASE_URL` sea la URL correcta del servidor
   - Verificar que la ruta `/uploads` esté configurada correctamente

### Debug

```javascript
// Verificar configuración
console.log('Configuración actual:', {
  BASE_URL: config.BASE_URL,
  API_BASE_URL: config.API_BASE_URL,
  WS_URL: config.WS_URL
});
```

## 📝 Notas

- Las variables de entorno del frontend deben empezar con `REACT_APP_`
- Reiniciar el servidor después de cambiar variables de entorno
- En producción, usar variables de entorno del sistema o archivos `.env` seguros
- Nunca commitear archivos `.env` con datos sensibles

---

*Última actualización: Enero 2024*
