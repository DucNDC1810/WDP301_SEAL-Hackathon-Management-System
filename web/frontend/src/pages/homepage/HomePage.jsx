import { useState, useEffect, useRef } from 'react';

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

        if (drops[i] * 18 > canvas.height && Math.random() > 0.975) drops[i] = 0;
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

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
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
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ===== Glitch Text ===== */
function GlitchText({ text }) {
  return (
    <span
      style={{
        background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.4))',
      }}
    >
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
    document.querySelectorAll('section[id]').forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const hackathons = [
    { id: 1, title: 'AI Innovation Challenge 2026', status: 'Đang diễn ra', statusType: 'live', date: '15/06 - 17/06/2026', prize: '50,000,000₫', participants: 320, maxParticipants: 500, tags: ['AI/ML', 'Python', 'Cloud'], org: 'FPT Software' },
    { id: 2, title: 'Green Tech Hackathon', status: 'Sắp diễn ra', statusType: 'upcoming', date: '01/07 - 03/07/2026', prize: '30,000,000₫', participants: 150, maxParticipants: 300, tags: ['IoT', 'Sustainability', 'React'], org: 'VinGroup' },
    { id: 3, title: 'Blockchain Buildathon', status: 'Sắp diễn ra', statusType: 'upcoming', date: '20/07 - 22/07/2026', prize: '100,000,000₫', participants: 89, maxParticipants: 200, tags: ['Web3', 'Solidity', 'DeFi'], org: 'KardiaChain' },
  ];

  const processSteps = [
    { step: '01', icon: '🔍', title: 'Khám Phá', desc: 'Tìm kiếm hackathon phù hợp với kỹ năng và sở thích của bạn từ hàng trăm cuộc thi.' },
    { step: '02', icon: '📝', title: 'Đăng Ký', desc: 'Tạo hồ sơ, đăng ký tham gia cá nhân hoặc tạo đội nhóm nhanh chóng.' },
    { step: '03', icon: '💻', title: 'Thi Đấu', desc: 'Tham gia coding, nộp bài dự thi, và theo dõi tiến độ real-time trên dashboard.' },
    { step: '04', icon: '🏆', title: 'Nhận Giải', desc: 'Trình bày giải pháp, nhận đánh giá từ ban giám khảo và giành giải thưởng.' },
  ];

  const faqs = [
    { q: 'Làm sao để tham gia một cuộc thi hackathon?', a: 'Bạn chỉ cần tạo tài khoản trên SEAL Hackathon, duyệt danh sách các cuộc thi đang mở đăng ký, và nhấn "Đăng Ký Tham Gia". Bạn có thể tham gia với tư cách cá nhân hoặc tạo đội nhóm.' },
    { q: 'Tôi có cần kinh nghiệm lập trình không?', a: 'Không nhất thiết! Nhiều hackathon dành cho mọi cấp độ từ beginner đến advanced. Mỗi cuộc thi sẽ ghi rõ yêu cầu và mức độ phù hợp. Đây là cơ hội tuyệt vời để học hỏi.' },
    { q: 'Giải thưởng được trao như thế nào?', a: 'Giải thưởng sẽ được ban giám khảo đánh giá dựa trên tiêu chí của từng hackathon. Giải thưởng có thể là tiền mặt, học bổng, thiết bị công nghệ, hoặc cơ hội việc làm.' },
    { q: 'Tôi có thể tổ chức hackathon riêng không?', a: 'Có! SEAL Hackathon cung cấp công cụ quản lý toàn diện cho các nhà tổ chức. Bạn có thể tạo hackathon, thiết lập quy tắc, quản lý thí sinh, và trao giải ngay trên nền tảng.' },
    { q: 'Nền tảng hỗ trợ những loại hackathon nào?', a: 'Chúng tôi hỗ trợ hackathon online, offline và hybrid. Bạn có thể tổ chức hoặc tham gia các cuộc thi về AI, Web, Mobile, IoT, Blockchain, và nhiều lĩnh vực khác.' },
  ];

  const aboutFeatures = [
    { icon: '🚀', title: 'Nhanh & Dễ Dàng', desc: 'Đăng ký, tạo đội và tham gia hackathon chỉ trong vài phút. Giao diện trực quan, không cần hướng dẫn.', color: '#00d4ff' },
    { icon: '🛡️', title: 'An Toàn & Bảo Mật', desc: 'Hệ thống xác thực JWT, bảo vệ dữ liệu cá nhân và bài dự thi với mã hóa tiên tiến.', color: '#a855f7' },
    { icon: '📊', title: 'Dashboard Realtime', desc: 'Theo dõi tiến độ cuộc thi, bảng xếp hạng, và thống kê team trực tiếp real-time.', color: '#3b82f6' },
    { icon: '🤝', title: 'Cộng Đồng Mạnh', desc: 'Kết nối với hàng ngàn developer, chia sẻ kiến thức và xây dựng network chuyên nghiệp.', color: '#10b981' },
    { icon: '🎯', title: 'Quản Lý Dễ Dàng', desc: 'Công cụ quản lý toàn diện cho nhà tổ chức: thiết lập quy tắc, chấm điểm, trao giải tự động.', color: '#f59e0b' },
    { icon: '🌐', title: 'Online & Offline', desc: 'Hỗ trợ tất cả hình thức hackathon: online, offline và hybrid với trải nghiệm mượt mà.', color: '#00d4ff' },
  ];

  const gradientText = {
    background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  const sectionStyle = (id) => ({
    opacity: visibleSections.has(id) ? 1 : 0,
    transform: visibleSections.has(id) ? 'translateY(0)' : 'translateY(30px)',
    transition: 'all 0.6s ease',
  });

  return (
    <main className="bg-[#060b16] text-white overflow-x-hidden">
      {/* ===== HERO ===== */}
      <section
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 70%), #060b16' }}
      >
        <BinaryRain />
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(to bottom, rgba(6,11,22,0.3) 0%, rgba(6,11,22,0.6) 100%)' }} />

        {/* Floating particles */}
        <div className="absolute inset-0 z-[1] pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: '4px', height: '4px',
                background: 'rgba(0,212,255,0.3)',
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                animation: `ping ${3 + (i % 4)}s ease-in-out infinite`,
                animationDelay: `${(i * 0.25) % 5}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-[2] max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/5 text-[#00d4ff] text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
            Season 2026 đang diễn ra
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-4 leading-none">
            <GlitchText text="HACKATHON" />
          </h1>
          <p className="text-xl md:text-2xl font-light text-white/60 tracking-widest uppercase mb-8">
            Management System
          </p>

          <p className="max-w-2xl mx-auto text-white/55 text-base md:text-lg leading-relaxed mb-10">
            Nền tảng kết nối lập trình viên, nhà tổ chức và nhà tài trợ.
            Tham gia các cuộc thi hackathon, xây dựng giải pháp sáng tạo
            và biến ý tưởng thành hiện thực.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <a
              href="#hackathons"
              id="btn-explore"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-black text-base transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', boxShadow: '0 0 30px rgba(0,212,255,0.25)' }}
            >
              <span>Khám Phá Ngay</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a
              href="#about"
              id="btn-learn-more"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white text-base border border-white/20 bg-white/5 hover:bg-white/10 transition-all"
            >
              Tìm Hiểu Thêm
            </a>
          </div>

          {/* Stats row */}
          <div className="inline-flex items-stretch gap-0 px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/8">
            {[
              { end: 1200, suffix: '+', label: 'Lập trình viên' },
              { end: 50, suffix: '+', label: 'Hackathon' },
              { end: 500, suffix: 'M₫', label: 'Tổng giải thưởng' },
            ].map((s, i) => (
              <div key={i} className="flex items-center">
                {i > 0 && <div className="w-px h-8 bg-white/10 mx-8" />}
                <div className="text-center">
                  <div className="text-2xl font-black" style={{ color: '#00d4ff' }}>
                    <AnimatedCounter end={s.end} suffix={s.suffix} />
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2 text-white/30 text-xs">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/40 animate-bounce" />
          </div>
          <span>Cuộn xuống</span>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about" className="py-24 px-6" style={sectionStyle('about')}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-[#00d4ff]/10 text-[#00d4ff] text-xs font-semibold uppercase tracking-widest mb-4">Giới Thiệu</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Tại Sao Chọn <span style={gradientText}>SEAL Hackathon</span>?
            </h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              Nền tảng toàn diện giúp bạn tham gia và quản lý hackathon một cách chuyên nghiệp
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {aboutFeatures.map((f, i) => (
              <div
                key={i}
                className="relative p-6 rounded-2xl border bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:-translate-y-1 group overflow-hidden cursor-default"
                style={{ borderColor: `${f.color}22` }}
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
                <div
                  className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(to right, transparent, ${f.color}, transparent)` }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HACKATHONS ===== */}
      <section id="hackathons" className="py-24 px-6" style={{ ...sectionStyle('hackathons'), background: 'rgba(255,255,255,0.005)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-[#a855f7]/10 text-[#a855f7] text-xs font-semibold uppercase tracking-widest mb-4">Cuộc Thi</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Hackathon <span style={gradientText}>Nổi Bật</span>
            </h2>
            <p className="text-white/50 text-lg">Khám phá các cuộc thi hackathon hấp dẫn và đầy thử thách</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {hackathons.map((h, i) => {
              const pct = Math.round((h.participants / h.maxParticipants) * 100);
              return (
                <div
                  key={h.id}
                  className="flex flex-col p-6 rounded-2xl border border-white/8 bg-white/[0.025] hover:border-[#00d4ff]/30 hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                      style={
                        h.statusType === 'live'
                          ? { background: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }
                          : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.2)' }
                      }
                    >
                      {h.statusType === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />}
                      {h.status}
                    </span>
                    <span className="text-xs text-white/30">{h.org}</span>
                  </div>

                  <h3 className="font-bold text-white text-base mb-4 flex-1">{h.title}</h3>

                  <div className="flex flex-col gap-2 mb-4 text-sm text-white/50">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {h.date}
                    </div>
                    <div className="flex items-center gap-2" style={{ color: '#f59e0b' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0012 0V2Z"/>
                      </svg>
                      {h.prize}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {h.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs border" style={{ borderColor: 'rgba(0,212,255,0.2)', color: 'rgba(0,212,255,0.7)', background: 'rgba(0,212,255,0.05)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-white/40 mb-1.5">
                      <span>{h.participants}/{h.maxParticipants} đã đăng ký</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: 'linear-gradient(to right, #00d4ff, #a855f7)' }}
                      />
                    </div>
                  </div>

                  <button
                    id={`btn-join-${h.id}`}
                    className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:scale-105 border-none cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}
                  >
                    {h.statusType === 'live' ? 'Tham Gia Ngay' : 'Đăng Ký'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <a
              href="#"
              id="btn-view-all"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white border border-white/15 bg-white/5 hover:bg-white/10 transition-all text-sm"
            >
              Xem Tất Cả Hackathon
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* ===== PROCESS ===== */}
      <section id="process" className="py-24 px-6" style={sectionStyle('process')}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-[#10b981]/10 text-[#10b981] text-xs font-semibold uppercase tracking-widest mb-4">Quy Trình</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Bắt Đầu Chỉ Với <span style={gradientText}>4 Bước</span>
            </h2>
            <p className="text-white/50 text-lg">Quy trình đơn giản, rõ ràng giúp bạn nhanh chóng tham gia hackathon</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                {i < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-px" style={{ background: 'linear-gradient(to right, rgba(0,212,255,0.3), transparent)' }} />
                )}
                <div
                  className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-lg mb-4"
                  style={{ color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)', border: '1px solid', background: 'rgba(0,212,255,0.05)' }}
                >
                  {step.step}
                </div>
                <div className="text-3xl mb-3">{step.icon}</div>
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section
        id="stats"
        className="py-24 px-6 relative overflow-hidden"
        style={{ ...sectionStyle('stats'), background: 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, rgba(168,85,247,0.04) 100%)' }}
      >
        <div className="absolute inset-0" style={{ background: 'rgba(11,17,32,0.5)' }} />
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { number: 1200, suffix: '+', label: 'Lập Trình Viên', icon: '👨‍💻' },
              { number: 50, suffix: '+', label: 'Hackathon', icon: '🏆' },
              { number: 200, suffix: '+', label: 'Dự Án', icon: '🚀' },
              { number: 30, suffix: '+', label: 'Đối Tác', icon: '🤝' },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-6 rounded-2xl border border-white/8 bg-white/[0.03] hover:border-[#00d4ff]/20 transition-all"
              >
                <div className="text-4xl mb-3">{stat.icon}</div>
                <div className="text-3xl font-black mb-1" style={{ color: '#00d4ff' }}>
                  <AnimatedCounter end={stat.number} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-white/45">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-24 px-6" style={sectionStyle('faq')}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-[#a855f7]/10 text-[#a855f7] text-xs font-semibold uppercase tracking-widest mb-4">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Câu Hỏi <span style={gradientText}>Thường Gặp</span>
            </h2>
            <p className="text-white/50 text-lg">Những câu hỏi phổ biến về SEAL Hackathon</p>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                id={`faq-item-${i}`}
                className="rounded-2xl border transition-all overflow-hidden"
                style={activeFaq === i
                  ? { borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.05)' }
                  : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }
                }
              >
                <button
                  id={`faq-btn-${i}`}
                  className="w-full flex items-center justify-between p-5 text-left bg-transparent border-none cursor-pointer"
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                >
                  <span className="font-medium text-white text-sm">{faq.q}</span>
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className="flex-shrink-0 ml-4 transition-transform"
                    style={{ color: activeFaq === i ? '#00d4ff' : 'rgba(255,255,255,0.4)', transform: activeFaq === i ? 'rotate(180deg)' : 'none' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {activeFaq === i && (
                  <div className="px-5 pb-5 text-sm text-white/50 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section id="cta" className="py-32 px-6 relative overflow-hidden" style={sectionStyle('cta')}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(168,85,247,0.12) 0%, rgba(0,212,255,0.06) 50%, transparent 100%)' }}
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Sẵn Sàng Tham Gia <span style={gradientText}>Hackathon</span>?
          </h2>
          <p className="text-white/50 text-lg mb-10 leading-relaxed">
            Đăng ký ngay để không bỏ lỡ cơ hội thể hiện bản thân, kết nối cộng đồng và giành giải thưởng hấp dẫn.
          </p>
          <a
            href="#"
            id="btn-cta-signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-black text-base transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', boxShadow: '0 0 40px rgba(0,212,255,0.3)' }}
          >
            Đăng Ký Miễn Phí
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
