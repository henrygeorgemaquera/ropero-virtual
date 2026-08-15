'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [misPrendas, setMisPrendas] = useState([]); // Nuevo estado para guardar la lista de ropa
  const router = useRouter();

  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        cargarRopa(session.user.id); // Cuando sabemos quién es, cargamos su ropa
      }
    };
    verificarSesion();
  }, [router]);

  // --- NUEVA FUNCIÓN: DESCARGAR Y MOSTRAR LA ROPA ---
  const cargarRopa = async (userId) => {
    // 1. Buscamos en la base de datos qué prendas tiene este usuario
    const { data: prendasDB, error } = await supabase
      .from('prendas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); // Las más nuevas primero

    if (error) {
      console.error("Error al cargar prendas:", error);
      return;
    }

    if (prendasDB) {
      // 2. Por cada prenda, le pedimos al Storage una URL temporal y segura para poder verla
      const prendasConUrl = await Promise.all(prendasDB.map(async (prenda) => {
        const { data: urlData } = await supabase.storage
          .from('prendas')
          .createSignedUrl(prenda.image_url, 3600); // URL válida por 1 hora

        return {
          ...prenda,
          urlVisible: urlData?.signedUrl
        };
      }));

      // 3. Guardamos la ropa en la memoria de la pantalla
      setMisPrendas(prendasConUrl);
    }
  };

  const subirPrenda = async (evento) => {
    try {
      setSubiendo(true); 
      
      const archivo = evento.target.files[0];
      if (!archivo) return;

      const extension = archivo.name.split('.').pop();
      const nombreArchivo = `${Date.now()}.${extension}`; 
      const rutaArchivo = `${user.id}/${nombreArchivo}`; 

      const { error: errorStorage } = await supabase.storage
        .from('prendas')
        .upload(rutaArchivo, archivo);

      if (errorStorage) throw errorStorage;

      const { error: errorBD } = await supabase
        .from('prendas')
        .insert({
          user_id: user.id,
          image_url: rutaArchivo 
        });

      if (errorBD) throw errorBD;

      alert('¡Prenda guardada en tu ropero con éxito!');
      
      // ¡AQUÍ ESTÁ LA MAGIA! Recargamos la galería para que la foto nueva aparezca de inmediato
      cargarRopa(user.id);
      
    } catch (error) {
      alert('Hubo un error al subir la prenda: ' + error.message);
    } finally {
      setSubiendo(false); 
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600 font-medium">Abriendo tu ropero...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col">
      <header className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Mi Ropero</h1>
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}
          className="text-sm bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors"
        >
          Salir
        </button>
      </header>

      <section className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-sm mb-8">
          <label className={`w-full flex flex-col items-center justify-center px-4 py-6 bg-white text-blue-600 rounded-2xl shadow-sm border-2 border-dashed border-blue-300 cursor-pointer hover:bg-blue-50 transition-colors ${subiendo ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="font-semibold text-lg mb-1">
              {subiendo ? 'Subiendo a la nube...' : '+ Agregar Prenda'}
            </span>
            <span className="text-sm text-gray-500">
              {subiendo ? 'Espera un momento' : 'Elige una foto'}
            </span>
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={subirPrenda}
              disabled={subiendo}
            />
          </label>
        </div>

        {/* --- NUEVA GALERÍA DE ROPA --- */}
        <div className="w-full">
          {misPrendas.length === 0 ? (
            <div className="border-4 border-dashed border-gray-200 rounded-2xl p-12 text-center bg-white">
              <p className="text-gray-400">Tus prendas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {misPrendas.map((prenda) => (
                <div key={prenda.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden aspect-square flex items-center justify-center relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={prenda.urlVisible} 
                    alt="Prenda" 
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}