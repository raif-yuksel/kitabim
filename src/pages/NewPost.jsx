// src/pages/NewPost.jsx
import React, { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Container, Form, Button, Alert, ProgressBar, Card, Row, Col, Modal } from 'react-bootstrap';
import { db, storage } from '../firebase';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import FlipBook from '../components/FlipBook';
import '../components/FlipBook.css';
import '../styles/NewPost.css';

const DEFAULT_IMAGE_URL = process.env.PUBLIC_URL + '/default-cover.png';
const DEFAULT_CHAR_LIMIT = 1000; // Sayfa başına otomatik bölme eşiği

/**
 * İçeriği manuel marker veya otomatik char eşiğine göre bölen yardımcı fonksiyon.
 * Manual marker: "<!-- pagebreak -->"
 */
function splitContentIntoPages(text = '', charsPerPage = DEFAULT_CHAR_LIMIT) {
  const MANUAL_BREAK = '<!-- pagebreak -->';
  // Önce manuel parçala:
  let segments = text.split(MANUAL_BREAK).map(seg => seg.trim());
  const pages = [];

  segments.forEach(segment => {
    if (segment.length <= charsPerPage) {
      pages.push(segment);
    } else {
      // uzun segmenti otomatik böl
      let start = 0;
      const len = segment.length;
      while (start < len) {
        if (start + charsPerPage >= len) {
          pages.push(segment.slice(start).trim());
          break;
        }
        let slice = segment.slice(start, start + charsPerPage);
        const lastSpace = slice.lastIndexOf(' ');
        if (lastSpace > 0) {
          const part = segment.slice(start, start + lastSpace).trim();
          pages.push(part);
          start += lastSpace + 1;
        } else {
          const part = slice.trim();
          pages.push(part);
          start += charsPerPage;
        }
      }
    }
  });

  return pages;
}

export default function NewPost() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Başlık, tür, etiketler
  const [title, setTitle] = useState('');
  const [type, setType] = useState('kitap');
  const [tags, setTags] = useState('');

  // Çok sayfa yönetimi:
  const [pages, setPages] = useState(['']); // başlangıçta 1 boş sayfa
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [charLimit, setCharLimit] = useState(DEFAULT_CHAR_LIMIT);

  // Resim upload
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Önizleme modal state
  const [showPreview, setShowPreview] = useState(false);

  // Mevcut sayfa içeriği
  const currentContent = pages[currentPageIndex] || '';
  const charCount = currentContent.length;
  const overLimit = charCount > charLimit;

  // Sayfa içeriği değiştiğinde güncelle
  const handlePageChange = (value) => {
    const newPages = [...pages];
    newPages[currentPageIndex] = value || '';
    setPages(newPages);
  };

  // Sayfa navigasyonu
  const goToPrevPage = () => {
    setCurrentPageIndex(idx => Math.max(0, idx - 1));
  };
  const goToNextPage = () => {
    setCurrentPageIndex(idx => Math.min(pages.length - 1, idx + 1));
  };

  // Yeni sayfa ekle (geçerli sayfadan sonra)
  const handleAddPage = () => {
    const newPages = [...pages];
    newPages.splice(currentPageIndex + 1, 0, '');
    setPages(newPages);
    setCurrentPageIndex(currentPageIndex + 1);
  };

  // Mevcut sayfayı sil (en az 1 sayfa kalacak şekilde)
  const handleRemovePage = () => {
    if (pages.length <= 1) return;
    const newPages = [...pages];
    newPages.splice(currentPageIndex, 1);
    const newIndex = Math.max(0, currentPageIndex - 1);
    setPages(newPages);
    setCurrentPageIndex(newIndex);
  };

  // Resim seçildiğinde
  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  // Form submit: upload image, birleştir, böl, Firestore kaydet
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('Önce giriş yapmalısınız.');
      return;
    }
    if (!title.trim()) {
      setError('Başlık boş olamaz.');
      return;
    }
    // Basit spam filtresi örneği:
    const forbidden = ['spam', 'küfür'];
    // Tüm sayfalarda spam filtresi
    for (let p of pages) {
      if (forbidden.some(w => p.toLowerCase().includes(w))) {
        setError('İçerikte yasaklı kelime var.');
        return;
      }
    }
    // İçerik en az bir karakter mi?
    const totalContent = pages.join('\n\n').trim();
    if (!totalContent) {
      setError('İçerik boş olamaz.');
      return;
    }

    setSaving(true);
    let imageUrl = DEFAULT_IMAGE_URL;
    try {
      // 1) Resim upload (isteğe bağlı)
      if (file) {
        const sfRef = storageRef(storage, `images/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(sfRef, file);
        await new Promise((res, rej) => {
          uploadTask.on(
            'state_changed',
            snapshot => {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setProgress(pct);
            },
            err => rej(err),
            () => res()
          );
        });
        imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }

      // 2) Etiket dizisi oluştur
      const tagArray = tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t);

      // 3) pages array’i otomatik bölme eşiğine göre yeniden böl
      let finalPages = [];
      pages.forEach(p => {
        const splitted = splitContentIntoPages(p, charLimit);
        finalPages.push(...splitted);
      });
      if (finalPages.length === 0) {
        finalPages = [''];
      }

      // 4) Firestore’a ekle
      await addDoc(collection(db, 'posts'), {
        title: title.trim(),
        authorId: currentUser.uid,
        type,
        tags: tagArray,
        pages: finalPages,
        content: finalPages.join('\n\n'), // legacy veya arama amaçlı
        imageUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
        likes: [],
        commentsCount: 0,
        ratings: {}
      });

      // Başarılıysa anasayfaya dön
      navigate('/');
    } catch (e) {
      console.error('Yeni post kaydetme hatası:', e);
      setError('Gönderi oluşturulamadı. Tekrar deneyin.');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  // Preview için FlipBook sayfalarını hazırla
  const previewFlipPages = [];
  for (let i = 0; i < pages.length; i += 2) {
    previewFlipPages.push({
      front: <div style={{ whiteSpace: 'pre-wrap' }}>{pages[i] || ''}</div>,
      back: <div style={{ whiteSpace: 'pre-wrap' }}>{pages[i+1] || ''}</div>,
      isCoverFront: i === 0,
      isCoverBack: i + 1 >= pages.length
    });
  }

  return (
    <Container className="newpost-container py-4">
      <Card className="newpost-card shadow-sm">
        <Card.Body>
          <h2 className="newpost-title mb-4">Yeni Gönderi Oluştur</h2>

          {error && <Alert variant="danger" className="newpost-alert" onClose={() => setError('')} dismissible>{error}</Alert>}

          <Form onSubmit={handleSubmit} className="newpost-form">
            {/* Başlık */}
            <Form.Group className="newpost-form-group mb-3">
              <Form.Label className="newpost-label">Başlık</Form.Label>
              <Form.Control
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Gönderi başlığını girin"
                className="newpost-input"
                disabled={saving}
                required
              />
            </Form.Group>

            {/* Tür */}
            <Form.Group className="newpost-form-group mb-3">
              <Form.Label className="newpost-label">Tür</Form.Label>
              <Form.Select
                value={type}
                onChange={e => setType(e.target.value)}
                className="newpost-select"
                disabled={saving}
              >
                <option value="kitap">Kitap</option>
                <option value="şiir">Şiir</option>
                <option value="fıkra">Fıkra</option>
                <option value="roman">Roman</option>
              </Form.Select>
            </Form.Group>

            {/* Etiketler */}
            <Form.Group className="newpost-form-group mb-3">
              <Form.Label className="newpost-label">Etiketler (virgülle ayrılmış)</Form.Label>
              <Form.Control
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="örn: aşk, doğa, macera"
                className="newpost-input"
                disabled={saving}
              />
            </Form.Group>

            {/* Karakter eşiği (isteğe bağlı) */}
            <Form.Group className="newpost-form-group mb-3">
              <Form.Label className="newpost-label">Sayfa Karakter Eşiği</Form.Label>
              <Form.Control
                type="number"
                min={100}
                step={100}
                value={charLimit}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 100) setCharLimit(v);
                }}
                disabled={saving}
                className="newpost-input"
              />
              <Form.Text className="text-muted">
                Bir sayfadaki maksimum karakter. Aşan kısımlar otomatik alt sayfalara bölünecek.
              </Form.Text>
            </Form.Group>

            {/* Sayfa düzenleme bölümü */}
            <Card className="mb-3">
              <Card.Header>
                <Row className="align-items-center">
                  <Col>
                    <strong>Sayfa {currentPageIndex + 1} / {pages.length}</strong>
                  </Col>
                  <Col className="text-end">
                    <Button variant="outline-primary" className='animated-btn' size="sm" onClick={goToPrevPage} disabled={currentPageIndex === 0 || saving}>
                      ← Önceki
                    </Button>{' '}
                    <Button variant="outline-primary" className='animated-btn' size="sm" onClick={goToNextPage} disabled={currentPageIndex === pages.length - 1 || saving}>
                      Sonraki →
                    </Button>{' '}
                    <Button variant="success" className='animated-btn' size="sm" onClick={handleAddPage} disabled={saving}>
                      + Sayfa Ekle
                    </Button>{' '}
                    <Button variant="danger" className='animated-btn' size="sm" onClick={handleRemovePage} disabled={pages.length <= 1 || saving}>
                      Sayfayı Sil
                    </Button>
                  </Col>
                </Row>
              </Card.Header>
              <Card.Body>
                <Form.Group>
                  <Form.Label className="newpost-label">İçerik (Sayfa {currentPageIndex + 1})</Form.Label>
                  <div className="newpost-mdeditor-wrapper">
                    <MDEditor
                      value={currentContent}
                      onChange={handlePageChange}
                      height={300}
                      textareaProps={{
                        placeholder: `Sayfa ${currentPageIndex + 1} içeriğini Markdown ile yazın...`
                      }}
                      visiableDragbar={false}
                      // Disabling dragbar for simplicity; isteğe bağlı kaldırabilirsiniz
                    />
                  </div>
                  <Form.Text className={overLimit ? 'text-danger' : 'text-muted'}>
                    {charCount} karakter. Eşik: {charLimit}. {overLimit ? 'Bu sayfa eşiği aştı; manuel sayfa ekleyin veya eşiği artırın.' : ''}
                  </Form.Text>
                  <Form.Text className="text-muted d-block">
                    Manuel sayfa kırma için metin içine <code>&lt;!-- pagebreak --&gt;</code> ekleyebilirsiniz.
                  </Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Resim seçimi */}
            <Form.Group className="newpost-form-group mb-3">
              <Form.Label className="newpost-label">Kapak Resmi (isteğe bağlı)</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="newpost-file-input"
                disabled={saving}
              />
              {file && (
                <div className="newpost-preview-wrapper mt-2">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Seçilen kapak"
                    className="newpost-preview-img"
                  />
                </div>
              )}
              {saving && file && (
                <ProgressBar now={progress} label={`${progress}%`} className="newpost-progress mt-2" />
              )}
            </Form.Group>

            {/* Önizleme ve Gönder butonları */}
            <div className="newpost-actions mb-3 d-flex">
              <Button
                variant="outline-secondary"
                className="me-2 w-100"
                onClick={() => setShowPreview(true)}
                disabled={saving}
              >
                Önizleme
              </Button>
              <Button
                type="submit"
                className="newpost-submit-btn w-100"
                disabled={saving}
              >
                {saving ? 'Gönderi Oluşturuluyor…' : 'Paylaş'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Önizleme Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} fullscreen={true}>
        <Modal.Header closeButton>
          <Modal.Title>Önizleme: "{title || 'Başlıksız'}"</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'var(--color-bg-alt)', padding: '1rem' }}>
          {pages.length > 0 ? (
            <FlipBook pages={previewFlipPages} />
          ) : (
            <p>Henüz içerik yok.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>Kapat</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
