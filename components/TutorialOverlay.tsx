import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface TutorialStep {
    id: string;
    title: string;
    description: string;
    targetSelector?: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const tutorialSteps: TutorialStep[] = [
    {
        id: 'dashboard',
        title: 'Panel de Flota',
        description: 'Bienvenido a JaraCar. Aquí podrás gestionar toda la flota de vehículos de manera sencilla.',
        position: 'center'
    },
    {
        id: 'views',
        title: 'Vistas Flexibles',
        description: 'Alterna entre vista de Cuadrícula, Lista o Cronograma según lo que necesites visualizar.',
        targetSelector: '[data-tutorial="view-switcher"]',
        position: 'bottom'
    },
    {
        id: 'car-card',
        title: 'Tarjetas de Coches',
        description: 'En la vista de cuadrícula, haz clic en cualquier coche para ver sus detalles, historial y hacer una reserva.',
        targetSelector: '[data-tutorial="car-card"]',
        position: 'bottom'
    },
    {
        id: 'favorites',
        title: 'Marca Favoritos',
        description: 'Usa la estrella para marcar los coches que más usas. Aparecerán siempre al principio.',
        targetSelector: '[data-tutorial="favorite-star"]',
        position: 'bottom'
    },
    {
        id: 'profile',
        title: 'Tu Perfil',
        description: 'Accede a tu perfil para editar tus datos o cambiar tus preferencias.',
        targetSelector: '[data-tutorial="user-avatar"]',
        position: 'bottom'
    },
    {
        id: 'complete',
        title: '¡Todo listo!',
        description: 'Si necesitas volver a ver este tutorial, puedes encontrarlo en tu perfil de usuario.',
        position: 'center'
    }
];

interface TutorialOverlayProps {
    onComplete: () => void;
    onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete, onSkip }) => {
    useBodyScrollLock(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const step = tutorialSteps[currentStep];
    const isLastStep = currentStep === tutorialSteps.length - 1;

    useEffect(() => {
        if (step.targetSelector) {
            const element = document.querySelector(step.targetSelector);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
            }
        } else {
            setTargetRect(null);
        }
    }, [currentStep, step.targetSelector]);

    const handleNext = () => {
        if (isLastStep) {
            onComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const getTooltipPosition = () => {
        if (!targetRect || step.position === 'center') {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        }

        const padding = 20;
        let style: React.CSSProperties = {};

        switch (step.position) {
            case 'bottom':
                style = {
                    top: targetRect.bottom + padding,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translateX(-50%)'
                };
                break;
            case 'top':
                style = {
                    bottom: window.innerHeight - targetRect.top + padding,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translateX(-50%)'
                };
                break;
            case 'left':
                style = {
                    top: targetRect.top + targetRect.height / 2,
                    right: window.innerWidth - targetRect.left + padding,
                    transform: 'translateY(-50%)'
                };
                break;
            case 'right':
                style = {
                    top: targetRect.top + targetRect.height / 2,
                    left: targetRect.right + padding,
                    transform: 'translateY(-50%)'
                };
                break;
        }

        return style;
    };

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none">
            {/* Dark overlay with spotlight */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 pointer-events-auto"
                style={{
                    clipPath: targetRect
                        ? `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${targetRect.left - 8}px ${targetRect.top - 8}px, ${targetRect.left - 8}px ${targetRect.bottom + 8}px, ${targetRect.right + 8}px ${targetRect.bottom + 8}px, ${targetRect.right + 8}px ${targetRect.top - 8}px, ${targetRect.left - 8}px ${targetRect.top - 8}px)`
                        : undefined
                }}
            />

            {/* Tooltip */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="absolute w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 pointer-events-auto"
                    style={getTooltipPosition()}
                >
                    {/* Close button */}
                    <button
                        onClick={onSkip}
                        className="absolute top-3 right-3 p-1.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                        <X size={16} />
                    </button>

                    {/* Content */}
                    <div className="pr-8">
                        <h3 className="text-lg font-semibold text-zinc-900 mb-2">{step.title}</h3>
                        <p className="text-sm text-zinc-600 leading-relaxed mb-4">{step.description}</p>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-1 mb-4">
                        {tutorialSteps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-1 flex-1 rounded-full transition-colors ${index <= currentStep ? 'bg-zinc-900' : 'bg-zinc-200'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={onSkip}
                            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                            Saltar tutorial
                        </button>
                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600 hover:text-zinc-900 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className="px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                                {isLastStep ? (
                                    <>
                                        Finalizar
                                        <Check size={16} />
                                    </>
                                ) : (
                                    <>
                                        Siguiente
                                        <ChevronRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
