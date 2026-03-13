import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                'bg-primary': 'var(--bg-primary)',
                'bg-secondary': 'var(--bg-secondary)',
                'bg-card': 'var(--bg-card)',
                'bg-elevated': 'var(--bg-elevated)',
                'bg-terminal': 'var(--bg-terminal)',
                'bg-input': 'var(--bg-input)',
                'border-subtle': 'var(--border)',
                'accent-cyan': 'var(--accent-cyan)',
                'accent-blue': 'var(--accent-blue)',
                'accent-indigo': 'var(--accent-indigo)',
                brand: 'var(--accent-indigo)',
                success: 'var(--success)',
                warning: 'var(--warning)',
                danger: 'var(--danger)',
                critical: 'var(--critical)',
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-muted': 'var(--text-muted)',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
            },
            animation: {
                slideUp: 'slideUp 0.4s ease-out forwards',
                slideDown: 'slideDown 0.3s ease-out forwards',
                slideInRight: 'slideInRight 0.4s ease-out forwards',
                fadeIn: 'fadeIn 0.3s ease-out forwards',
                scaleIn: 'scaleIn 0.3s ease-out forwards',
                pulseGlow: 'pulseGlow 2s ease-in-out infinite',
                borderGlow: 'borderGlow 2s ease-in-out infinite',
                float: 'float 3s ease-in-out infinite',
                countUp: 'countUp 0.5s ease-out forwards',
                shimmer: 'shimmer 2s infinite',
            },
            keyframes: {
                slideUp: {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    from: { opacity: '0', transform: 'translateY(-12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                slideInRight: {
                    from: { opacity: '0', transform: 'translateX(20px)' },
                    to: { opacity: '1', transform: 'translateX(0)' },
                },
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                scaleIn: {
                    from: { opacity: '0', transform: 'scale(0.9)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 8px rgba(34,211,238,0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(34,211,238,0.6), 0 0 40px rgba(99,102,241,0.2)' },
                },
                borderGlow: {
                    '0%, 100%': { borderColor: 'rgba(139,92,246,0.3)' },
                    '50%': { borderColor: 'rgba(139,92,246,0.7)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-4px)' },
                },
                countUp: {
                    from: { opacity: '0', transform: 'translateY(8px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            backgroundImage: {
                'gradient-brand': 'linear-gradient(135deg, #6366F1, #22D3EE)',
                'gradient-danger': 'linear-gradient(135deg, #EF4444, #8B5CF6)',
                'gradient-success': 'linear-gradient(135deg, #10B981, #22D3EE)',
            },
        },
    },
    plugins: [],
};
export default config;
