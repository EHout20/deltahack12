import { useState, useEffect, use} from 'react';

export default function Title({ theme }) {

    
    return (
        <h1 style={{
            fontSize: '32px',
            color: theme === 'light' ? '#333' : '#fff',
            margin: '0',
            fontFamily: 'Arial, sans-serif',
            transition: 'opacity 0.3s ease-out',
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
        }}>
        MineWatch
        </h1>
    );
    }