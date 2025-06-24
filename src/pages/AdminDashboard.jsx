// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Form,
  Button
} from 'react-bootstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import '../styles/AdminDashboard.css';

export default function AdminDashboard() {
  // Tarih aralığı state: YYYY-MM-DD string format
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Summary kart verileri
  const [totalPostsCount, setTotalPostsCount] = useState(0);
  const [pendingPostsCount, setPendingPostsCount] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  // Grafik metrikleri
  const [dailyPostsStats, setDailyPostsStats] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [dailyCommentsStats, setDailyCommentsStats] = useState([]);
  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tarih aralığını başlat: ilk render’da son 7 gün
  useEffect(() => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const startDt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const start = startDt.toISOString().slice(0, 10);
    setStartDate(start);
    setEndDate(end);
  }, []);

  // Ana veri çekme fonksiyonu: tarih aralığı değiştikçe tetiklenir
  const fetchStats = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      // Parse tarih aralığını Date objesine dönüştür, inclusive
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // 1) posts koleksiyonunu çek (küçük ölçekli projelerde OK; çok büyükse backend aggregate düşünün)
      const postsSnap = await getDocs(collection(db, 'posts'));
      const posts = postsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.createdAt && typeof p.createdAt.toDate === 'function')
        .map(p => ({
          ...p,
          createdDate: p.createdAt.toDate()
        }));

      // Summary: total posts (tüm zaman)
      setTotalPostsCount(posts.length);

      // Summary: pending posts count
      const pendingSnap = await getDocs(query(collection(db, 'posts'), where('status', '==', 'pending')));
      setPendingPostsCount(pendingSnap.size);

      // Summary: total users count
      let usersCount = 0;
      try {
        // Varsayılan olarak users koleksiyonunu çek
        const usersSnap = await getDocs(collection(db, 'users' && 'admin'));
        usersCount = usersSnap.size;
      } catch (e) {
        console.warn('Users koleksiyonu çekilemedi:', e);
      }
      setTotalUsersCount(usersCount);

      // 2) Seçili aralıktaki postlar
      const postsInRange = posts.filter(p => p.createdDate >= start && p.createdDate <= end);

      // 3) Günlük Paylaşımlar: aralıktaki gün sayısını hesapla
      // Gün sayısı: (endDate - startDate) / 1 gün + 1
      const dayCount = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const byDay = {};
      postsInRange.forEach(p => {
        const key = p.createdDate.toISOString().slice(0, 10);
        byDay[key] = (byDay[key] || 0) + 1;
      });
      const daily = Array.from({ length: dayCount }).map((_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        return { date: key, count: byDay[key] || 0 };
      });
      setDailyPostsStats(daily);

      // 4) Kategori Dağılımı (type alanı): aralıktaki postlar
      const byCat = {};
      postsInRange.forEach(p => {
        const t = p.type || 'unknown';
        byCat[t] = (byCat[t] || 0) + 1;
      });
      setCategoryStats(Object.entries(byCat).map(([type, count]) => ({ type, count })));

      // 5) En Aktif Kullanıcılar: en çok paylaşan yazarlar aralıktaki postlara göre
      const byUser = {};
      postsInRange.forEach(p => {
        const aid = p.authorId || 'unknown';
        byUser[aid] = (byUser[aid] || 0) + 1;
      });
      // Sıralayıp top 5 al
      let userArray = Object.entries(byUser)
        .map(([authorId, count]) => ({ authorId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      // Kullanıcı displayName çekmek için Firestore’dan getDoc
      const userStatsWithName = await Promise.all(
        userArray.map(async item => {
          let name = item.authorId.slice(0, 6);
          try {
            const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', item.authorId)));
            // Firestore JS SDK’da documentId query: burada teknik olarak documentId() kullanmak lazım:
            // but getDocs(query(...)) with documentId is:
            // import { documentId } from 'firebase/firestore';
            // getDocs(query(collection(db,'users'), where(documentId(), '==', item.authorId)));
            // Ancak burada örnek olarak:
            if (!userDoc.empty) {
              const ud = userDoc.docs[0].data();
              name = ud.displayName || name;
            }
          } catch (e) {
            console.warn('User displayName çekilemedi for', item.authorId, e);
          }
          return { name, count: item.count };
        })
      );
      setUserStats(userStatsWithName);

      // 6) Günlük Yorumlar (comments koleksiyonu varsa)
      let commentsStats = [];
      try {
        // comments koleksiyonunu çek
        const commentsSnap = await getDocs(collection(db, 'comments'));
        const comments = commentsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.createdAt && typeof c.createdAt.toDate === 'function')
          .map(c => ({ ...c, createdDate: c.createdAt.toDate() }))
          .filter(c => c.createdDate >= start && c.createdDate <= end);
        // Grup byDayComments
        const byDayComments = {};
        comments.forEach(c => {
          const key = c.createdDate.toISOString().slice(0, 10);
          byDayComments[key] = (byDayComments[key] || 0) + 1;
        });
        commentsStats = Array.from({ length: dayCount }).map((_, i) => {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          return { date: key, count: byDayComments[key] || 0 };
        });
      } catch (e) {
        console.warn('comments koleksiyonu çekilemedi veya yapı uymuyor:', e);
        commentsStats = []; // boş bırak
      }
      setDailyCommentsStats(commentsStats);

    } catch (e) {
      console.error('AdminDashboard fetchStats error:', e);
      setError('İstatistikler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Tarih aralığı değiştiğinde fetch
  useEffect(() => {
    if (startDate && endDate) {
      fetchStats();
    }
  }, [startDate, endDate, fetchStats]);

  // CSV export fonksiyonları
  const exportCsv = (dataArray, headers, filename) => {
    if (!dataArray || dataArray.length === 0) {
      alert('İndirilecek veri bulunamadı.');
      return;
    }
    // CSV oluştur
    const csvRows = [];
    csvRows.push(headers.join(','));
    dataArray.forEach(item => {
      const row = headers.map(h => {
        const key = h;
        // Eğer header farklıysa mapping gerekebilir; burada header aynı dataKey olmalı
        return `"${item[key] != null ? item[key] : ''}"`;
      });
      csvRows.push(row.join(','));
    });
    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDailyPosts = () => {
    // headers: date,count
    exportCsv(dailyPostsStats, ['date', 'count'], 'daily_posts.csv');
  };
  const handleExportCategory = () => {
    exportCsv(categoryStats, ['type', 'count'], 'category_distribution.csv');
  };
  const handleExportUserStats = () => {
    // headers: name,count
    exportCsv(userStats, ['name', 'count'], 'top_users.csv');
  };
  const handleExportComments = () => {
    if (dailyCommentsStats.length === 0) {
      alert('Yorum verisi bulunamadı veya comments koleksiyonu yok.');
      return;
    }
    exportCsv(dailyCommentsStats, ['date', 'count'], 'daily_comments.csv');
  };

  // Render
  if (loading) {
    return (
      <Container className="admin-dashboard-loading">
        <Spinner animation="border" />
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="admin-dashboard-container py-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="admin-dashboard-container py-4">
      <h2 className="dashboard-title mb-4">Admin Dashboard</h2>

      {/* Tarih Aralığı Seçimi */}
      <Row className="mb-4 align-items-end">
        <Col xs={12} md={4}>
          <Form.Group controlId="startDate">
            <Form.Label>Başlangıç Tarihi</Form.Label>
            <Form.Control
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group controlId="endDate">
            <Form.Label>Bitiş Tarihi</Form.Label>
            <Form.Control
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </Form.Group>
        </Col>
        <Col xs={12} md={4} className="text-md-end mt-2 mt-md-0">
          <Button variant="primary" className='animated-btn' onClick={fetchStats}>
            Yenile
          </Button>
        </Col>
      </Row>

      {/* Summary Kartlar */}
      <Row className="summary-cards mb-4">
        <Col xs={12} md={4}>
          <div className="summary-card">
            <div className="summary-card-value">{totalPostsCount}</div>
            <div className="summary-card-label">Toplam Gönderi</div>
          </div>
        </Col>
        <Col xs={12} md={4}>
          <div className="summary-card">
            <div className="summary-card-value">{pendingPostsCount}</div>
            <div className="summary-card-label">Bekleyen Gönderi</div>
          </div>
        </Col>
        <Col xs={12} md={4}>
          <div className="summary-card">
            <div className="summary-card-value">{totalUsersCount}</div>
            <div className="summary-card-label">Toplam Kullanıcı</div>
          </div>
        </Col>
      </Row>

      {/* Grafikleri Göster */}
      <Row className="gy-4">
        {/* Günlük Paylaşımlar */}
        <Col md={6} xs={12}>
          <div className="dashboard-card">
            <div className="dashboard-card-header d-flex justify-content-between align-items-center">
              <h5 className="dashboard-card-title">Günlük Paylaşımlar</h5>
              <Button variant="outline-secondary" className='animated-btn' size="sm" onClick={handleExportDailyPosts}>
                CSV Olarak İndir
              </Button>
            </div>
            <div className="dashboard-chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyPostsStats}>
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Gönderi Sayısı"
                    stroke="var(--color-primary, #f23026)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        {/* Kategori Dağılımı */}
        <Col md={6} xs={12}>
          <div className="dashboard-card">
            <div className="dashboard-card-header d-flex justify-content-between align-items-center">
              <h5 className="dashboard-card-title">Kategori Dağılımı</h5>
              <Button variant="outline-secondary" className='animated-btn' size="sm" onClick={handleExportCategory}>
                CSV Olarak İndir
              </Button>
            </div>
            <div className="dashboard-chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryStats}>
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Adet" fill="var(--color-primary, #f23026)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        {/* En Aktif Kullanıcılar */}
        <Col md={6} xs={12}>
          <div className="dashboard-card">
            <div className="dashboard-card-header d-flex justify-content-between align-items-center">
              <h5 className="dashboard-card-title">En Aktif Kullanıcılar</h5>
              <Button variant="outline-secondary" className='animated-btn' size="sm" onClick={handleExportUserStats}>
                CSV Olarak İndir
              </Button>
            </div>
            <div className="dashboard-chart-wrapper pie-chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={userStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {userStats.map((_, idx) => (
                      <Cell key={idx} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1'][idx % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Col>

        {/* Günlük Yorumlar */}
        {dailyCommentsStats.length > 0 && (
          <Col md={6} xs={12}>
            <div className="dashboard-card">
              <div className="dashboard-card-header d-flex justify-content-between align-items-center">
                <h5 className="dashboard-card-title">Günlük Yorumlar</h5>
                <Button variant="outline-secondary" className='animated-btn' size="sm" onClick={handleExportComments}>
                  CSV Olarak İndir
                </Button>
              </div>
              <div className="dashboard-chart-wrapper">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyCommentsStats}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Yorum Sayısı"
                      stroke="var(--color-primary, #82ca9d)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Col>
        )}

        {/* Başka metrikler eklemek isterseniz benzer şekilde bölüm ekleyebilirsiniz */}
      </Row>
    </Container>
  );
}
