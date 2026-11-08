export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-page">
      <div className="auth-box">
        <p className="brand">Sweety</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </main>
  );
}
