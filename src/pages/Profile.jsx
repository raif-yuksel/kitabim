import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Alert,
  Image,
} from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { storage, db } from '../firebase';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { FaUser } from 'react-icons/fa';
import '../styles/Profile.css';

export default function Profile() {
  const { currentUser } = useAuth();
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [bio, setBio]               = useState('');
  const [avatarUrl, setAvatarUrl]   = useState('');    // preview URL
  const [avatarFile, setAvatarFile] = useState(null);  // yeni seçilen dosya

  const [stats, setStats] = useState({
    posts: 0,
    likes: 0,
    comments: 0
  });

  // Profil bilgilerini ve istatistikleri yükle
  useEffect(() => {
    if (!currentUser) return;
    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        const uref = doc(db, 'users', currentUser.uid);
        const udoc = await getDoc(uref);
        if (udoc.exists()) {
          const data = udoc.data();
          setBio(data.bio || '');

          // Avatar: storagePath öncelikli, yoksa avatarUrl field
          if (data.avatarPath) {
            try {
              const url = await getDownloadURL(
                storageRef(storage, data.avatarPath)
              );
              setAvatarUrl(url);
            } catch {
              setAvatarUrl(data.avatarUrl || '');
            }
          } else {
            setAvatarUrl(data.avatarUrl || '');
          }
        }

        // Yazarlık istatistikleri
        const postsQ = query(
          collection(db, 'posts'),
          where('authorId', '==', currentUser.uid),
          where('status', '==', 'approved')
        );
        const snap = await getDocs(postsQ);
        let totalLikes = 0, totalComments = 0;
        snap.docs.forEach(d => {
          const pd = d.data();
          totalLikes += pd.likes?.length || 0;
          totalComments += pd.commentsCount || 0;
        });
        setStats({
          posts: snap.docs.length,
          likes: totalLikes,
          comments: totalComments
        });
      } catch (e) {
        console.error(e);
        setError('Profil yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [currentUser]);

  // Avatar seçince preview göstermek
  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  }

  // Profili kaydet
  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const uref = doc(db, 'users', currentUser.uid);
      let avatarPath = null;

      // Yeni avatar yüklenecekse
      if (avatarFile) {
        avatarPath = `avatars/${currentUser.uid}/${avatarFile.name}`;
        const ref = storageRef(storage, avatarPath);
        const uploadTask = uploadBytesResumable(ref, avatarFile);
        await new Promise((res, rej) =>
          uploadTask.on('state_changed', null, rej, res)
        );
        // hemen preview için download URL al
        const downloadURL = await getDownloadURL(ref);
        setAvatarUrl(downloadURL);
      }

      // Güncellenecek veri objesi
      const updateData = { bio };
      if (avatarPath) {
        updateData.avatarPath = avatarPath;
        updateData.avatarUrl = '';
      }
      await updateDoc(uref, updateData);
      setAvatarFile(null);
      setSuccess('Profil başarıyla güncellendi.');
    } catch (e) {
      console.error(e);
      setError('Kaydetme sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <Container className="profile-container profile-blue-theme">
      <h2 className="profile-title">Profilim</h2>

      {error   && <Alert variant="danger" className="profile-alert">{error}</Alert>}
      {success && <Alert variant="success" className="profile-alert">{success}</Alert>}

      {/* Profil formu */}
      <div className="profile-card">
        <Form onSubmit={handleSave}>
          <Form.Group className="profile-avatar-group">
            <Form.Label className="profile-label">Avatar</Form.Label>
            <div className="profile-avatar-preview">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  roundedCircle
                  className="profile-avatar-img"
                  alt="Avatar"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  <FaUser className="profile-avatar-icon" />
                </div>
              )}
            </div>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="profile-file-input"
            />
          </Form.Group>

          <Form.Group className="profile-bio-group">
            <Form.Label className="profile-label">Biyografi</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="profile-textarea"
            />
          </Form.Group>

          <div className="profile-actions">
            <Button variant="primary" type="submit" className='animated-btn' disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Profili Güncelle'}
            </Button>
          </div>
        </Form>
      </div>

      {/* İstatistikler */}
      <div className="profile-stats-card">
        <h4 className="stats-title">Yazarlık İstatistikleri</h4>
        <Row className="stats-row">
          <Col xs={4} className="stats-col">
            <div className="stats-value">{stats.posts}</div>
            <div className="stats-label">Yazı</div>
          </Col>
          <Col xs={4} className="stats-col">
            <div className="stats-value">{stats.likes}</div>
            <div className="stats-label">Beğeni</div>
          </Col>
          <Col xs={4} className="stats-col">
            <div className="stats-value">{stats.comments}</div>
            <div className="stats-label">Yorum</div>
          </Col>
        </Row>
      </div>
    </Container>
  );
}
