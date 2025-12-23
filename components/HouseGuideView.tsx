import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Calendar, 
    Key, 
    FileText, 
    BookOpen, 
    Clock, 
    Utensils, 
    GraduationCap, 
    ChevronRight, 
    Download,
    ExternalLink,
    Search,
    Info,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    LayoutGrid,
    Check,
    AlertCircle
} from 'lucide-react';

import { User, HouseSettings, HouseDocument, AppGuideSection, Task } from '../types';
import { houseGuideService } from '../services/houseGuide';
import { profileService } from '../services/profiles';
import { tasksService } from '../services/tasks';
import { UserAvatar } from './UserAvatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    // Process text into segments (bold, lists, etc.)
    const processLines = (content: string) => {
        if (!content) return null;
        const lines = content.split('\n');
        return lines.map((line, idx) => {
            // Handle bullet points
            if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                const bulletChar = line.trim().substring(0, 1);
                const lineContent = line.trim().substring(1).trim();
                return (
                    <div key={idx} className="flex gap-2 mb-1 pl-1">
                        <span className="text-zinc-500 font-bold">{bulletChar}</span>
                        <span className="flex-1">{renderInline(lineContent)}</span>
                    </div>
                );
            }
            
            // Handle numbered lists
            const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
            if (numMatch) {
                return (
                    <div key={idx} className="flex gap-2 mb-1 pl-1">
                        <span className="text-zinc-400 font-bold">{numMatch[1]}.</span>
                        <span className="flex-1">{renderInline(numMatch[2])}</span>
                    </div>
                );
            }

            // Empty line
            if (!line.trim()) {
                return <div key={idx} className="h-2" />;
            }

            // Regular line
            return <p key={idx} className="mb-2 leading-relaxed">{renderInline(line)}</p>;
        });
    };

    const renderInline = (str: string) => {
        if (!str) return '';
        // Simple bold processing: **text**
        const parts = str.split(/(\*\*.*?\*\*)/);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-zinc-900 dark:text-zinc-100">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return <div className="formatted-text">{processLines(text)}</div>;
};

const DocumentCard: React.FC<{ doc: HouseDocument }> = ({ doc }) => (
    <a
        href={houseGuideService.getDocumentUrl(doc.filePath)}
        target="_blank"
        rel="noopener noreferrer"
        className="group bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-900/50 transition-all shadow-sm"
    >
        <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl group-hover:scale-110 transition-transform">
                <FileText size={20} className="text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate" title={doc.fileName}>
                    {doc.fileName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-400 uppercase">
                        {format(new Date(doc.createdAt), 'd MMM yyyy', { locale: es })}
                    </span>
                    <span className="w-1 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                    <span className="text-[10px] text-zinc-400">
                        {(doc.fileSize! / 1024 / 1024).toFixed(2)} MB
                    </span>
                </div>
            </div>
            <Download size={16} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    </a>
);

interface HouseGuideViewProps {
    user: User;
    refreshTrigger?: number;
    initialSection?: 'TASKS' | 'RESIDENTS' | 'SCHEDULES' | 'INSTRUCTIONS' | 'KEYS' | 'DOCS' | 'WIKI';
}

export const HouseGuideView: React.FC<HouseGuideViewProps> = ({ user, refreshTrigger, initialSection }) => {
    const [activeSection, setActiveSection] = useState<'TASKS' | 'RESIDENTS' | 'SCHEDULES' | 'INSTRUCTIONS' | 'KEYS' | 'DOCS' | 'WIKI'>(initialSection || (user.role === 'ADMIN' ? 'DOCS' : 'TASKS'));
    const [residents, setResidents] = useState<User[]>([]);
    const [settings, setSettings] = useState<HouseSettings | null>(null);
    const [documents, setDocuments] = useState<HouseDocument[]>([]);
    const [userTasks, setUserTasks] = useState<Task[]>([]);
    const [wikiSections, setWikiSections] = useState<AppGuideSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const APP_GUIDE_CONTENT: AppGuideSection[] = [
        {
            id: 'intro',
            title: '¿Qué es Quango?',
            content: 'Quango es la plataforma de gestión integral diseñada específicamente para facilitar la convivencia y la administración en residencias. Centraliza todos los servicios, desde la logística de vehículos y mantenimiento hasta la planificación de comidas y comunicación directa con administración.\n\nEl objetivo de Quango es que cada residente tenga toda la información y herramientas necesarias en la palma de su mano, asegurando que la casa funcione de manera eficiente y transparente.',
            orderIndex: 0,
            createdAt: '',
            updatedAt: ''
        },
        {
            id: 'vehicles',
            title: 'Reserva de Vehículos',
            content: 'El módulo de vehículos permite gestionar el uso compartido de la flota de la casa de forma equitativa.\n\n**¿Cómo reservar un coche?**\n1. En el **Tablero principal**, verás las tarjetas de los vehículos disponibles.\n2. Haz clic en el vehículo que desees (ej: "Toyota Corolla").\n3. En el calendario/horario, pulsa en "Nueva Reserva".\n4. Selecciona el **rango horario** exacto (Inicio y Fin).\n5. Si el coche es para un invitado externo, marca la casilla **"Para un invitado"** e introduce su nombre.\n6. Añade **Notas** si es relevante (ej: "Viaje a Segovia, volveré tarde").\n7. Pulsa en **Confirmar**. ¡Listo! El coche aparecerá como reservado para ti.\n\n**Estados del coche:**\n• **Disponible**: Color verde. Puedes reservarlo.\n• **Reservado**: Color azul. Indica quién lo tiene y hasta cuándo.\n• **Taller / No Disponible**: Color rojo. El coche está en mantenimiento y no admite reservas.',
            orderIndex: 1,
            createdAt: '',
            updatedAt: ''
        },
        {
            id: 'maintenance',
            title: 'Mantenimiento (Arreglos)',
            content: 'Si detectas una avería o algo que necesite atención en la casa o en los coches, debes registrar un ticket de mantenimiento.\n\n**¿Cómo registrar un nuevo arreglo?**\n1. Ve a la pestaña de **Mantenimiento**.\n2. Pulsa el botón **"+"** o "Nuevo Aviso".\n3. **Título**: Define brevemente el problema (ej: "Grifo gotea en cocina").\n4. **Descripción**: Da detalles para que el equipo sepa qué herramientas llevar.\n5. **Ubicación**: Indica dónde está el problema.\n6. **Prioridad**: Selecciona desde "Baja" hasta "Crítica" según la urgencia.\n7. **Imagen**: Si puedes, sube una foto del desperfecto; ayuda mucho a la resolución rápida.\n\n**Seguimiento**: Podrás ver el estado de tu aviso (Abierto, En Proceso, Resuelto). Recibirás una notificación cuando un administrador lo gestione.',
            orderIndex: 2,
            createdAt: '',
            updatedAt: ''
        },
        {
            id: 'meals',
            title: 'Gestión de Comidas',
            content: 'Este es uno de los módulos más importantes para la organización diaria de la cocina.\n\n**Pedidos Diarios:**\nEn la sección de **Comidas**, verás el menú del día. Debes seleccionar tu opción preferida para Comida y Cena. \n• Si necesitas comer fuera, selecciona la opción **"Bolsa"**.\n• El estado de tu pedido cambiará de "Pendiente" a **"Confirmado"** una vez pase la hora de corte.\n\n**Plantillas Semanales:**\nPara no tener que pedir cada día, usa el **Editor de Plantilla**. Configura lo que sueles comer cada día de la semana (ej: siempre Bolsa el lunes). Quango generará tus pedidos automáticamente cada domingo noche basándose en esta plantilla.\n\n**Horarios de Cierre:**\nAtención a los límites. Una vez cerrada la cocina para un servicio (ej: cena de hoy), ya no podrás realizar cambios. Aparecerá un candado indicando **"Pedido Confirmado" o "Cerrado"**.',
            orderIndex: 3,
            createdAt: '',
            updatedAt: ''
        },
        {
            id: 'calendar',
            title: 'Calendario y Eventos',
            content: 'El calendario centraliza la vida social y litúrgica de la casa.\n\n**Eventos de la Casa:**\nConsulta convivencias, charlas o celebraciones especiales. Solo los administradores pueden introducir nuevos eventos, pero todos los residentes pueden consultarlos en tiempo real.\n\n**Información Litúrgica (Epacta):**\nEn la parte inferior de cada día en el calendario, verás información sobre la Misa del día: color litúrgico, santoral o lecturas recomendadas. Es una herramienta ideal para preparar la oración personal.',
            orderIndex: 4,
            createdAt: '',
            updatedAt: ''
        },
        {
            id: 'messaging',
            title: 'Mensajería y Notificaciones',
            content: 'Quango incluye un canal de comunicación directa con el equipo de administración.\n\n**Mensajes:**\nUsa la pestaña de **Mensajería** en tu perfil para consultas privadas (facturación, dudas personales, peticiones especiales). Son chats individuales y seguros.\n\n**Notificaciones Push:**\nEs **CRÍTICO** que habilites las notificaciones en tu perfil. \n1. Ve a tu Perfil -> Configuración de Notificaciones.\n2. Pulsa en **"Habilitar Notificaciones"**.\n3. Acepta el permiso del navegador.\nEsto te permitirá recibir avisos inmediatos cuando te respondan un mensaje, se resuelva un aviso de mantenimiento o haya cambios importantes en los horarios de la casa.',
            orderIndex: 5,
            createdAt: '',
            updatedAt: ''
        },
        {
            id: 'profile',
            title: 'Perfil, Dieta y Ausencias',
            content: 'Mantener tu perfil actualizado es vital para la convivencia.\n\n**Información Requerida:**\n• **Siglas / Iniciales**: Ahora puedes usar hasta **5 caracteres** (ej: PFARA). Sirven para identificarte rápidamente en calendarios y listas.\n• **Cumpleaños**: Para que la casa pueda celebrarlo contigo.\n• **Dieta Especial**: Si tienes alergias o sigues una dieta médica, márcalo y sube los documentos necesarios (PDF/Imagen) para que cocina esté informada.\n\n**Gestión de Ausencias:**\nSi vas a estar fuera (fin de semana, vacaciones), regístralo en la sección **"Ausencias"** de tu perfil. Indica fecha de inicio y fin. Esto avisará automáticamente a cocina para que no cuenten contigo en esos servicios, evitando el desperdicio de comida.',
            orderIndex: 6,
            createdAt: '',
            updatedAt: ''
        }
    ];

    useEffect(() => {
        loadData();
    }, [refreshTrigger]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch everything, but handle errors individually to prevent total failure
            const [usersDataResult, settingsDataResult, docsDataResult, tasksDataResult] = await Promise.allSettled([
                profileService.getAllProfiles(),
                houseGuideService.getSettings(),
                houseGuideService.getDocuments(),
                tasksService.getTasks() // Fetch ALL tasks now
            ]);

            if (usersDataResult.status === 'fulfilled') {
                setResidents(usersDataResult.value.filter(u => u.status === 'APPROVED' && u.role !== 'KITCHEN'));
            } else {
                console.error('Error loading residents:', usersDataResult.reason);
            }

            if (settingsDataResult.status === 'fulfilled') {
                setSettings(settingsDataResult.value);
            } else {
                console.error('Error loading settings:', settingsDataResult.reason);
            }

            if (docsDataResult.status === 'fulfilled') {
                setDocuments(docsDataResult.value);
            } else {
                console.error('Error loading documents:', docsDataResult.reason);
            }

            if (tasksDataResult.status === 'fulfilled') {
                setUserTasks(tasksDataResult.value.filter(t => t.status === 'open'));
            } else {
                console.error('Error loading tasks:', tasksDataResult.reason);
            }

            setWikiSections(APP_GUIDE_CONTENT);
        } catch (error) {
            console.error('Error in loadData Promise.allSettled catch:', error);
            setWikiSections(APP_GUIDE_CONTENT);
        } finally {
            setLoading(false);
        }
    };

    const filteredResidents = residents.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.initials?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.roomName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const menuItems = [
        { id: 'TASKS', label: 'Encargos', icon: ClipboardList, color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-900/10' },
        { id: 'RESIDENTS', label: 'Residentes', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
        { id: 'SCHEDULES', label: 'Horarios', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
        { id: 'INSTRUCTIONS', label: 'Instrucciones', icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
        { id: 'KEYS', label: 'Llaves y Claves', icon: Key, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
        { id: 'DOCS', label: 'Documentos', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/10' },
        { id: 'WIKI', label: 'Manual App', icon: BookOpen, color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-900/10' },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Cargando guía de la casa...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Horizontal Section Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                            activeSection === item.id 
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md' 
                            : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                    >
                        <item.icon size={16} />
                        {item.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <motion.div 
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
            >
                {/* 0. TASKS SECTION */}
                {activeSection === 'TASKS' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                            <ClipboardList size={20} className="text-zinc-500" />
                            Encargos Vigentes
                        </h3>
                        
                        {settings?.tasksMaintenanceMode ? (
                            <div className="py-20 px-4 text-center bg-amber-50 dark:bg-amber-900/10 rounded-3xl border-2 border-dashed border-amber-200 dark:border-amber-900/20 space-y-4">
                                <AlertCircle className="mx-auto text-amber-500" size={48} />
                                <div className="max-w-md mx-auto space-y-2">
                                    <h4 className="text-xl font-bold text-amber-900 dark:text-amber-400">Sistema en Mantenimiento</h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-500/80 leading-relaxed">
                                        Estamos organizando y asignando los encargos para el inicio del curso. Esta sección volverá a estar disponible muy pronto.
                                    </p>
                                </div>
                            </div>
                        ) : userTasks.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {userTasks.map(task => (
                                    <div key={task.id} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-zinc-900 dark:text-white">{task.title}</h4>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{task.description}</p>
                                            </div>
                                            {task.type === 'vehicle' && (
                                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-bold uppercase tracking-wider">Vehículo</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-zinc-50 dark:border-zinc-800/50">
                                            <div className="flex items-center gap-2">
                                                <UserAvatar name={task.assignedUserName || '?'} imageUrl={task.assignedUserAvatar} size="xs" />
                                                <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400">{task.assignedUserName}</span>
                                            </div>
                                            {task.vehicleName && (
                                                <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                                                    <ExternalLink size={10} />
                                                    <span>{task.vehicleName}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-800/10 rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-900/20">
                                <Check size={32} className="mx-auto text-emerald-500 mb-3" />
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">¡Todo al día! No hay encargos pendientes en la casa.</p>
                            </div>
                        )}
                    </div>
                )}
                {/* 1. RESIDENTS SECTION */}
                {activeSection === 'RESIDENTS' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                <Users size={20} className="text-blue-500" />
                                Directorio de Residentes
                            </h3>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                <input 
                                    type="text"
                                    placeholder="Buscar por nombre, siglas..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                                            <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Nombre</th>
                                            <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Siglas</th>
                                            <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Habitación</th>
                                            <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cumpleaños</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {filteredResidents.map(res => (
                                            <tr key={res.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar name={res.name} imageUrl={res.avatarUrl} size="sm" />
                                                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{res.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                                        {res.initials || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                                        {res.roomName 
                                                            ? res.roomTotalBeds && res.roomTotalBeds > 1 
                                                                ? `${res.roomName} (Cama ${res.bedNumber})` 
                                                                : res.roomName
                                                            : 'No asignada'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                    {res.birthday ? format(new Date(res.birthday), 'd MMMM', { locale: es }) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. SCHEDULES SECTION */}
                {activeSection === 'SCHEDULES' && settings && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: 'Días de Semana', key: 'weekdays', icon: Clock, color: 'text-blue-500' },
                            { title: 'Sábados', key: 'saturdays', icon: Clock, color: 'text-zinc-500' },
                            { title: 'Domingos y Festivos', key: 'sundays', icon: Clock, color: 'text-emerald-500' }
                        ].map(type => (
                            <div key={type.key} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                    <type.icon size={18} className={type.color} />
                                    <h4 className="text-base font-medium text-zinc-900 dark:text-white">{type.title}</h4>
                                </div>
                                <div className="space-y-4">
                                    {(settings.schedules as any)[type.key]?.length > 0 ? (
                                        (settings.schedules as any)[type.key].map((item: any, i: number) => (
                                            <div key={i} className="flex gap-4">
                                                <div className="flex flex-col w-14 shrink-0">
                                                    <span className="text-sm font-bold text-zinc-900 dark:text-white">{item.time}</span>
                                                    {item.endTime && (
                                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium -mt-1">a {item.endTime}</span>
                                                    )}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-sm text-zinc-800 dark:text-zinc-200 font-medium">{item.activity}</p>
                                                    {item.notes && <p className="text-xs text-zinc-500 dark:text-zinc-500">{item.notes}</p>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-zinc-400 italic">No hay horarios definidos</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. INSTRUCTIONS */}
                {activeSection === 'INSTRUCTIONS' && settings && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                            <Info size={20} className="text-blue-500" />
                            Instrucciones y Normas de la Casa
                        </h3>
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm leading-relaxed">
                            {settings.instructions ? (
                                <div className="prose dark:prose-invert prose-zinc max-w-none text-zinc-600 dark:text-zinc-400 font-normal">
                                    <FormattedText text={settings.instructions} />
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-400 italic">No hay instrucciones registradas actualmente.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. KEYS SECTION */}
                {activeSection === 'KEYS' && settings && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                            <Key size={20} className="text-amber-500" />
                            Llaves y Acceso
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {settings.houseKeys?.length > 0 ? (
                                settings.houseKeys.map((key) => (
                                    <div key={key.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-4 shadow-sm">
                                        <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg shrink-0">
                                            <Key size={20} className="text-amber-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{key.name}</p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{key.description}</p>
                                            {key.location && (
                                                <div className="mt-3 flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Ubicación:</span>
                                                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300">{key.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                    <p className="text-sm text-zinc-400">No hay información de llaves registrada</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. DOCUMENTS SECTION */}
                {activeSection === 'DOCS' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                <FileText size={20} className="text-rose-500" />
                                Documentos de Interés
                            </h3>
                            <p className="text-xs text-zinc-500">{documents.length} archivos disponibles</p>
                        </div>

                        {documents.length > 0 ? (
                            <div className="space-y-8">
                                {/* Experiences Sub-section */}
                                {documents.some(d => d.category === 'experience') && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                            <LayoutGrid size={16} className="text-emerald-500" />
                                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Experiencias</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {documents.filter(d => d.category === 'experience').map((doc) => (
                                                <DocumentCard key={doc.id} doc={doc} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other Documents Sub-section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                                        <FileText size={16} className="text-zinc-400" />
                                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">General</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {documents.filter(d => d.category !== 'experience').map((doc) => (
                                            <DocumentCard key={doc.id} doc={doc} />
                                        ))}
                                        {documents.filter(d => d.category !== 'experience').length === 0 && (
                                            <div className="col-span-full py-10 text-center text-xs text-zinc-400 italic">No hay documentos generales</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                                <FileText size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                                <p className="text-sm text-zinc-500">No hay documentos compartidos todavía</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. WIKI SECTION (App Guide) */}
                {activeSection === 'WIKI' && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Wiki Navigation (Sticky side) */}
                        <div className="lg:col-span-1 border-r border-zinc-100 dark:border-zinc-800 pr-4 hidden lg:block h-fit sticky top-24">
                            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-6">Contenidos</h4>
                            <div className="space-y-1">
                                {wikiSections.map(section => (
                                    <a
                                        key={section.id}
                                        href={`#wiki-${section.id}`}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all"
                                    >
                                        <ChevronRight size={14} className="text-zinc-300" />
                                        {section.title}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Wiki Content */}
                        <div className="lg:col-span-3 space-y-12 pb-20">
                            {wikiSections.length > 0 ? (
                                wikiSections.map(section => (
                                    <section 
                                        key={section.id} 
                                        id={`wiki-${section.id}`}
                                        className="space-y-4 scroll-mt-24"
                                    >
                                        <h3 className="text-xl font-medium text-zinc-900 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full" />
                                            {section.title}
                                        </h3>
                                        <div className="prose dark:prose-invert prose-sm max-w-none text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal">
                                            <FormattedText text={section.content} />
                                        </div>
                                    </section>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl">
                                    <BookOpen size={32} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                                    <p className="text-sm text-zinc-500">La guía del usuario aún no tiene contenido</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

