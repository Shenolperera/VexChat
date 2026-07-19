import React, { useState } from 'react';

export default function AuthPage({ onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [step, setStep] = useState(1);
    const [lang, setLang] = useState('en');

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const t = {
        en: {
            signupMsg: "Sign up to see photos and videos from your friends.",
            username: "Username",
            password: "Password",
            loginBtn: "Log In",
            emailLabel: "Email Address",
            sendOtpBtn: "Send OTP to Email",
            enterOtp: "Enter OTP from Email",
            signupBtn: "Sign Up",
            noAccount: "Don't have an account?",
            haveAccount: "Have an account?",
            switchSignup: "Sign up",
            switchLogin: "Log in"
        },
        ru: {
            signupMsg: "Зарегистрируйтесь, чтобы смотреть фото и видео друзей.",
            username: "Имя пользователя",
            password: "Пароль",
            loginBtn: "Войти",
            emailLabel: "Адрес электронной почты",
            sendOtpBtn: "Отправить OTP на Email",
            enterOtp: "Введите OTP из Email",
            signupBtn: "Зарегистрироваться",
            noAccount: "У вас нет аккаунта?",
            haveAccount: "Есть аккаунт?",
            switchSignup: "Зарегистрироваться",
            switchLogin: "Вход"
        }
    };

    const handleSendOTP = async () => {
        try {
            const res = await fetch('https://vexchat-jz5w.onrender.com/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, language: lang })
            });
            const data = await res.json();
            if (data.success) {
                alert(lang === 'ru' ? 'OTP отправлен на вашу почту!' : 'OTP sent to your Email!');
                setStep(2);
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Server Error!');
        }
    };

    const handleRegister = async () => {
        try {
            const res = await fetch('https://vexchat-jz5w.onrender.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, username, password })
            });
            const data = await res.json();
            if (data.success) {
                alert(lang === 'ru' ? 'Аккаунт создан!' : 'Account Created! Please Log In.');
                setIsLogin(true);
                setStep(1);
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Server Error!');
        }
    };

    const handleLogin = async () => {
        try {
            const res = await fetch('https://vexchat-jz5w.onrender.com/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                onLoginSuccess();
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Server Error!');
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-[#fafafa] relative">
            <div className="absolute top-4 right-4">
                <select 
                    value={lang} 
                    onChange={(e) => setLang(e.target.value)}
                    className="bg-white border border-gray-300 text-sm rounded px-2 py-1 outline-none text-gray-700 cursor-pointer shadow-sm">
                    <option value="en">English</option>
                    <option value="ru">Русский</option>
                </select>
            </div>

            <div className="flex flex-col items-center w-full max-w-[350px]">
                <div className="w-full bg-white border border-gray-300 p-10 mb-3 flex flex-col items-center">
                    <img src="/index logo.png" alt="Vex Chat Logo" className="h-16 mb-8 object-contain" />

                    {isLogin ? (
                        <div className="w-full space-y-3">
                            <input type="text" placeholder={t[lang].username} value={username} onChange={(e) => setUsername(e.target.value)} className="w-full text-sm bg-[#fafafa] border border-gray-300 rounded-[3px] px-2 py-2 focus:outline-none focus:border-gray-400" />
                            <input type="password" placeholder={t[lang].password} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full text-sm bg-[#fafafa] border border-gray-300 rounded-[3px] px-2 py-2 focus:outline-none focus:border-gray-400" />
                            <button onClick={handleLogin} className="w-full bg-[#0095f6] text-white font-semibold py-[6px] rounded-[4px] mt-2 hover:bg-[#1877f2] transition-colors text-sm">
                                {t[lang].loginBtn}
                            </button>
                        </div>
                    ) : (
                        <div className="w-full">
                            <h2 className="text-[17px] font-semibold text-gray-500 text-center mb-4 leading-5">{t[lang].signupMsg}</h2>
                            {step === 1 ? (
                                <div className="space-y-3">
                                    <input 
                                        type="email" placeholder={t[lang].emailLabel} value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        className="w-full text-sm bg-[#fafafa] border border-gray-300 rounded-[3px] px-2 py-2 focus:outline-none focus:border-gray-400" 
                                    />
                                    <button onClick={handleSendOTP} className="w-full bg-[#0095f6] text-white font-semibold py-[6px] rounded-[4px] mt-2 hover:bg-[#1877f2] transition-colors text-sm">
                                        {t[lang].sendOtpBtn}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <input type="text" placeholder={t[lang].enterOtp} value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full text-sm bg-[#fafafa] border border-gray-300 rounded-[3px] px-2 py-2 focus:outline-none focus:border-gray-400" />
                                    <input type="text" placeholder={t[lang].username} value={username} onChange={(e) => setUsername(e.target.value)} className="w-full text-sm bg-[#fafafa] border border-gray-300 rounded-[3px] px-2 py-2 focus:outline-none focus:border-gray-400" />
                                    <input type="password" placeholder={t[lang].password} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full text-sm bg-[#fafafa] border border-gray-300 rounded-[3px] px-2 py-2 focus:outline-none focus:border-gray-400" />
                                    <button onClick={handleRegister} className="w-full bg-[#0095f6] text-white font-semibold py-[6px] rounded-[4px] mt-2 hover:bg-[#1877f2] transition-colors text-sm">
                                        {t[lang].signupBtn}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="w-full bg-white border border-gray-300 p-4 text-center text-sm">
                    {isLogin ? (
                        <p>{t[lang].noAccount} <span onClick={() => setIsLogin(false)} className="text-[#0095f6] font-semibold cursor-pointer">{t[lang].switchSignup}</span></p>
                    ) : (
                        <p>{t[lang].haveAccount} <span onClick={() => { setIsLogin(true); setStep(1); }} className="text-[#0095f6] font-semibold cursor-pointer">{t[lang].switchLogin}</span></p>
                    )}
                </div>
            </div>
        </div>
    );
}