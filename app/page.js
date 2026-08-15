'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import { removeBackground } from '@imgly/background-removal';
import Link from 'next/link';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [estadoIA, setEstadoIA] = useState(''); 
  const [misPrendas, setMisPrendas] = useState([]); 
  const router = useRouter();

  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        cargarRopa(session.user.id); 
      }
    };
    verificarSesion();
  }, [router]);

  const cargarRopa = async (userId) => {
    const { data: prendasDB, error } = await supabase
      .from('prendas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); 

    if (error) return console.error("Error al cargar prendas:", error);

    if (prendasDB) {
      const prendasConUrl = await Promise.all(prendasDB.map(async (prenda) => {
        const { data: urlData } = await supabase.storage
          .from('prendas')
          .createSignedUrl(prenda.image_url, 3600); 

        return { ...prenda, urlVisible: urlData?.signedUrl };
      }));
      setMisPrendas(prendasConUrl);
    }
  };

  const subirPrenda = async (evento) => {
    try {
      const archivoOriginal = evento.target.files[0];
      if (!archivoOriginal) return;

      setSubiendo(true); 
      
      setEstadoIA('La IA está recortando el fondo (esto toma unos segundos)...');
      
      const blobSinFondo = await removeBackground(archivoOriginal);
      
      const nombreArchivo = `${Date.now()}.png`; 
      const archivoLimpio = new File([blobSinFondo], nombreArchivo, { type: 'image/png' });
      const rutaArchivo = `${user.id}/${nombreArchivo}`; 

      setEstadoIA('Guardando tu prenda en el armario digital...');

      const { error: errorStorage } = await supabase.storage
        .from('prendas')
        .upload(rutaArchivo, archivoLimpio); 

      if (errorStorage) throw errorStorage;

      const { error: errorBD } = await supabase
        .from('prendas')
        .insert({
          user_id: user.id,
          image_url: rutaArchivo 
        });

      if (errorBD) throw errorBD;

      alert('¡Prenda recortada y guardada con éxito!');
      cargarRopa(user.id);
      
    } catch (error) {
      alert('Hubo un error al procesar la prenda: ' + error.message);
    } finally {
      setSubiendo(false); 
      setEstadoIA(''); 
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
        
        <div className="flex gap-2">
          <Link 
            href="/outfits"
            className="text-sm bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Armar Outfit
          </Link>

          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="text-sm bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-sm mb-8">
          <label className={`w-full flex flex-col items-center justify-center px-4 py-6 bg-white text-blue-600 rounded-2xl shadow-sm border-2 border-dashed border-blue-300 cursor-pointer hover:bg-blue-50 transition-colors ${subiendo ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span className="font-semibold text-lg mb-1 text-center">
              {subiendo ? 'Procesando con IA...' : '+ Agregar Prenda'}
            </span>
            <span className="text-sm text-gray-500 text-center px-2">
              {subiendo ? estadoIA : 'Elige una foto. La IA quitará el fondo automáticamente.'}
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

        <div className="w-full">
          {misPrendas.length === 0 ? (
            <div className="border-4 border-dashed border-gray-200 rounded-2xl p-12 text-center bg-white">
              <p className="text-gray-400">Tus prendas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {misPrendas.map((prenda) => (
                <div key={prenda.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden aspect-square flex items-center justify-center relative p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={prenda.urlVisible} 
                    alt="Prenda sin fondo" 
                    className="object-contain w-full h-full drop-shadow-md" 
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