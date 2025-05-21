// checkAssets.js
// Ejecuta con: node checkAssets.js

const fs = require('fs');
const path = require('path');

// Rutas que queremos verificar
const paths = [
  'public/assets/images/tiles/grass/grass_01.png',
  'public/assets/images/tiles/grass/grass_02.png',
  'public/assets/images/tiles/grass/grass_03.png',
  'public/assets/images/tiles/grass/grass_04.png'
];

console.log('🔍 Verificando imágenes del juego...\n');

// Verificamos cada ruta
const results = paths.map(imagePath => {
  const exists = fs.existsSync(imagePath);
  
  if (!exists) {
    // Verificamos si existe el directorio padre
    const dirPath = path.dirname(imagePath);
    const dirExists = fs.existsSync(dirPath);
    
    return {
      path: imagePath,
      exists,
      dirExists,
      issue: dirExists ? 'Archivo faltante' : 'Directorio faltante'
    };
  }
  
  return {
    path: imagePath,
    exists,
    dirExists: true,
    issue: null
  };
});

// Mostrar resultados
results.forEach(result => {
  const status = result.exists ? '✅' : '❌';
  console.log(`${status} ${result.path}`);
  
  if (!result.exists) {
    console.log(`   ↳ Problema: ${result.issue}`);
    
    if (!result.dirExists) {
      console.log(`   ↳ Solución: Crea el directorio: mkdir -p ${path.dirname(result.path)}`);
    } else {
      console.log(`   ↳ Solución: Añade la imagen en: ${result.path}`);
    }
  }
});

console.log('\n📋 Resumen:');
const missingFiles = results.filter(r => !r.exists);
if (missingFiles.length === 0) {
  console.log('¡Todas las imágenes existen! Tu juego debería funcionar correctamente.');
} else {
  console.log(`Faltan ${missingFiles.length} imágenes. Sigue las instrucciones anteriores para añadirlas.`);
  
  // Crear estructura de directorios si no existe
  const missingDirs = [...new Set(missingFiles
    .filter(r => !r.dirExists)
    .map(r => path.dirname(r.path)))];
  
  if (missingDirs.length > 0) {
    console.log('\n📁 Comandos para crear los directorios necesarios:');
    missingDirs.forEach(dir => {
      console.log(`mkdir -p ${dir}`);
    });
  }
}
