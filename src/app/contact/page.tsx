'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { MapPin, Phone, Clock, Mail } from 'lucide-react';
import { useBrand } from '@/components/BrandProvider';

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const socialLinks = [
  { label: 'Instagram', href: '#' },
  { label: 'Facebook', href: '#' },
  { label: 'Twitter / X', href: '#' },
];

export default function ContactPage() {
  const brand = useBrand();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>();

  const onSubmit = () => {
    setSubmitted(true);
    reset();
    setTimeout(() => setSubmitted(false), 5000);
  };

  const inputStyle = {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
    borderWidth: '1px',
    borderColor: 'var(--color-border)',
  };

  return (
    <motion.main
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1
        className="mb-10 text-4xl font-bold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Get In Touch
      </h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        {/* Contact form — left */}
        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderWidth: '1px',
              borderColor: 'var(--color-border)',
            }}
          >
            {submitted && (
              <div
                className="mb-6 rounded-lg px-4 py-3 text-sm font-medium"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: '#ffffff',
                }}
              >
                Thank you for reaching out! We&apos;ll get back to you soon.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  Name <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
                  style={{
                    ...inputStyle,
                    // @ts-expect-error CSS custom prop for focus ring
                    '--tw-ring-color': 'var(--color-primary)',
                  }}
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  Email <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
                  style={inputStyle}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* Phone (optional) */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-1 block text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  Phone <span className="text-xs opacity-60">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
                  style={inputStyle}
                  {...register('phone')}
                />
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="subject"
                  className="mb-1 block text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  Subject <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <select
                  id="subject"
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
                  style={inputStyle}
                  {...register('subject', { required: 'Please select a subject' })}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a subject...
                  </option>
                  <option value="general">General Inquiry</option>
                  <option value="product">Product Inquiry</option>
                  <option value="feedback">Feedback</option>
                  <option value="partnership">Partnership</option>
                </select>
                {errors.subject && (
                  <p className="mt-1 text-xs text-red-500">{errors.subject.message}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="mb-1 block text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  Message <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <textarea
                  id="message"
                  rows={5}
                  className="w-full resize-y rounded-lg px-4 py-3 text-sm outline-none transition-colors focus:ring-2"
                  style={inputStyle}
                  {...register('message', { required: 'Message is required' })}
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 sm:w-auto"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                Send Message
              </button>
            </form>
          </div>
        </motion.div>

        {/* Store info — right */}
        <motion.aside
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderWidth: '1px',
              borderColor: 'var(--color-border)',
            }}
          >
            <h2
              className="mb-6 text-xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              {brand.name}
            </h2>

            {/* Address */}
            <div className="mb-4 flex items-start gap-3">
              <MapPin
                className="mt-0.5 h-5 w-5 flex-shrink-0"
                style={{ color: 'var(--color-primary)' }}
              />
              <a
                href={brand.store.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline-offset-2 hover:underline"
                style={{ color: 'var(--color-text)' }}
              >
                {brand.store.address}
                <br />
                {brand.store.city}, {brand.store.state} {brand.store.zip}
              </a>
            </div>

            {/* Phone */}
            <div className="mb-4 flex items-center gap-3">
              <Phone
                className="h-5 w-5 flex-shrink-0"
                style={{ color: 'var(--color-primary)' }}
              />
              <a
                href={`tel:${brand.store.phone.replace(/[^+\d]/g, '')}`}
                className="text-sm underline-offset-2 hover:underline"
                style={{ color: 'var(--color-text)' }}
              >
                {brand.store.phone}
              </a>
            </div>

            {/* Email */}
            <div className="mb-4 flex items-center gap-3">
              <Mail
                className="h-5 w-5 flex-shrink-0"
                style={{ color: 'var(--color-primary)' }}
              />
              <a
                href="mailto:tokeandchillronaldreagan@gmail.com"
                className="text-sm underline-offset-2 hover:underline"
                style={{ color: 'var(--color-text)' }}
              >
                tokeandchillronaldreagan@gmail.com
              </a>
            </div>

            {/* Hours */}
            <div className="mb-6 flex items-start gap-3">
              <Clock
                className="mt-0.5 h-5 w-5 flex-shrink-0"
                style={{ color: 'var(--color-primary)' }}
              />
              <div className="text-sm" style={{ color: 'var(--color-text)' }}>
                <p>{brand.store.hours.weekday}</p>
                <p>{brand.store.hours.sunday}</p>
              </div>
            </div>

            {/* Divider */}
            <hr className="mb-6" style={{ borderColor: 'var(--color-border)' }} />

            {/* Social */}
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Follow Us
            </h3>
            <div className="flex items-center gap-3">
              {socialLinks.map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.main>
  );
}
