# 🚀 Instrucciones de Clonado y Setup

## ⚠️ PROBLEMAS CONOCIDOS Y SOLUCIONES

### 🔧 Método de Clonado Recomendado

```bash
# 1. Clonar sin Git LFS (evita archivos corruptos)
git clone --filter=blob:none https://github.com/josuehernandeztapia/pwa_angular_v3.git

# 2. Entrar al directorio
cd pwa_angular_v3

# 3. Instalar dependencias (usar ci para reproducibilidad exacta)
npm ci --legacy-peer-deps

# 4. Verificar que funciona
npm run build

# 5. Levantar servidor
npm start
```

### 🐛 Si tienes problemas con Git LFS

```bash
# Alternativa: Clonar sin archivos LFS problemáticos
git clone --filter=blob:none https://github.com/josuehernandeztapia/pwa_angular_v3.git
cd pwa_angular_v3

# Eliminar referencias problemáticas
rm -rf cypress/videos/

# Continuar con setup normal
npm ci --legacy-peer-deps
```

### 🐳 Docker Setup (Alternativo)

```bash
# Si Docker falla, usar estos comandos
docker build --no-cache -t conductores-pwa .
docker run -p 4200:80 conductores-pwa
```

### 📦 NPM Issues

Si ves errores como "chokidar missing":

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### ✅ Verificación Rápida

```bash
# Después del setup, verifica que todo funciona:
npm run build          # Debe completar sin errores
npm test -- --watch=false  # Tests unitarios deben pasar
npm start              # Servidor debe arrancar en http://localhost:4300
```

## 🔐 Credenciales Demo

- **Usuario**: demo@conductores.com
- **Password**: demo123

## 📞 Soporte

Si sigues teniendo problemas:
1. Verificar que Node.js version 18+ está instalado
2. Verificar que NPM version 9+ está instalado
3. Usar `--legacy-peer-deps` flag
4. Eliminar carpeta `node_modules` y reinstalar

---

**Última actualización**: Octubre 2024