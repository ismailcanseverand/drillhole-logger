import React, { useState } from 'react';
import { getSupabaseClient } from '../utils/supabaseClient';
import { Lock, Mail, User, Database, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (userEmail: string) => void;
  onContinueOffline: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onContinueOffline }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const client = getSupabaseClient();
    if (!client) {
      setError('Supabase bağlantısı kurulamadı. Lütfen bağlantı ayarlarını kontrol edin.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error: signUpErr } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: name || email.split('@')[0],
            },
          },
        });

        if (signUpErr) throw signUpErr;

        if (data?.user) {
          // If automatic login on sign up is enabled in Supabase, proceed
          if (data.session) {
            onAuthSuccess(data.user.email || email);
          } else {
            setMessage('Kayıt başarılı! Giriş yapmak için lütfen e-postanızı doğrulayın veya giriş yapmayı deneyin.');
            setIsSignUp(false);
          }
        }
      } else {
        // Sign In
        const { data, error: signInErr } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (signInErr) throw signInErr;

        if (data?.user) {
          onAuthSuccess(data.user.email || email);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Bir hata oluştu. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="auth-screen-container" 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)',
        fontFamily: 'var(--font-sans)',
        padding: '20px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative Blur Orbs */}
      <div 
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
          top: '-100px',
          right: '-100px',
          zIndex: 0
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0) 70%)',
          bottom: '-150px',
          left: '-150px',
          zIndex: 0
        }}
      />

      <div 
        className="auth-card"
        style={{
          background: 'rgba(30, 41, 59, 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '40px 32px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          zIndex: 1,
          animation: 'fadeIn 0.5s ease-out-back'
        }}
      >
        {/* App Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              color: '#ffffff',
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)',
              marginBottom: '16px'
            }}
          >
            <Database size={32} />
          </div>
          <h2 
            style={{
              fontSize: '24px',
              fontWeight: '800',
              color: '#ffffff',
              margin: '0 0 8px 0',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.5px'
            }}
          >
            KaleMaden Sondaj Logger
          </h2>
          <p 
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              margin: 0
            }}
          >
            Sondaj Veri Giriş ve Loglama Yönetim Portalı
          </p>
        </div>

        {error && (
          <div 
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div 
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#34d399',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <ShieldCheck size={18} />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {isSignUp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ad Soyad
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                  <User size={18} />
                </span>
                <input
                  type="text"
                  placeholder="İsmailcan Sever"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              E-Posta Adresi
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="jeolog@kalemaden.com.tr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Şifre
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
              marginTop: '10px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if(!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)';
            }}
          >
            {loading ? (
              <span className="spinner-loader" style={{
                width: '16px',
                height: '16px',
                border: '2px solid #ffffff',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite'
              }} />
            ) : (
              <>
                <span>{isSignUp ? 'Hesap Oluştur' : 'Giriş Yap'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#a5b4fc',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Zaten bir hesabınız var mı? Giriş Yapın' : 'Yeni hesap oluşturmak için tıklayın'}
          </button>
        </div>

        {/* Separator line */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', opacity: 0.15 }}>
          <div style={{ flex: 1, height: '1px', background: '#ffffff' }} />
          <span style={{ padding: '0 10px', fontSize: '11px', color: '#ffffff' }}>VEYA</span>
          <div style={{ flex: 1, height: '1px', background: '#ffffff' }} />
        </div>

        {/* Offline Guest Option */}
        <button
          onClick={onContinueOffline}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            background: 'transparent',
            color: '#cbd5e1',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        >
          <HelpCircle size={16} />
          <span>Çevrimdışı (Önizleme) Modda Devam Et</span>
        </button>
      </div>
    </div>
  );
};
