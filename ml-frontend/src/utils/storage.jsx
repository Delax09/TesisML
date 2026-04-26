// src/utils/storage.js
export const storage = {
  guardarItem: async (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    return Promise.resolve();
  },
  
  obtenerItem: async (key) => {
    const item = localStorage.getItem(key);
    if (!item) return Promise.resolve(null);
    
    try {
      // Intentamos parsearlo como JSON (comportamiento normal)
      return Promise.resolve(JSON.parse(item));
    } catch (error) {
      // Si falla (ej. es el string "dark" antiguo), lo devolvemos tal cual
      return Promise.resolve(item);
    }
  },
  
  eliminarItem: async (key) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
};