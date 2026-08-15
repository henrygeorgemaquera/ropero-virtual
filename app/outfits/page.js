'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OutfitsPage() {
  const [user, setUser] = useState(null);
  const [miRopa, setMiRopa] = useState([]);
  const [lienzoOutfits, setLienzoOutfits] = useState([]); 
  const [prendaActiva, setPrendaActiva] = useState(null); 
  
  const lienzoRef = useRef(null);
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
    const { data: prendasDB } = await supabase
      .from('prendas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (prendasDB) {
      const prendasConUrl = await Promise.all(prendasDB.map(async (prenda) => {
        const { data: urlData } = await supabase.storage
          .from('prendas')
          .createSignedUrl(prenda.image_url, 3600);
        return { ...prenda, urlVisible: urlData?.signedUrl };
      }));
      setMiRopa(prendasConUrl);
    }
  };

  const agregarAlLienzo = (prenda) => {
    setLienzoOutfits([...lienzoOutfits, { ...prenda, idLienzo: Date.now(), x: 100, y: 100 }]);
  };

  const iniciarArrastre = (e, idLienzo) => {
    setPrendaActiva(idLienzo);
  };

  const moverPrenda = (e) => {
    if (!prendaActiva || !lienzoRef.current) return;

    const clienteX = e.touches ? e.touches[0].clientX : e.clientX;
    const clienteY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = lienzoRef.current.getBoundingClientRect();
    const nuevaX = clienteX - rect.left - 50; 
    const nuevaY = clienteY - rect.top - 50;

    setLienzoOutfits(lienzoOutfits.map(p => 
      p.idLienzo === prendaActiva ? { ...p, x: nuevaX, y: nuevaY } : p
    ));
  };

  const soltarPrenda = () => {
    setPrendaActiva(null);
  };

  const quitarDelLienzo = (idLienzo) => {
    setLienzoOutfits(lienzoOutfits.filter(p => p.idLienzo !== idLienzo));
  };

  if (!user) return <div className="p-6">Cargando estudio...</div>;

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col font-sans">
      
      <header className="flex justify-between items-center p-4 bg-gray-800 text-white shadow-md">
        <h1 className="text-xl font-bold">Estudio de Outfits</h1>
        <Link href="/" className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition text-sm">
          Volver al Ropero
        </Link>
      </header>

      <section className="bg-gray-800 border-b border-gray-700 p-4">
        <p className="text-gray-400 text-xs uppercase mb-2 font-bold tracking-wider">Toca una prenda para usarla</p>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {miRopa.map((prenda) => (
            <div 
              key={prenda.id} 
              onClick={() => agregarAlLienzo(prenda)}
              className="min-w-[80px] w-20 h-20 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0 border-2 border-transparent hover:border-blue-500 cursor-pointer active:scale-95 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={prenda.urlVisible} alt="prenda" className="w-full h-full object-contain p-1 drop-shadow-md" />
            </div>
          ))}
          {miRopa.length === 0 && <p className="text-sm text-gray-500">No tienes ropa. Vuelve al ropero a subir fotos.</p>}
        </div>
      </section>

      <section 
        className="flex-1 relative bg-gray-100 overflow-hidden touch-none"
        ref={lienzoRef}
        onMouseMove={moverPrenda}
        onMouseUp={soltarPrenda}
        onMouseLeave={soltarPrenda}
        onTouchMove={moverPrenda}
        onTouchEnd={soltarPrenda}
      >
        {lienzoOutfits.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none opacity-50">
            <span className="text-4xl mb-2">✨</span>
            <p className="font-medium">Tu lienzo está vacío</p>
            <p className="text-sm">Agrega prendas desde arriba</p>
          </div>
        )}

        {lienzoOutfits.map((prenda) => (
          <div
            key={prenda.idLienzo}
            onMouseDown={(e) => iniciarArrastre(e, prenda.idLienzo)}
            onTouchStart={(e) => iniciarArrastre(e, prenda.idLienzo)}
            onDoubleClick={() => quitarDelLienzo(prenda.idLienzo)}
            className={`absolute w-32 h-32 cursor-grab flex items-center justify-center transition-transform ${prendaActiva === prenda.idLienzo ? 'scale-110 z-50 cursor-grabbing' : 'z-10 hover:scale-105'}`}
            style={{ 
              left: `${prenda.x}px`, 
              top: `${prenda.y}px`,
              filter: prendaActiva === prenda.idLienzo ? 'drop-shadow(0 20px 13px rgb(0 0 0 / 0.3))' : 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))'
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={prenda.urlVisible} alt="outfit" className="w-full h-full object-contain pointer-events-none" />
            
            <button 
              onClick={(e) => { e.stopPropagation(); quitarDelLienzo(prenda.idLienzo); }}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs font-bold shadow-md md:hidden"
            >
              X
            </button>
          </div>
        ))}
      </section>
      
      <footer className="bg-gray-100 p-4 border-t border-gray-300 text-center">
         <p className="text-xs text-gray-500">Arrastra las prendas para crear tu combinación. Doble clic (o toca la X) para quitar.</p>
      </footer>
    </main>
  );
}