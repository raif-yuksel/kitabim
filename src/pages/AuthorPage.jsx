import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import {
  doc, getDoc, collection, query, where, getDocs, updateDoc,
  arrayUnion, arrayRemove, orderBy, addDoc
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import BookCard from '../components/BookCard';
import {
  Spinner,
  Alert,
  Image,
  Button
} from 'react-bootstrap';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import '../styles/AuthorPage.css';

// Bildirim gönderme fonksiyonu
async function sendNotification(targetUserId, notifData) {
  if (!targetUserId) return;
  await addDoc(collection(db, "users", targetUserId, "notifications"), {
    ...notifData,
    createdAt: new Date(),
    read: false
  });
}

export default function AuthorPage() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const [author, setAuthor] = useState(null);
  const [stats, setStats] = useState({ posts: 0, likes: 0, comments: 0 });
  const [loadingAuthor, setLoadingAuthor] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);

  const [postsList, setPostsList] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [authorFollowing, setAuthorFollowing] = useState([]);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // Rozetler
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    async function fetchAuthor() {
      setLoadingAuthor(true);
      setError('');
      try {
        const udocRef = doc(db, 'users', uid);
        const udocSnap = await getDoc(udocRef);
        if (!udocSnap.exists()) {
          setError('Yazar bulunamadı');
          setLoadingAuthor(false);
          return;
        }
        const d = udocSnap.data();

        let avatarUrl = '';
        if (d.avatarUrl) {
          avatarUrl = d.avatarUrl;
        } else if (d.avatarPath) {
          try {
            const storageReference = storageRef(storage, d.avatarPath);
            avatarUrl = await getDownloadURL(storageReference);
          } catch {
            avatarUrl = '';
          }
        }
        setAuthor({
          displayName: d.displayName || d.email.split('@')[0],
          bio: d.bio || '',
          avatarUrl
        });

        // Rozetler
        setBadges(Array.isArray(d.badges) ? d.badges : []);

        // İstatistikler
        const statsQuery = query(
          collection(db, 'posts'),
          where('authorId', '==', uid),
          where('status', '==', 'approved')
        );
        const snap = await getDocs(statsQuery);
        let totalLikes = 0, totalComments = 0;
        snap.docs.forEach(docSnap => {
          const pd = docSnap.data();
          totalLikes += (pd.likes?.length || 0);
          totalComments += (pd.commentsCount || 0);
        });
        setStats({
          posts: snap.size,
          likes: totalLikes,
          comments: totalComments
        });

        // Takip ettikleri
        if (Array.isArray(d.following) && d.following.length > 0) {
          setLoadingFollowing(true);
          const followUIDs = d.following;
          const followsData = await Promise.all(
            followUIDs.map(async followUid => {
              try {
                const snapUser = await getDoc(doc(db, 'users', followUid));
                if (snapUser.exists()) {
                  const ud = snapUser.data();
                  let fAvatarUrl = '';
                  if (ud.avatarUrl) {
                    fAvatarUrl = ud.avatarUrl;
                  } else if (ud.avatarPath) {
                    try {
                      fAvatarUrl = await getDownloadURL(storageRef(storage, ud.avatarPath));
                    } catch {
                      fAvatarUrl = '';
                    }
                  }
                  return {
                    uid: followUid,
                    displayName: ud.displayName || ud.email.split('@')[0],
                    avatarUrl: fAvatarUrl
                  };
                }
              } catch (e) {}
              return null;
            })
          );
          setAuthorFollowing(followsData.filter(x => x));
          setLoadingFollowing(false);
        } else {
          setAuthorFollowing([]);
        }
      } catch (e) {
        setError('Yükleme sırasında hata oluştu');
      } finally {
        setLoadingAuthor(false);
      }
    }
    fetchAuthor();
  }, [uid]);

  useEffect(() => {
    if (currentUser && userData) {
      const followingArr = userData.following || [];
      setIsFollowing(followingArr.includes(uid));
    } else {
      setIsFollowing(false);
    }
  }, [currentUser, userData, uid]);

  useEffect(() => {
    async function fetchPosts() {
      setLoadingPosts(true);
      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('authorId', '==', uid),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(postsQuery);
        const list = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }));
        setPostsList(list);
      } catch (e) {
      } finally {
        setLoadingPosts(false);
      }
    }
    fetchPosts();
  }, [uid]);

  // Takip Et/Bırak + Bildirim
  async function handleFollowToggle() {
    if (!currentUser) {
      alert('Önce giriş yapmalısınız.');
      return;
    }
    if (currentUser.uid === uid) {
      return;
    }
    const uref = doc(db, 'users', currentUser.uid);
    try {
      if (isFollowing) {
        await updateDoc(uref, { following: arrayRemove(uid) });
      } else {
        await updateDoc(uref, { following: arrayUnion(uid) });
        await sendNotification(uid, {
          message: `${currentUser.displayName || currentUser.email} seni takip etti!`,
          followerId: currentUser.uid,
          type: "follow"
        });
      }
      setIsFollowing(prev => !prev);
    } catch (e) {
      alert('İşlem başarısız oldu.');
    }
  }

  if (loadingAuthor) {
    return (
      <div className="authorpage-loading">
        <Spinner animation="border" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="authorpage-container">
        <Alert variant="danger">{error}</Alert>
      </div>
    );
  }

  const defaultAvatar = process.env.PUBLIC_URL + '/default-avatar.png';

  return (
    <div className="authorpage-container">
      {/* Yazar Bilgisi */}
      <div className="author-header">
        <div className="author-avatar-wrapper">
          {author.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              roundedCircle
              className="author-avatar"
              alt={author.displayName}
            />
          ) : (
            <div className="author-avatar-placeholder">
              <FaUser className="author-avatar-icon" />
            </div>
          )}
        </div>
        <h2 className="author-name">{author.displayName}</h2>
        {author.bio && <p className="author-bio">{author.bio}</p>}
        {currentUser && currentUser.uid !== uid && (
          <Button
            className="author-follow-btn animated-btn"
            variant={isFollowing ? 'outline-danger' : 'primary'}
            onClick={handleFollowToggle}
          >
            {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
          </Button>
        )}
      </div>

      {/* İstatistikler */}
      <div className="author-stats">
        <div className="stat-item">
          <div className="stat-value">{stats.posts}</div>
          <div className="stat-label">Yazı</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.likes}</div>
          <div className="stat-label">Beğeni</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.comments}</div>
          <div className="stat-label">Yorum</div>
        </div>
      </div>

      {/* Rozetler */}
      <div className="author-section">
        <h3 className="section-title">Kazanılan Rozetler</h3>
        {badges.length === 0 ? (
          <p className="section-empty">
            {currentUser && currentUser.uid === uid
              ? 'Henüz hiç rozet kazanmadınız.'
              : 'Bu yazar henüz rozet kazanmamış.'}
          </p>
        ) : (
          <div className="badges-list">
            {badges.map((badge, idx) => (
              <div className="badge-card badge-anim" key={badge.id || idx}>
                <div className="badge-icon-pop">
                  {author.avatarUrl ? (
                    <Image
                      src={author.avatarUrl}
                      roundedCircle
                      className="author-avatar"
                      alt={author.displayName}
                    />
                  ) : (
                    <div className="author-avatar-placeholder">
                      <FaUser className="author-avatar-icon" />
                    </div>
                  )}
                  {/* Animasyonlu parıltı efekti */}
                  <div className="badge-glow"></div>
                </div>
                <div>
                  <div className="badge-title">{badge.title}</div>
                  <div className="badge-desc-popup">
                    <span className="badge-desc-text">{badge.description}</span>
                    {badge.date && (
                      <span className="badge-date">
                        {new Date(badge.date).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Onaylı Paylaşımlar */}
      <div className="author-section">
        <h3 className="section-title">Onaylı Paylaşımları</h3>
        {loadingPosts ? (
          <div className="section-loading">
            <Spinner animation="border" />
          </div>
        ) : postsList.length === 0 ? (
          <p className="section-empty">Henüz onaylı paylaşımı yok.</p>
        ) : (
          <div className="posts-grid">
            {postsList.map(p => {
              const likesCount = p.likes?.length || 0;
              const isLiked = currentUser ? (p.likes?.includes(currentUser.uid) ?? false) : false;
              const isBookmarked = currentUser
                ? (userData?.bookmarks?.includes(p.id) ?? false)
                : false;
              const commentsCount = p.commentsCount || 0;
              return (
                <BookCard
                  key={p.id}
                  imageSrc={p.imageUrl}
                  title={p.title}
                  author={author.displayName}
                  excerpt={p.content}
                  publishedDate={p.createdAt?.toDate?.() || null}
                  likesCount={likesCount}
                  isLiked={isLiked}
                  onToggleLike={() => {}}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={() => {}}
                  commentsCount={commentsCount}
                  onClickComments={() => navigate(`/post/${p.id}#comments`)}
                  onShare={() => {
                    const shareUrl = window.location.origin + `/post/${p.id}`;
                    if (navigator.share) {
                      navigator.share({
                        title: p.title,
                        text: p.content?.slice(0,100) + '…',
                        url: shareUrl
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(shareUrl).then(() => {
                        alert('Bağlantı panoya kopyalandı');
                      });
                    }
                  }}
                  onClick={() => navigate(`/post/${p.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Yazarın Takip Ettikleri */}
      <div className="author-section">
        <h3 className="section-title">Takip Ettikleri</h3>
        {loadingFollowing ? (
          <div className="section-loading">
            <Spinner animation="border" />
          </div>
        ) : authorFollowing.length === 0 ? (
          <p className="section-empty">
            {currentUser && currentUser.uid === uid
              ? 'Henüz kimseyi takip etmiyorsunuz.'
              : 'Bu yazar henüz kimseyi takip etmiyor.'}
          </p>
        ) : (
          <div className="following-list">
            {authorFollowing.map(u => (
              <div key={u.uid} className="following-item">
                <Link to={`/author/${u.uid}`} className="following-link">
                  {u.avatarUrl ? (
                    <Image
                      src={u.avatarUrl}
                      roundedCircle
                      className="following-avatar"
                      alt={u.displayName}
                    />
                  ) : (
                    <div className="following-avatar-placeholder">
                      <FaUser />
                    </div>
                  )}
                  <span className="following-name">{u.displayName}</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
