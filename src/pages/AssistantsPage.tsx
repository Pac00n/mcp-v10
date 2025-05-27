import { useState, useEffect } from "react";
// import Link from "next/link"; // Reemplazado
// import Image from "next/image"; // Reemplazado
import { motion } from "framer-motion";
import { Search, ArrowRight, TrafficCone, Hammer, LucideIcon } from "lucide-react";

interface AssistantCardInfo {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  actionId: string; // ID para la acción de seleccionar
}

const assistantCardsData: AssistantCardInfo[] = [
  {
    id: "senalizacion-v3-card", // ID único para la tarjeta/key
    title: "Asistente de Señalización",
    description: "Identifica y explica señales de tráfico con la nueva interfaz.",
    icon: <TrafficCone className="w-8 h-8 text-orange-400" />,
    color: "from-orange-500 to-red-600",
    actionId: "senalizacion-v3", // ID del asistente a cargar
  },
  {
    id: "n8n-chat-card", // ID único para la tarjeta/key
    title: "Asistente con Herramientas MCP",
    description: "Chat conectado a N8N con herramientas personalizadas.",
    icon: <Hammer className="w-8 h-8 text-rose-400" />, // Icono para el chat de N8N
    color: "from-rose-500 to-pink-600",
    actionId: "n8n-chat", // ID para identificar este chat
  }
];

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

interface AssistantsPageProps {
  onSelectAssistant: (assistantActionId: string) => void;
}

export default function AssistantsPage({ onSelectAssistant }: AssistantsPageProps) {
  const [rotation, setRotation] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Efecto de rotación del logo de fondo (simplificado, sin scroll)
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setRotation(r => (r + 0.1) % 360);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const filteredAssistants = assistantCardsData.filter(assistant => 
    assistant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assistant.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white bg-gray-950 overflow-hidden"> {/* Added overflow-hidden */}
      <div className="fixed inset-0 bg-gray-950 -z-10"> {/* Asegurar que el fondo esté detrás */}
        <div className="fixed inset-0 flex justify-center items-center pointer-events-none">
          <motion.div 
            className="w-full h-full flex items-center justify-center opacity-10"
            style={{ 
              rotate: rotation,
              filter: 'blur(16px)'
            }}
          >
            <img // Reemplazado next/image
              src="/LogosNuevos/logo_orbia_sin_texto.png" // Asegúrate que esta ruta sea accesible desde public/
              alt="Orbia Logo Fondo"
              width={700} 
              height={700}
              className="object-contain"
            />
          </motion.div>
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 md:pt-36 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <motion.div 
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-blue-900/30 border border-blue-800/50 text-blue-300 text-sm font-medium mb-6 backdrop-blur-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
            </span>
            Asistentes disponibles
          </motion.div>

          <div className="mb-12 pt-2">
            <motion.div 
              className="text-5xl md:text-6xl font-bold text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="inline-block">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-orange-300 to-pink-400">
                  Elige tu asistente
                </span>
              </div>
            </motion.div>
          </div>

          <motion.p 
            className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Selecciona entre nuestros asistentes especializados para obtener la mejor asistencia.
          </motion.p>
          
          <div className="mt-8 mb-16 max-w-2xl mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar asistentes..."
              className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-lg bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredAssistants.map((assistant) => (
            <motion.div 
              key={assistant.id}
              variants={itemVariants}
              className="group"
            >
              {/* Reemplazar Link con un div clickeable que llama a onSelectAssistant */}
              <div 
                onClick={() => onSelectAssistant(assistant.actionId)}
                className="cursor-pointer block h-full"
              >
                <div className={`h-full bg-gradient-to-br ${assistant.color}/10 to-gray-900/50 border border-gray-700/50 rounded-2xl p-6 hover:border-orange-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 backdrop-blur-sm group-hover:-translate-y-1`}>
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${assistant.color}/30`}>
                      {assistant.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-1">{assistant.title}</h3>
                      <p className="text-gray-300 text-sm">{assistant.description}</p>
                    </div>
                    <div className="flex-shrink-0 text-gray-400 group-hover:text-white transition-colors">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        {/* ... (resto del contenido si es necesario, como la sección "Nueva experiencia") ... */}
      </main>
    </div>
  );
}