import { useState, useEffect, use } from 'react';
import logo from '../assets/minewatch.png';

export default function Title({ theme, isVisible }) {
    return (
        <div
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 2s ease-out',
                pointerEvents: isVisible ? 'auto' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <img
                src={logo}
                alt="MineWatch"
                style={{
                    width: '120%',
                    maxWidth: 1400,
                    height: 'auto',
                    display: 'block'
                }}
            />
        </div>
    );
}