import React, { useState } from 'react';
import './FlipBook.css';

function FlipBook({ pages, readingMode = 'light', fontSize = 'medium' }) {
  const [current, setCurrent] = useState(0);
  const total = pages.length;

  const readingBg = readingMode === 'dark' ? '#222' : '#fff';
  const readingColor = readingMode === 'dark' ? '#f1f3f8' : '#232323';
  const fontSizePx =
    fontSize === 'small' ? '15px' :
    fontSize === 'large' ? '22px' : '18px';

  // İlerleme yüzdesi
  const progress = total
    ? Math.min(100, Math.round(((current) / total) * 100))
    : 0;

  const handleClick = (idx) => {
    if (idx >= current) {
      if (current < total) setCurrent(current + 1);
    } else {
      setCurrent(idx);
    }
  };

  return (
    <>
      {/* OKUMA İLERLEMESİ */}
      <div style={{
        width: '100%',
        height: 13,
        background: '#e0e0e0',
        borderRadius: 4,
        marginBottom: 12,
        marginTop: 32,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: '#3498db',
          transition: 'width 0.3s'
        }} />
        <span style={{
          position: 'absolute',
          right: 12,
          top: -2,
          fontSize: 12,
          color: readingMode === 'dark' ? '#f1f3f8' : '#232323'
        }}>
          {progress}%
        </span>
      </div>
        <div
      className="flipbook-container"
      style={{
        color: readingColor,
        transition: 'background 0.3s, color 0.3s'
      }}
    >
      
      {/* FLIPBOOK SAYFALARI */}
      {pages.map((pg, idx) => (
        <div
          key={idx}
          className={`flip-page ${idx < current ? 'flipped' : ''}`}
          style={{
            zIndex: total - idx,
            color: readingColor,
            fontSize: fontSizePx,
            transition: 'background 0.3s, color 0.3s, font-size 0.2s'
          }}
          onClick={() => handleClick(idx)}
        >
          <div className={`front${pg.isCoverFront ? ' cover' : ''}`}
               style={{
                 color: readingColor,
                 fontSize: fontSizePx
               }}>
            {pg.front}
          </div>
          <div className={`back${pg.isCoverBack ? ' cover' : ''}`}
               style={{
                 color: readingColor,
                 fontSize: fontSizePx
               }}>
            {pg.back}
          </div>
        </div>
      ))}
    </div>
    </>
    
  );
}

export default FlipBook;
