import { useState, useEffect, use} from 'react';

export default function Title({ theme, isVisible }) {
    
    return (
        <h1 style={{
            fontSize: '128px',
            color: theme === 'light' ? '#333' : '#fff',
            margin: '0',
            fontFamily: 'Arial, sans-serif',
            transition: 'opacity 1s ease-out',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'auto' : 'none'
        }}>
        MineWatch
        </h1>
    );
    }