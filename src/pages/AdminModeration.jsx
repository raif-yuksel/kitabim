// src/pages/AdminModeration.jsx
import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Container,
  Button,
  Row,
  Col,
  Spinner,
  Badge,
  Modal
} from 'react-bootstrap';
import '../styles/AdminModeration.css'; // Aşağıda örneği var

export default function AdminModeration() {
  const [posts, setPosts] = useState(null);
  const [feedback, setFeedback] = useState({}); // { [postId]: 'approved'|'rejected' }
  const [showModal, setShowModal] = useState(false);
  const [modalPost, setModalPost] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(
      q,
      snap => {
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      error => {
        console.error('AdminModeration snapshot error:', error);
        setPosts([]); // hata durumunda boş liste
      }
    );
    return () => unsubscribe();
  }, []);

  async function approve(id) {
    try {
      await updateDoc(doc(db, 'posts', id), { status: 'approved' });
      setFeedback(fb => ({ ...fb, [id]: 'approved' }));
    } catch (e) {
      console.error('Approve error:', e);
    }
  }

  async function reject(id) {
    try {
      await updateDoc(doc(db, 'posts', id), { status: 'rejected' });
      setFeedback(fb => ({ ...fb, [id]: 'rejected' }));
    } catch (e) {
      console.error('Reject error:', e);
    }
  }

  // Modal açma: post objesini modalPost’a set et ve göster
  const handleShowModal = (post) => {
    setModalPost(post);
    setShowModal(true);
  };
  const handleCloseModal = () => {
    setShowModal(false);
    setModalPost(null);
  };

  if (posts === null) {
    // Yükleniyor
    return (
      <Container className="adminmod-loading">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="adminmod-container py-4">
      <h2 className="adminmod-title mb-4">Gönderi Onayı</h2>
      <Row className="g-4">
        {posts.length === 0 && (
          <Col>
            <p className="adminmod-empty">Tüm bekleyen gönderiler incelendi.</p>
          </Col>
        )}
        {posts.map(p => {
          const date = p.createdAt?.toDate
            ? p.createdAt.toDate().toLocaleDateString('tr-TR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })
            : '';
          const fb = feedback[p.id];

          // Kısaltılmış içerik önizleme (150 karakter)
          const previewText = p.content
            ? p.content.length > 150
              ? p.content.slice(0, 150) + '…'
              : p.content
            : '';

          return (
            <Col key={p.id} md={6}>
              <div className="admin-card shadow-sm">
                <div className="admin-card-body">
                  <div className="admin-card-header d-flex align-items-center">
                    <h5 className="admin-card-title mb-0 flex-grow-1">{p.title}</h5>
                    {fb === 'approved' && (
                      <Badge bg="success" className="admin-badge ms-2">Onaylandı</Badge>
                    )}
                    {fb === 'rejected' && (
                      <Badge bg="danger" className="admin-badge ms-2">Reddedildi</Badge>
                    )}
                  </div>
                  <div className="admin-card-subtitle text-muted mb-2">
                    {date} • {p.authorId.slice(0, 6)}
                  </div>
                  {p.imageUrl && (
                    <div className="admin-card-img-wrapper mb-2">
                      <img
                        src={p.imageUrl}
                        alt="Kapak"
                        className="admin-card-img"
                      />
                    </div>
                  )}
                  <div className="admin-card-text mb-3">
                    {previewText}
                  </div>
                  <div className="admin-card-actions">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleShowModal(p)}
                      className="me-2 admin-btn-detail"
                    >
                      Detayı Gör
                    </Button>
                    {!fb && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => approve(p.id)}
                          className="me-2 admin-btn-approve animated-btn"
                        >
                          Onayla
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => reject(p.id)}
                          className="admin-btn-reject animated-btn"
                        >
                          Reddet
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Modal: detaylı içerik okuma */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        size="lg"
        centered
        className="adminmod-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Gönderi Detayı</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalPost ? (
            <div className="adminmod-modal-content">
              <h4 className="modal-post-title">{modalPost.title}</h4>
              <div className="modal-post-meta text-muted mb-2">
                {modalPost.createdAt?.toDate
                  ? modalPost.createdAt.toDate().toLocaleString('tr-TR')
                  : ''} • {modalPost.authorId.slice(0, 6)}
              </div>
              {modalPost.imageUrl && (
                <div className="modal-post-img-wrapper mb-3">
                  <img
                    src={modalPost.imageUrl}
                    alt="Kapak"
                    className="modal-post-img"
                  />
                </div>
              )}
              <div className="modal-post-fulltext">
                {/* Markdown render etmek isterseniz burada ek kütüphane kullanabilirsiniz.
                    Basit metin gösterimi için <pre> veya <div> içinde. */}
                <pre className="modal-post-content">
                  {modalPost.content}
                </pre>
              </div>
              {modalPost.tags && modalPost.tags.length > 0 && (
                <div className="modal-post-tags mt-3">
                  {modalPost.tags.map(tag => (
                    <Badge bg="info" key={tag} className="me-1 text-capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Spinner animation="border" />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" className='animated-btn' onClick={handleCloseModal}>
            Kapat
          </Button>
          {/* Modal içinden onay/reddetme isterseniz ekleyebilirsiniz: */}
          {modalPost && !feedback[modalPost.id] && (
            <>
              <Button
                variant="success"
                onClick={() => {
                  approve(modalPost.id);
                  handleCloseModal();
                }}
                className="me-2 animated-btn"
              >
                Onayla
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  reject(modalPost.id);
                  handleCloseModal();
                }}
                className='animated-btn'
              >
                Reddet
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
