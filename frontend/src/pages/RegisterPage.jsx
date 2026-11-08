import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { validateRegistration } from '../utils/validation';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: undefined });
    setFormError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const foundErrors = validateRegistration(form);
    setErrors(foundErrors);
    if (Object.keys(foundErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
    } catch (error) {
      setErrors(error.errors ?? {});
      if (!error.errors || Object.keys(error.errors).length === 0) setFormError(error.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your blood glucose in a minute."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate>
        <Field id="name" label="Name" autoComplete="name" value={form.name} onChange={handleChange} error={errors.name} />
        <Field id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={handleChange} error={errors.email} />
        <Field id="password" label="Password (at least 8 characters)" type="password" autoComplete="new-password" value={form.password} onChange={handleChange} error={errors.password} />
        {formError && <p className="message error" role="alert">{formError}</p>}
        <button type="submit" className="button primary full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
