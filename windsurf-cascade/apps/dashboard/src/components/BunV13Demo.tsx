/**
 * Bun v1.3 CSS Features Demo Component
 * Demonstrates view-transition pseudo-elements with class selectors
 * and @layer blocks with color-scheme support
 */

import React, { useRef, useState, useEffect } from 'react';
import { useViewTransition, useThemeTransition, usePageTransition } from '../hooks/useViewTransition';
import type { TransitionType } from '../utils/view-transitions';
import './bun-v13-features.css';

const BunV13Demo: React.FC = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedTransition, setSelectedTransition] = useState<TransitionType>('fade-in');
    const [isAnimating, setIsAnimating] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const {
        transition,
        navigate,
        toggleTheme,
        addTransitionClasses,
        removeTransitionClasses,
        lastMetrics,
        getAverageDuration
    } = useViewTransition({
        type: selectedTransition,
        enablePerformanceMonitoring: true
    });

    const { theme, toggle: toggleThemeHook, isTransitioning: themeTransitioning } = useThemeTransition();
    const { changePage, isTransitioning: pageTransitioning } = usePageTransition(selectedTransition);

    const pages = [
        {
            title: 'View Transitions',
            content: 'Experience smooth page transitions with Bun v1.3 enhanced CSS support.',
            className: 'page-transition slide-transition'
        },
        {
            title: 'Card Animations',
            content: 'Interactive card transitions with 3D flip effects.',
            className: 'card-transition'
        },
        {
            title: 'Theme Switching',
            content: 'Seamless dark/light mode transitions with color scheme support.',
            className: 'fade-transition'
        }
    ];

    const transitionTypes: TransitionType[] = [
        'fade-in',
        'slide-out',
        'card',
        'hero',
        'nav-item'
    ];

    const handlePageChange = async (pageIndex: number) => {
        if (isAnimating || pageTransitioning) return;

        setIsAnimating(true);

        await transition(async () => {
            setCurrentPage(pageIndex);
        }, { type: selectedTransition });

        setIsAnimating(false);
    };

    const handleCardFlip = async () => {
        if (!cardRef.current || isAnimating) return;

        addTransitionClasses(cardRef.current, 'card');

        await transition(async () => {
            // Simulate card content change
            await new Promise(resolve => setTimeout(resolve, 200));
        }, { type: 'card' });

        setTimeout(() => {
            removeTransitionClasses(cardRef.current, 'card');
        }, 400);
    };

    const handleThemeToggle = async () => {
        await toggleTheme();
        toggleThemeHook();
    };

    const handleNavigationDemo = async (path: string) => {
        await navigate(path, 'nav-item');
    };

    useEffect(() => {
        // Add initial transition classes
        if (contentRef.current) {
            addTransitionClasses(contentRef.current, selectedTransition);
        }

        return () => {
            if (contentRef.current) {
                removeTransitionClasses(contentRef.current, selectedTransition);
            }
        };
    }, [selectedTransition, addTransitionClasses, removeTransitionClasses]);

    return (
        <div className="panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
                🚀 Bun v1.3 CSS Features Demo
            </h2>

            {/* Performance Metrics */}
            {lastMetrics && (
                <div className="metric-card" style={{ marginBottom: '1rem' }}>
                    <h4>Performance Metrics</h4>
                    <p>Last Transition: {lastMetrics.duration.toFixed(2)}ms</p>
                    <p>Type: {lastMetrics.type}</p>
                    <p>Average: {getAverageDuration?.(selectedTransition)?.toFixed(2)}ms</p>
                </div>
            )}

            {/* Transition Type Selector */}
            <div className="metric-card" style={{ marginBottom: '1rem' }}>
                <h4>Transition Type</h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {transitionTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedTransition(type)}
                            className={`app-nav button ${selectedTransition === type ? 'active' : ''}`}
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.25rem',
                                background: selectedTransition === type ? 'var(--primary-color)' : 'var(--surface-color)',
                                color: selectedTransition === type ? 'white' : 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            {type.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Page Content with Transitions */}
            <div
                ref={contentRef}
                className={pages[currentPage].className}
                style={{
                    marginBottom: '2rem',
                    padding: '2rem',
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    minHeight: '200px'
                }}
            >
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    {pages[currentPage].title}
                </h3>
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    {pages[currentPage].content}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {pages.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => handlePageChange(index)}
                            disabled={isAnimating || pageTransitioning}
                            className={`nav-transition ${currentPage === index ? 'active' : ''}`}
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.25rem',
                                background: currentPage === index ? 'var(--primary-color)' : 'var(--surface-color)',
                                color: currentPage === index ? 'white' : 'var(--text-primary)',
                                cursor: currentPage === index ? 'default' : 'pointer',
                                opacity: (isAnimating || pageTransitioning) ? 0.6 : 1
                            }}
                        >
                            Page {index + 1}
                        </button>
                    ))}
                </div>
            </div>

            {/* Interactive Card Demo */}
            <div
                ref={cardRef}
                className="card-transition"
                style={{
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                }}
                onClick={handleCardFlip}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    🎴 Interactive Card
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Click to trigger card flip transition using ::view-transition-group(.card)
                </p>
            </div>

            {/* Theme Toggle */}
            <div className="metric-card" style={{ marginBottom: '1rem' }}>
                <h4>Theme Transition</h4>
                <button
                    onClick={handleThemeToggle}
                    disabled={themeTransitioning}
                    className="fade-transition"
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.25rem',
                        background: 'var(--primary-color)',
                        color: 'white',
                        cursor: themeTransitioning ? 'not-allowed' : 'pointer',
                        opacity: themeTransitioning ? 0.6 : 1
                    }}
                >
                    {themeTransitioning ? 'Transitioning...' : `Toggle to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                </button>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Current theme: {theme} | Uses @layer and color-scheme support
                </p>
            </div>

            {/* Navigation Demo */}
            <div className="metric-card">
                <h4>Navigation Transitions</h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['/dashboard', '/analytics', '/settings'].map(path => (
                        <button
                            key={path}
                            onClick={() => handleNavigationDemo(path)}
                            className="nav-transition"
                            style={{
                                padding: '0.5rem 1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.25rem',
                                background: 'var(--surface-color)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer'
                            }}
                        >
                            {path.replace('/', '')}
                        </button>
                    ))}
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Uses ::view-transition-old(.nav-item) and ::view-transition-new(.nav-item)
                </p>
            </div>

            {/* Status Indicators */}
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className={`status-indicator ${isAnimating || pageTransitioning ? 'disconnected' : 'connected'}`}>
                    Page Transition: {isAnimating || pageTransitioning ? 'Active' : 'Idle'}
                </div>
                <div className={`status-indicator ${themeTransitioning ? 'disconnected' : 'connected'}`}>
                    Theme: {theme}
                </div>
                <div className="status-indicator connected">
                    CSS Features: Bun v1.3
                </div>
            </div>
        </div>
    );
};

export default BunV13Demo;
