function Footer() {
  return (
    <footer className="relative bg-[#111827] border-t border-[rgba(0,240,255,0.15)] pt-20 pb-8 overflow-hidden" id="footer">
      {/* Top glow line */}
      <div
        className="absolute top-[-1px] left-1/2 -translate-x-1/2 w-[400px] h-[2px]"
        style={{
          background: 'linear-gradient(135deg, #00f0ff, #a855f7)',
          boxShadow: '0 0 40px rgba(0,240,255,0.3), 0 0 80px rgba(168,85,247,0.3)',
        }}
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6">
        {/* Top section */}
        <div className="flex flex-col md:flex-row gap-10 md:gap-20 mb-15">
          {/* Brand */}
          <div className="flex-none md:w-[300px]">
            <a
              href="#hero"
              className="inline-flex items-center gap-2.5 mb-4 no-underline"
              style={{ fontFamily: "'Orbitron', monospace", fontWeight: 700, fontSize: '24px' }}
            >
              <span className="text-[32px] text-[#00f0ff] drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">⬡</span>
              <span
                style={{
                  background: 'linear-gradient(135deg, #00f0ff, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                SEAL
              </span>
            </a>
            <p className="text-[#94a3b8] text-sm leading-[1.7] mb-6">
              Nền tảng quản lý cuộc thi hackathon hàng đầu. Kết nối, sáng tạo và xây dựng tương lai cùng cộng đồng lập trình viên.
            </p>
            <div className="flex gap-3">
              {[
                {
                  label: 'Facebook',
                  svg: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />,
                },
                {
                  label: 'GitHub',
                  svg: <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />,
                },
                {
                  label: 'Discord',
                  svg: <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />,
                },
              ].map(({ label, svg }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex items-center justify-center w-10 h-10 rounded-[10px] border border-[rgba(0,240,255,0.15)] text-[#94a3b8] bg-[rgba(0,240,255,0.03)] transition-all duration-300 no-underline hover:border-[#00f0ff] hover:text-[#00f0ff] hover:bg-[rgba(0,240,255,0.1)] hover:-translate-y-[3px] hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">{svg}</svg>
                </a>
              ))}
            </div>
          </div>

          {/* Links grid */}
          <div className="flex flex-1 flex-col sm:flex-row gap-10">
            {[
              {
                title: 'Nền Tảng',
                links: ['Tìm Hackathon', 'Tạo Hackathon', 'Bảng Xếp Hạng', 'Dự Án Nổi Bật'],
              },
              {
                title: 'Tài Nguyên',
                links: ['Hướng Dẫn', 'Blog', 'API Docs', 'Hỗ Trợ'],
              },
              {
                title: 'Pháp Lý',
                links: ['Điều Khoản', 'Quyền Riêng Tư', 'Cookie', 'Liên Hệ'],
              },
            ].map(({ title, links }) => (
              <div key={title} className="flex-1">
                <h4
                  className="text-[13px] font-semibold text-[#00f0ff] uppercase tracking-[1.5px] mb-5"
                  style={{ fontFamily: "'Orbitron', monospace" }}
                >
                  {title}
                </h4>
                <ul className="flex flex-col gap-3 list-none m-0 p-0">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[#94a3b8] text-sm no-underline transition-all duration-200 hover:text-[#f1f5f9] hover:pl-1.5"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-8 border-t border-[rgba(0,240,255,0.15)] text-[#64748b] text-[13px]">
          <p>© 2026 SEAL Hackathon. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with{' '}
            <span
              className="text-[#ef4444]"
              style={{ animation: 'heartbeat 1.5s ease-in-out infinite' }}
            >
              ♥
            </span>{' '}
            for developers
          </p>
        </div>
      </div>

      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </footer>
  );
}

export default Footer;
