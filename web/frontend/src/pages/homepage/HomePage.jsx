import { useState, useEffect, useRef } from 'react';
import './HomePage.css';

/* ===== Binary Rain Canvas ===== */
function BinaryRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const columns = Math.floor(canvas.width / 18);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 14, 23, 0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = '14px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.5 ? '1' : '0';
        const opacity = Math.random() * 0.4 + 0.05;
        const isHighlight = Math.random() > 0.97;

        if (isHighlight) {
          ctx.fillStyle = `rgba(0, 240, 255, ${opacity + 0.3})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
        } else {
          ctx.fillStyle = `rgba(0, 240, 255, ${opacity})`;
          ctx.shadowBlur = 0;
        }

        ctx.fillText(text, i * 18, drops[i] * 18);
        ctx.shadowBlur = 0;

        if (drops[i] * 18 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="binary-rain" />;
}

/* ===== Animated Counter ===== */
function AnimatedCounter({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();

          const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/* ===== Glitch Text ===== */
function GlitchText({ text }) {
  return (
    <span className="glitch" data-text={text}>
      {text}
    </span>
  );
}

/* ===== Main HomePage ===== */
function HomePage() {
  const [activeFaq, setActiveFaq] = useState(null);
  const [visibleSections, setVisibleSections] = useState(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const hackathons = [
    {
      id: 1,
      title: 'AI Innovation Challenge 2026',
      status: 'Đang diễn ra',
      statusType: 'live',
      date: '15/06 - 17/06/2026',
      prize: '50,000,000₫',
      participants: 320,
      maxParticipants: 500,
      tags: ['AI/ML', 'Python', 'Cloud'],
      org: 'FPT Software',
    },
    {
      id: 2,
      title: 'Green Tech Hackathon',
      status: 'Sắp diễn ra',
      statusType: 'upcoming',
      date: '01/07 - 03/07/2026',
      prize: '30,000,000₫',
      participants: 150,
      maxParticipants: 300,
      tags: ['IoT', 'Sustainability', 'React'],
      org: 'VinGroup',
    },
    {
      id: 3,
      title: 'Blockchain Buildathon',
      status: 'Sắp diễn ra',
      statusType: 'upcoming',
      date: '20/07 - 22/07/2026',
      prize: '100,000,000₫',
      participants: 89,
      maxParticipants: 200,
      tags: ['Web3', 'Solidity', 'DeFi'],
      org: 'KardiaChain',
    },
  ];

  const processSteps = [
    {
      step: '01',
      icon: '🔍',
      title: 'Khám Phá',
      desc: 'Tìm kiếm hackathon phù hợp với kỹ năng và sở thích của bạn từ hàng trăm cuộc thi.',
    },
    {
      step: '02',
      icon: '📝',
      title: 'Đăng Ký',
      desc: 'Tạo hồ sơ, đăng ký tham gia cá nhân hoặc tạo đội nhóm nhanh chóng.',
    },
    {
      step: '03',
      icon: '💻',
      title: 'Thi Đấu',
      desc: 'Tham gia coding, nộp bài dự thi, và theo dõi tiến độ real-time trên dashboard.',
    },
    {
      step: '04',
      icon: '🏆',
      title: 'Nhận Giải',
      desc: 'Trình bày giải pháp, nhận đánh giá từ ban giám khảo và giành giải thưởng.',
    },
  ];

  const faqs = [
    {
      q: 'Làm sao để tham gia một cuộc thi hackathon?',
      a: 'Bạn chỉ cần tạo tài khoản trên SEAL Hackathon, duyệt danh sách các cuộc thi đang mở đăng ký, và nhấn "Đăng Ký Tham Gia". Bạn có thể tham gia với tư cách cá nhân hoặc tạo đội nhóm.',
    },
    {
      q: 'Tôi có cần kinh nghiệm lập trình không?',
      a: 'Không nhất thiết! Nhiều hackathon dành cho mọi cấp độ từ beginner đến advanced. Mỗi cuộc thi sẽ ghi rõ yêu cầu và mức độ phù hợp. Đây là cơ hội tuyệt vời để học hỏi.',
    },
    {
      q: 'Giải thưởng được trao như thế nào?',
      a: 'Giải thưởng sẽ được ban giám khảo đánh giá dựa trên tiêu chí của từng hackathon. Giải thưởng có thể là tiền mặt, học bổng, thiết bị công nghệ, hoặc cơ hội việc làm.',
    },
    {
      q: 'Tôi có thể tổ chức hackathon riêng không?',
      a: 'Có! SEAL Hackathon cung cấp công cụ quản lý toàn diện cho các nhà tổ chức. Bạn có thể tạo hackathon, thiết lập quy tắc, quản lý thí sinh, và trao giải ngay trên nền tảng.',
    },
    {
      q: 'Nền tảng hỗ trợ những loại hackathon nào?',
      a: 'Chúng tôi hỗ trợ hackathon online, offline và hybrid. Bạn có thể tổ chức hoặc tham gia các cuộc thi về AI, Web, Mobile, IoT, Blockchain, và nhiều lĩnh vực khác.',
    },
  ];

  const isVisible = (id) => visibleSections.has(id);

  return (
    <main>
      {/* ===== HERO ===== */}
      <section className="hero" id="hero">
        <BinaryRain />
        <div className="hero__overlay"></div>
        <div className="hero__particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="hero__particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>

        <div className="hero__content container">
          <div className="hero__badge">
            <span className="hero__badge-dot"></span>
            Season 2026 đang diễn ra
          </div>

          <h1 className="hero__title">
            <GlitchText text="HACKATHON" />
            <span className="hero__title-sub">Management System</span>
          </h1>

          <p className="hero__desc">
            Nền tảng kết nối lập trình viên, nhà tổ chức và nhà tài trợ. 
            Tham gia các cuộc thi hackathon, xây dựng giải pháp sáng tạo 
            và biến ý tưởng thành hiện thực.
          </p>

          <div className="hero__actions">
            <a href="#hackathons" className="btn btn--primary btn--lg" id="btn-explore">
              <span>Khám Phá Ngay</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="#about" className="btn btn--outline btn--lg" id="btn-learn-more">
              <span>Tìm Hiểu Thêm</span>
            </a>
          </div>

          <div className="hero__stats-row">
            <div className="hero__stat">
              <span className="hero__stat-number"><AnimatedCounter end={1200} suffix="+" /></span>
              <span className="hero__stat-label">Lập trình viên</span>
            </div>
            <div className="hero__stat-divider"></div>
            <div className="hero__stat">
              <span className="hero__stat-number"><AnimatedCounter end={50} suffix="+" /></span>
              <span className="hero__stat-label">Hackathon</span>
            </div>
            <div className="hero__stat-divider"></div>
            <div className="hero__stat">
              <span className="hero__stat-number"><AnimatedCounter end={500} suffix="M₫" /></span>
              <span className="hero__stat-label">Tổng giải thưởng</span>
            </div>
          </div>
        </div>

        <div className="hero__scroll-indicator">
          <div className="hero__scroll-mouse">
            <div className="hero__scroll-wheel"></div>
          </div>
          <span>Cuộn xuống</span>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className={`about ${isVisible('about') ? 'section--visible' : ''}`} id="about">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Giới Thiệu</span>
            <h2 className="section-title">
              Tại Sao Chọn <span className="gradient-text">SEAL Hackathon</span>?
            </h2>
            <p className="section-subtitle">
              Nền tảng toàn diện giúp bạn tham gia và quản lý hackathon một cách chuyên nghiệp
            </p>
          </div>

          <div className="about__grid">
            {[
              {
                icon: '🚀',
                title: 'Nhanh & Dễ Dàng',
                desc: 'Đăng ký, tạo đội và tham gia hackathon chỉ trong vài phút. Giao diện trực quan, không cần hướng dẫn.',
                color: 'cyan',
              },
              {
                icon: '🛡️',
                title: 'An Toàn & Bảo Mật',
                desc: 'Hệ thống xác thực JWT, bảo vệ dữ liệu cá nhân và bài dự thi với mã hóa tiên tiến.',
                color: 'purple',
              },
              {
                icon: '📊',
                title: 'Dashboard Realtime',
                desc: 'Theo dõi tiến độ cuộc thi, bảng xếp hạng, và thống kê team trực tiếp real-time.',
                color: 'blue',
              },
              {
                icon: '🤝',
                title: 'Cộng Đồng Mạnh',
                desc: 'Kết nối với hàng ngàn developer, chia sẻ kiến thức và xây dựng network chuyên nghiệp.',
                color: 'green',
              },
              {
                icon: '🎯',
                title: 'Quản Lý Dễ Dàng',
                desc: 'Công cụ quản lý toàn diện cho nhà tổ chức: thiết lập quy tắc, chấm điểm, trao giải tự động.',
                color: 'orange',
              },
              {
                icon: '🌐',
                title: 'Online & Offline',
                desc: 'Hỗ trợ tất cả hình thức hackathon: online, offline và hybrid với trải nghiệm mượt mà.',
                color: 'cyan',
              },
            ].map((feature, i) => (
              <div
                className={`about__card about__card--${feature.color}`}
                key={i}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="about__card-icon">{feature.icon}</div>
                <h3 className="about__card-title">{feature.title}</h3>
                <p className="about__card-desc">{feature.desc}</p>
                <div className="about__card-glow"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HACKATHONS ===== */}
      <section className={`hackathons ${isVisible('hackathons') ? 'section--visible' : ''}`} id="hackathons">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Cuộc Thi</span>
            <h2 className="section-title">
              Hackathon <span className="gradient-text">Nổi Bật</span>
            </h2>
            <p className="section-subtitle">
              Khám phá các cuộc thi hackathon hấp dẫn và đầy thử thách
            </p>
          </div>

          <div className="hackathons__grid">
            {hackathons.map((h, i) => (
              <div className="hackathon-card" key={h.id} style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="hackathon-card__header">
                  <div className={`hackathon-card__status hackathon-card__status--${h.statusType}`}>
                    {h.statusType === 'live' && <span className="hackathon-card__pulse"></span>}
                    {h.status}
                  </div>
                  <span className="hackathon-card__org">{h.org}</span>
                </div>

                <h3 className="hackathon-card__title">{h.title}</h3>

                <div className="hackathon-card__meta">
                  <div className="hackathon-card__meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {h.date}
                  </div>
                  <div className="hackathon-card__meta-item hackathon-card__meta-item--prize">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2Z"/>
                    </svg>
                    {h.prize}
                  </div>
                </div>

                <div className="hackathon-card__tags">
                  {h.tags.map((tag) => (
                    <span className="hackathon-card__tag" key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="hackathon-card__progress">
                  <div className="hackathon-card__progress-info">
                    <span>{h.participants}/{h.maxParticipants} đã đăng ký</span>
                    <span>{Math.round((h.participants / h.maxParticipants) * 100)}%</span>
                  </div>
                  <div className="hackathon-card__progress-bar">
                    <div
                      className="hackathon-card__progress-fill"
                      style={{ width: `${(h.participants / h.maxParticipants) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <button className="hackathon-card__btn" id={`btn-join-${h.id}`}>
                  {h.statusType === 'live' ? 'Tham Gia Ngay' : 'Đăng Ký'}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="hackathons__cta">
            <a href="#" className="btn btn--outline" id="btn-view-all">
              Xem Tất Cả Hackathon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ===== PROCESS ===== */}
      <section className={`process ${isVisible('process') ? 'section--visible' : ''}`} id="process">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Quy Trình</span>
            <h2 className="section-title">
              Bắt Đầu Chỉ Với <span className="gradient-text">4 Bước</span>
            </h2>
            <p className="section-subtitle">
              Quy trình đơn giản, rõ ràng giúp bạn nhanh chóng tham gia hackathon
            </p>
          </div>

          <div className="process__timeline">
            {processSteps.map((step, i) => (
              <div className="process__step" key={i} style={{ animationDelay: `${i * 0.2}s` }}>
                <div className="process__step-number">{step.step}</div>
                <div className="process__step-connector"></div>
                <div className="process__step-content">
                  <div className="process__step-icon">{step.icon}</div>
                  <h3 className="process__step-title">{step.title}</h3>
                  <p className="process__step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className={`stats ${isVisible('stats') ? 'section--visible' : ''}`} id="stats">
        <div className="stats__bg"></div>
        <div className="container">
          <div className="stats__grid">
            {[
              { number: 1200, suffix: '+', label: 'Lập Trình Viên', icon: '👨‍💻' },
              { number: 50, suffix: '+', label: 'Hackathon', icon: '🏆' },
              { number: 200, suffix: '+', label: 'Dự Án', icon: '🚀' },
              { number: 30, suffix: '+', label: 'Đối Tác', icon: '🤝' },
            ].map((stat, i) => (
              <div className="stats__item" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="stats__item-icon">{stat.icon}</div>
                <div className="stats__item-number">
                  <AnimatedCounter end={stat.number} suffix={stat.suffix} />
                </div>
                <div className="stats__item-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className={`faq ${isVisible('faq') ? 'section--visible' : ''}`} id="faq">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">FAQ</span>
            <h2 className="section-title">
              Câu Hỏi <span className="gradient-text">Thường Gặp</span>
            </h2>
            <p className="section-subtitle">
              Những câu hỏi phổ biến về SEAL Hackathon
            </p>
          </div>

          <div className="faq__list">
            {faqs.map((faq, i) => (
              <div
                className={`faq__item ${activeFaq === i ? 'faq__item--active' : ''}`}
                key={i}
                id={`faq-item-${i}`}
              >
                <button
                  className="faq__question"
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  id={`faq-btn-${i}`}
                >
                  <span>{faq.q}</span>
                  <svg className="faq__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div className="faq__answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className={`cta ${isVisible('cta') ? 'section--visible' : ''}`} id="cta">
        <div className="cta__glow"></div>
        <div className="container">
          <div className="cta__content">
            <h2 className="cta__title">
              Sẵn Sàng Tham Gia <span className="gradient-text">Hackathon</span>?
            </h2>
            <p className="cta__desc">
              Đăng ký ngay để không bỏ lỡ cơ hội thể hiện bản thân, kết nối cộng đồng và giành giải thưởng hấp dẫn.
            </p>
            <div className="cta__actions">
              <a href="#" className="btn btn--primary btn--lg" id="btn-cta-signup">
                Đăng Ký Miễn Phí
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
