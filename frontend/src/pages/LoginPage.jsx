import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(form.email, form.password);
    } catch (loginError) {
      setError(loginError.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back. Log in to see your glucose readings."
      footer={<>New to Sweety? <Link to="/register">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={handleChange} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" value={form.password} onChange={handleChange} />
        {error && <p className="message error" role="alert">{error}</p>}
        <button type="submit" className="button primary full" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
