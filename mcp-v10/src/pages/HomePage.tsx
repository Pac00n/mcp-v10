import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, Search, MessageCircle, Globe } from 'lucide-react';

const features = [
  {
    name: 'Respuestas Rápidas',
    description: 'Obtén respuestas instantáneas con nuestra tecnología de IA avanzada.',
    icon: <Zap className="w-8 h-8 text-blue-400" />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    name: 'Búsqueda Inteligente',
    description: 'Encuentra información relevante en segundos con búsqueda avanzada.',
    icon: <Search className="w-8 h-8 text-purple-400" />,
    color: 'from-purple-500 to-fuchsia-500',
  },
  {
    name: 'Asistencia Personalizada',
    description: 'Interactúa con asistentes especializados en diferentes áreas.',
    icon: <MessageCircle className="w-8 h-8 text-orange-400" />,
    color: 'from-orange-500 to-amber-500',
  },
  {
    name: 'Acceso Global',
    description: 'Disponible en cualquier momento y desde cualquier dispositivo.',
    icon: <Globe className="w-8 h-8 text-emerald-400" />,
    color: 'from-emerald-500 to-teal-500',
  },
];

interface HomePageProps {
  navigateToAssistants: () => void;
}

export default function HomePage({ navigateToAssistants }: HomePageProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    // Efecto de rotación del logo de fondo (simplificado, sin scroll)
    let animationFrameId: number;
    const animate = () => {
      setRotation(r => (r + 0.1) % 360);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Placeholder para el componente Link de Next.js
  const CustomLink = ({ href, children, className }: { href?: string, children: React.ReactNode, className?: string }) => {
    if (href === "/assistants") {
      const handleClick = () => {
        console.log("[HomePage] Botón 'Explorar Asistentes' (CustomLink) clickeado.");
        navigateToAssistants();
      };
      return <button onClick={handleClick} className={className}>{children}</button>;
    }
    return <a href={href || "#"} className={className}>{children}</a>;
  };

  return (
    <div className="min-h-screen text-white bg-gray-950 overflow-x-hidden"> {/* Evitar scroll horizontal */}
      {/* Fondo con logo giratorio */}
      <div className="fixed inset-0 bg-gray-950 -z-10">
        <div className="fixed inset-0 flex justify-center items-center pointer-events-none">
          <motion.div 
            className="w-full h-full flex items-center justify-center opacity-10"
            style={{ 
              rotate: rotation,
              filter: 'blur(16px)'
            }}
          >
            <img // Reemplazado next/image
              src="/LogosNuevos/logo_orbia_sin_texto.png" // Asegúrate que esta ruta sea accesible desde public/LogosNuevos/
              alt="Orbia Logo Fondo"
              width={700} 
              height={700}
              className="object-contain"
            />
          </motion.div>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20 md:pt-28 md:pb-28">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="relative flex items-center justify-center mb-8 mx-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{ width: '300px', height: '300px' }} // Ajustado tamaño para que no sea tan grande
          >
            <div className="absolute inset-0">
              <img // Reemplazado next/image
                src="/LogosNuevos/logo_orbia_sin_texto.png" // Asegúrate que esta ruta sea accesible desde public/LogosNuevos/
                alt="Orbia Logo"
                className="object-contain w-full h-full"
              />
            </div>
            <div className="absolute" style={{ width: '140%', height: '50%', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              <img // Reemplazado next/image
                src="/LogosNuevos/orbia_text_transparent.png" // Asegúrate que esta ruta sea accesible desde public/LogosNuevos/
                alt="Orbia"
                className="object-contain w-full h-full"
              />
            </div>
          </motion.div>

          <motion.h1 
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="inline-block">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-orange-300 to-pink-400">
                Potencia tu productividad
              </span>
            </div>
            <div className="mt-2">
              <span className="text-white">con IA avanzada</span>
            </div>
          </motion.h1>
          
          <motion.p 
            className="text-lg text-gray-300 max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Descubre el poder de la inteligencia artificial con nuestros asistentes especializados.
          </motion.p>
          
          <motion.div 
            className="mt-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <CustomLink 
              href="/assistants" 
              className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-purple-500/20"
            >
              Explorar Asistentes
              <ArrowRight className="ml-2 h-4 w-4" />
            </CustomLink>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          className="mt-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible" // Cambiado de animate a whileInView para activar con scroll
          viewport={{ once: true }}
        >
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            variants={itemVariants}
          >
            <div className="inline-block">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-orange-300 to-pink-400">
                Características principales
              </span>
            </div>
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <motion.div
                key={feature.name}
                variants={itemVariants}
                className="bg-gray-900/40 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-orange-500/30 transition-all duration-300 h-full"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-gradient-to-r ${feature.color} bg-opacity-20`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.name}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Más secciones pueden ir aquí si es necesario, adaptadas de forma similar */}

      </main>

      {/* Footer simplificado */}
      <footer className="bg-gray-900/40 backdrop-blur-sm border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Orbia. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}