import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';
import { Room, RoomBed, UserAbsence } from '../types';
import { absencesService } from '../services/absences';
import { ManageAbsencesModal } from './ManageAbsencesModal';

interface RoomTimelineViewProps {
    rooms: Room[];
    beds: RoomBed[];
}

interface TooltipData {
    bedId: string;
    segment: {
        start: number;
        end: number;
        type: 'occupied' | 'absent' | 'available';
    };
    userName?: string;
    roomName: string;
    bedNumber: number;
    absence?: UserAbsence;
}

export const RoomTimelineView: React.FC<RoomTimelineViewProps> = ({ rooms, beds }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [absences, setAbsences] = useState<UserAbsence[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [tooltip, setTooltip] = useState<{ data: TooltipData; x: number; y: number } | null>(null);
    const [managementModal, setManagementModal] = useState<{
        isOpen: boolean;
        userId: string;
        userName: string;
        roomName: string;
        bedNumber: number;
    } | null>(null);

    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

    // Get start and end of current month
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    useEffect(() => {
        // Create a stable container for portals to avoid "removeChild" errors
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.left = '0';
        div.style.zIndex = '9999';
        div.style.pointerEvents = 'none'; // Ensure clicks pass through
        document.body.appendChild(div);
        setPortalContainer(div);

        return () => {
            if (document.body.contains(div)) {
                document.body.removeChild(div);
            }
        };
    }, []);

    useEffect(() => {
        loadAbsences();
    }, [currentDate]);

    const loadAbsences = async () => {
        setIsLoading(true);
        try {
            const start = startOfMonth.toISOString().split('T')[0];
            const end = endOfMonth.toISOString().split('T')[0];
            const absencesData = await absencesService.getAbsencesInRange(start, end);
            setAbsences(absencesData);
        } catch (err) {
            console.error('Error loading absences:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getDaysInMonth = () => {
        const days: Date[] = [];
        for (let i = 1; i <= endOfMonth.getDate(); i++) {
            days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        }
        return days;
    };

    const isUserAbsent = (userId: string | undefined, date: Date): boolean => {
        if (!userId) return false;
        const dateStr = date.toISOString().split('T')[0];
        return absences.some(
            absence =>
                absence.userId === userId &&
                absence.startDate <= dateStr &&
                absence.endDate >= dateStr
        );
    };

    const getAbsenceForSegment = (userId: string | undefined, startIdx: number, endIdx: number): UserAbsence | undefined => {
        if (!userId) return undefined;
        const days = getDaysInMonth();
        const startDate = days[startIdx].toISOString().split('T')[0];

        return absences.find(
            absence =>
                absence.userId === userId &&
                absence.startDate <= startDate &&
                absence.endDate >= startDate
        );
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleSegmentClick = (bed: RoomBed) => {
        if (bed.assignedUserId && bed.assignedUserName) {
            setManagementModal({
                isOpen: true,
                userId: bed.assignedUserId,
                userName: bed.assignedUserName,
                roomName: bed.roomName,
                bedNumber: bed.bedNumber
            });
            setTooltip(null);
        }
    };

    const handleSegmentHover = (e: React.MouseEvent, bedId: string, bed: RoomBed, segment: any) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const absence = segment.type === 'absent' ? getAbsenceForSegment(bed.assignedUserId, segment.start, segment.end) : undefined;

        setTooltip({
            data: {
                bedId,
                segment,
                userName: bed.assignedUserName,
                roomName: bed.roomName,
                bedNumber: bed.bedNumber,
                absence
            },
            x: rect.left + rect.width / 2,
            y: rect.top - 10
        });
    };

    const handleSegmentLeave = () => {
        setTooltip(null);
    };

    const days = getDaysInMonth();
    const monthName = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const dayWidth = 40; // Width in pixels for each day column

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white capitalize">{monthName}</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-600 dark:text-zinc-400"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-sm font-medium text-zinc-600 dark:text-zinc-400"
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-600 dark:text-zinc-400"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Timeline Grid */}
            {isLoading ? (
                <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-900 dark:border-white border-t-transparent"></div>
                    <p className="mt-4 text-zinc-600 dark:text-zinc-400">Cargando cronograma...</p>
                </div>
            ) : beds.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    No hay camas creadas. Crea habitaciones primero.
                </div>
            ) : (
                <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
                        <div className="inline-block min-w-full">
                            {/* Days Header - Sticky */}
                            <div className="sticky top-0 z-10 flex border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                                <div className="w-48 flex-shrink-0 p-3 font-medium text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                                    Habitación / Cama
                                </div>
                                {days.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-shrink-0 p-2 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 border-r border-zinc-100 dark:border-zinc-800"
                                        style={{ width: `${dayWidth}px` }}
                                    >
                                        <div>{day.getDate()}</div>
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-500">
                                            {day.toLocaleDateString('es-ES', { weekday: 'narrow' })}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Beds Rows */}
                            {beds.map((bed) => {
                                // Calculate continuous segments
                                const segments: { start: number; end: number; type: 'occupied' | 'absent' | 'available' }[] = [];
                                let currentSegment: { start: number; end: number; type: 'occupied' | 'absent' | 'available' } | null = null;

                                days.forEach((day, idx) => {
                                    const isAbsent = isUserAbsent(bed.assignedUserId, day);
                                    const type = bed.assignedUserId
                                        ? (isAbsent ? 'absent' : 'occupied')
                                        : 'available';

                                    if (!currentSegment || currentSegment.type !== type) {
                                        if (currentSegment) {
                                            segments.push(currentSegment);
                                        }
                                        currentSegment = { start: idx, end: idx, type };
                                    } else {
                                        currentSegment.end = idx;
                                    }
                                });

                                if (currentSegment) {
                                    segments.push(currentSegment);
                                }

                                return (
                                    <div
                                        key={bed.id}
                                        className="flex border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors"
                                    >
                                        {/* Bed Label */}
                                        <div className="w-48 flex-shrink-0 p-3 border-r border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 group relative flex flex-col justify-center">
                                            <div className="font-medium text-zinc-900 dark:text-white text-sm">
                                                {bed.roomName}
                                            </div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate h-4">
                                                {(() => {
                                                    const room = rooms.find(r => r.id === bed.roomId);
                                                    const isMultiBed = room && room.totalBeds > 1;

                                                    if (bed.assignedUserName) {
                                                        return isMultiBed
                                                            ? `${bed.assignedUserName} · Cama ${bed.bedNumber}`
                                                            : bed.assignedUserName;
                                                    }

                                                    return isMultiBed ? `Cama ${bed.bedNumber}` : null;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Timeline - Grid background with continuous bars */}
                                        <div className="flex-1 relative" style={{ height: '70px' }}>
                                            {/* Grid background */}
                                            <div className="absolute inset-0 flex">
                                                {days.map((_, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="border-r border-zinc-100 dark:border-zinc-800"
                                                        style={{ width: `${dayWidth}px` }}
                                                    />
                                                ))}
                                            </div>

                                            {/* Segments */}
                                            {segments.map((segment, segIdx) => {
                                                const left = segment.start * dayWidth;
                                                const width = (segment.end - segment.start + 1) * dayWidth;

                                                let bgColor = '';
                                                let borderColor = '';
                                                let label = '';

                                                if (segment.type === 'occupied') {
                                                    bgColor = 'bg-zinc-900 dark:bg-white';
                                                    borderColor = 'border-zinc-900 dark:border-white';
                                                    label = 'Ocupada';
                                                } else if (segment.type === 'absent') {
                                                    bgColor = 'bg-orange-200 dark:bg-orange-700/50';
                                                    borderColor = 'border-orange-400 dark:border-orange-600';
                                                    label = 'Ausente (Disponible)';
                                                } else {
                                                    bgColor = 'bg-zinc-100 dark:bg-zinc-700';
                                                    borderColor = 'border-zinc-300 dark:border-zinc-600';
                                                    label = 'Disponible';
                                                }

                                                return (
                                                    <div
                                                        key={segIdx}
                                                        className={`absolute top-1/2 -translate-y-1/2 h-6 rounded border ${bgColor} ${borderColor} ${segment.type !== 'available' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                                                            } transition-opacity`}
                                                        style={{
                                                            left: `${left}px`,
                                                            width: `${width}px`,
                                                        }}
                                                        onMouseEnter={(e) => handleSegmentHover(e, bed.id, bed, segment)}
                                                        onMouseLeave={handleSegmentLeave}
                                                        onClick={() => segment.type !== 'available' && handleSegmentClick(bed)}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">
                        <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-4 rounded bg-zinc-900 dark:bg-white border border-zinc-900 dark:border-white"></div>
                                <span className="text-zinc-700 dark:text-zinc-300">Ocupada</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-4 rounded bg-orange-200 dark:bg-orange-700/50 border border-orange-400 dark:border-orange-600"></div>
                                <span className="text-zinc-700 dark:text-zinc-300">Ausente (Disponible)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-4 rounded bg-zinc-100 dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"></div>
                                <span className="text-zinc-700 dark:text-zinc-300">Disponible</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tooltip - Rendered in dedicated portal container */}
            {tooltip && portalContainer && createPortal(
                <div
                    className="fixed bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3 py-2 rounded-lg shadow-xl text-xs max-w-xs pointer-events-none"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                            <User size={12} />
                            {tooltip.data.roomName}
                            {tooltip.data.bedNumber > 0 && ` - Cama ${tooltip.data.bedNumber}`}
                        </div>
                        {tooltip.data.userName && (
                            <div className="text-zinc-300 dark:text-zinc-600">
                                {tooltip.data.userName}
                            </div>
                        )}
                        {tooltip.data.segment.type === 'absent' && tooltip.data.absence && (
                            <div className="pt-1 border-t border-zinc-700 dark:border-zinc-300 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={10} />
                                    <span className="text-orange-300 dark:text-orange-600 font-medium">Ausencia</span>
                                </div>
                                <div className="text-zinc-400 dark:text-zinc-500">
                                    {formatDate(tooltip.data.absence.startDate)} - {formatDate(tooltip.data.absence.endDate)}
                                </div>
                                {tooltip.data.absence.notes && (
                                    <div className="text-zinc-400 dark:text-zinc-500 italic">
                                        "{tooltip.data.absence.notes}"
                                    </div>
                                )}
                            </div>
                        )}
                        {tooltip.data.segment.type === 'occupied' && (
                            <div className="text-zinc-300 dark:text-zinc-600">
                                Ocupada
                            </div>
                        )}
                        {tooltip.data.segment.type === 'available' && (
                            <div className="text-zinc-300 dark:text-zinc-600">
                                Disponible
                            </div>
                        )}
                    </div>
                </div>,
                portalContainer
            )}

            {/* Management Modal */}
            {managementModal && (
                <ManageAbsencesModal
                    isOpen={managementModal.isOpen}
                    onClose={() => setManagementModal(null)}
                    userId={managementModal.userId}
                    userName={managementModal.userName}
                    roomName={managementModal.roomName}
                    bedNumber={managementModal.bedNumber}
                    onUpdate={loadAbsences}
                />
            )}
        </div>
    );
};
