// src/components/TTSButton.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Button, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';

/**
 * TTSButton:
 *   - text: okunacak metin (string). Eğer uzun Markdown içerik ise, düz metin haline çevrilmiş versiyonunu gönderin.
 *   - lang: dil kodu, örn 'tr-TR'
 *   - disabled: opsiyonel, butonu devre dışı bırakmak için
 */
export default function TTSButton({ text, lang = 'tr-TR', disabled = false }) {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    // Cleanup: komponent unmount olduğunda konuşmayı iptal et
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggle = () => {
    if (!window.speechSynthesis) {
      console.warn('Tarayıcı speechSynthesis desteği yok.');
      return;
    }
    if (speaking) {
      // Durdur
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else {
      // Konuşmayı başlat
      // Eğer hali hazırda konuşma devam ediyorsa iptal et
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      // Yeni utterance oluştur
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      // Opsiyonel: ses seçimi / voice ayarı yapılabilir
      // Örneğin: 
      // const voices = window.speechSynthesis.getVoices().filter(v => v.lang.includes('tr'));
      // if (voices.length) utterance.voice = voices[0];
      utterance.rate = 0.2;   // 0.1 - 10 arası, normal 1
      utterance.pitch = 1;  // 0 - 2 arası
      utterance.onstart = () => {
        setSpeaking(true);
      };
      utterance.onend = () => {
        setSpeaking(false);
      };
      utterance.onerror = (e) => {
        console.error('TTS hata:', e);
        setSpeaking(false);
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Butonun title (tooltip) metni:
  const tooltipText = disabled
    ? 'TTS desteklenmiyor veya metin boş'
    : speaking
    ? 'Durdur'
    : 'Oku';

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip>{tooltipText}</Tooltip>}
    >
      <span className="d-inline-block">
        <Button className='animated-btn'
          variant={speaking ? 'danger' : 'outline-primary'}
          size="sm"
          onClick={handleToggle}
          disabled={disabled || !text || text.trim() === ''}
          style={{ pointerEvents: disabled ? 'none' : 'auto' }}
        >
          {speaking ? (
            <>
              {/* Dönen spinner yanında durdur ikonu */}
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" />
              Durdur
            </>
          ) : (
            'Oku'
          )}
        </Button>
      </span>
    </OverlayTrigger>
  );
}
