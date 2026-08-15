'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase'; // <--- Nota los 4 puntitos aquí
import { useRouter } from 'next/navigation'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  
  const router = useRouter(); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje('Iniciando sesión...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje('Error: ' + error.message);
    } else {
      setMensaje('¡Sesión iniciada! Redirigiendo...');
      router.push('/'); 
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setMensaje('Creando cuenta...');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMensaje('Error al crear cuenta: ' + error.message);
    } else {
      setMensaje('¡Cuenta creada! Ya puedes iniciar sesión.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-100">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-md border border-gray-200">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Ropero Virtual
        </h1>
        
        <form className="flex flex-col space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-gray-800 focus:outline-none focus:border-blue-500" placeholder="tu@correo.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-gray-800 focus:outline-none focus:border-blue-500" placeholder="******" required />
          </div>
          {mensaje && <div className="text-sm text-center font-medium text-blue-600 bg-blue-50 p-2 rounded">{mensaje}</div>}
          <div className="pt-4 flex flex-col space-y-3">
            <button onClick={handleLogin} className="w-full bg-black text-white p-3 rounded-lg hover:bg-gray-800 font-medium transition-colors">Iniciar Sesión</button>
            <button onClick={handleSignUp} className="w-full bg-gray-200 text-gray-800 p-3 rounded-lg hover:bg-gray-300 font-medium transition-colors">Crear Cuenta Nueva</button>
          </div>
        </form>
      </div>
    </main>
  );
}