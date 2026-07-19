import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { 
    PhoneIcon, VideoCameraIcon, InformationCircleIcon, FaceSmileIcon, 
    PaperClipIcon, MicrophoneIcon, MagnifyingGlassIcon, EllipsisVerticalIcon,
    PencilIcon, TrashIcon, XMarkIcon, SunIcon, MoonIcon, GlobeAltIcon, StopIcon,
    PhoneXMarkIcon
} from '@heroicons/react/24/outline';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';

// Vite Fix for simple-peer
if (typeof global === 'undefined') {
    window.global = window;
}

let socket;

export default function ChatPage() {
    const [currentUser, setCurrentUser] = useState(localStorage.getItem('username') || '');
    const [allUsers, setAllUsers] = useState([]);
    const [inbox, setInbox] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    
    const [newMessage, setNewMessage] = useState('');
    const [editingMsgId, setEditingMsgId] = useState(null);
    const [showOptionsId, setShowOptionsId] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const [isDark, setIsDark] = useState(localStorage.getItem('theme') === 'dark');
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevMessagesLength = useRef(0);

    // ==========================================
    // 🌟 WebRTC & Call States
    // ==========================================
    const [callState, setCallState] = useState({
        isActive: false, receivingCall: false, caller: '', callerName: '', 
        callerSignal: null, callAccepted: false, isVideo: true
    });
    const [myStream, setMyStream] = useState(null);
    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    const t = {
        en: { logout: "Log Out", search: "Search users...", noChats: "No chats yet.", noUsers: "No users found", sayHi: "Say hi!", yourMessages: "Your Messages", startMessaging: "Search to start messaging.", message: "Message...", send: "Send", save: "Save", cancel: "Cancel", editing: "Editing...", editMsg: "Edit", delMe: "Delete for me", delEveryone: "Delete for everyone", deletedMsg: "🚫 Deleted", seen: "Seen", edited: "Edited" },
        ru: { logout: "Выйти", search: "Поиск...", noChats: "Пока нет чатов.", noUsers: "Не найдено", sayHi: "Поздоровайтесь!", yourMessages: "Ваши сообщения", startMessaging: "Найдите для общения.", message: "Сообщение...", send: "Отправить", save: "Сохранить", cancel: "Отмена", editing: "Редактирование...", editMsg: "Редактировать", delMe: "Удалить у меня", delEveryone: "Удалить у всех", deletedMsg: "🚫 Удалено", seen: "Просмотрено", edited: "Изменено" }
    };

    const toggleTheme = () => { const newTheme = !isDark; setIsDark(newTheme); localStorage.setItem('theme', newTheme ? 'dark' : 'light'); };
    const toggleLanguage = () => { const newLang = lang === 'en' ? 'ru' : 'en'; setLang(newLang); localStorage.setItem('lang', newLang); };

    // 🌟 Socket.io Initialization
    useEffect(() => {
        socket = io('https://vexchat-jz5w.onrender.com');
        socket.emit('register', currentUser);

        socket.on('callUser', (data) => {
            setCallState({ isActive: true, receivingCall: true, caller: data.from, callerName: data.name, callerSignal: data.signal, callAccepted: false, isVideo: data.isVideo });
        });

        socket.on('callAccepted', (signal) => {
            setCallState(prev => ({ ...prev, callAccepted: true }));
            if (connectionRef.current) connectionRef.current.signal(signal);
        });

        socket.on('callEnded', () => {
            leaveCall(false); 
        });

        return () => { socket.disconnect(); };
    }, [currentUser]);

    useEffect(() => {
        fetch(`https://vexchat-jz5w.onrender.com/api/users?currentUser=${currentUser}`).then(res => res.json()).then(data => setAllUsers(data));
    }, [currentUser]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const inboxRes = await fetch(`https://vexchat-jz5w.onrender.com/api/inbox/${currentUser}`);
                const inboxData = await inboxRes.json();
                const formattedInbox = Object.keys(inboxData).map(username => ({ username, ...inboxData[username] })).sort((a, b) => b.timestamp - a.timestamp);
                setInbox(formattedInbox);

                if (selectedUser) {
                    const msgRes = await fetch(`https://vexchat-jz5w.onrender.com/api/messages/${currentUser}/${selectedUser.username}`);
                    const msgData = await msgRes.json();
                    setMessages(msgData);
                    const hasUnread = msgData.some(m => m.receiver === currentUser && !m.read && !m.deletedForEveryone);
                    if (hasUnread) {
                        await fetch('https://vexchat-jz5w.onrender.com/api/messages/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reader: currentUser, sender: selectedUser.username }) });
                    }
                }
            } catch (error) {}
        };
        fetchData();
        const interval = setInterval(fetchData, 1000); 
        return () => clearInterval(interval);
    }, [currentUser, selectedUser]);

    useEffect(() => {
        if (messages.length > prevMessagesLength.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLength.current = messages.length;
    }, [messages]);

    useEffect(() => {
        prevMessagesLength.current = 0;
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
    }, [selectedUser]);

    // ==========================================
    // 🌟 Video & Voice Call Functions
    // ==========================================
    const callUser = (isVideo) => {
        if (!selectedUser) return;
        setCallState({ isActive: true, receivingCall: false, caller: '', callerName: '', callerSignal: null, callAccepted: false, isVideo });
        
        navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true }).then((stream) => {
            setMyStream(stream);
            if (myVideo.current) myVideo.current.srcObject = stream;

            const peer = new Peer({ initiator: true, trickle: false, stream });

            peer.on('signal', (data) => {
                socket.emit('callUser', { userToCall: selectedUser.username, signalData: data, from: currentUser, name: currentUser, isVideo });
            });

            peer.on('stream', (userStream) => {
                if (userVideo.current) userVideo.current.srcObject = userStream;
            });

            connectionRef.current = peer;
        }).catch(err => {
            alert("Please allow camera and microphone access to make calls.");
            setCallState(prev => ({ ...prev, isActive: false }));
        });
    };

    const answerCall = () => {
        setCallState(prev => ({ ...prev, callAccepted: true, receivingCall: false }));
        
        navigator.mediaDevices.getUserMedia({ video: callState.isVideo, audio: true }).then((stream) => {
            setMyStream(stream);
            if (myVideo.current) myVideo.current.srcObject = stream;

            const peer = new Peer({ initiator: false, trickle: false, stream });

            peer.on('signal', (data) => {
                socket.emit('answerCall', { signal: data, to: callState.caller });
            });

            peer.on('stream', (userStream) => {
                if (userVideo.current) userVideo.current.srcObject = userStream;
            });

            peer.signal(callState.callerSignal);
            connectionRef.current = peer;
        });
    };

    const leaveCall = (emit = true) => {
        if (emit) socket.emit('endCall', { to: selectedUser?.username || callState.caller });
        setCallState({ isActive: false, receivingCall: false, caller: '', callerName: '', callerSignal: null, callAccepted: false, isVideo: true });
        
        if (myStream) {
            myStream.getTracks().forEach(track => track.stop());
        }
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        setMyStream(null);
    };

    // ==========================================
    // Messaging & Upload Functions
    // ==========================================
    const uploadAndSendFile = async (file, type) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const uploadRes = await fetch('https://vexchat-jz5w.onrender.com/api/upload', { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
                const msgData = { sender: currentUser, receiver: selectedUser.username, text: '', type, fileUrl: uploadData.fileUrl };
                await fetch('https://vexchat-jz5w.onrender.com/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msgData) });
            }
        } catch (error) { console.error("Upload error", error); }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const type = file.type.startsWith('video') ? 'video' : 'image';
        uploadAndSendFile(file, type);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = []; 

            mediaRecorderRef.current.ondataavailable = e => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                uploadAndSendFile(audioFile, 'audio');
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) { alert("Microphone access denied!"); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;
        setShowEmojiPicker(false);

        if (editingMsgId) {
            await fetch(`https://vexchat-jz5w.onrender.com/api/messages/edit/${editingMsgId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newMessage }) });
            setEditingMsgId(null);
        } else {
            const msgData = { sender: currentUser, receiver: selectedUser.username, text: newMessage, type: 'text' };
            await fetch('https://vexchat-jz5w.onrender.com/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msgData) });
        }
        setNewMessage('');
    };

    const handleEmojiClick = (emojiObject) => setNewMessage(prev => prev + emojiObject.emoji);
    const handleDeleteChat = async (e, otherUser) => {
        e.stopPropagation();
        if(!window.confirm(`Delete chat with ${otherUser}?`)) return;
        await fetch('https://vexchat-jz5w.onrender.com/api/chats/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentUser, otherUser }) });
        if (selectedUser?.username === otherUser) setSelectedUser(null);
    };
    const handleEditClick = (e, msg) => { e.stopPropagation(); setNewMessage(msg.text); setEditingMsgId(msg.id); setShowOptionsId(null); };
    const handleDelete = async (e, msgId, type) => {
        e.stopPropagation();
        await fetch(`https://vexchat-jz5w.onrender.com/api/messages/delete/${msgId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser, type }) });
        setShowOptionsId(null);
    };
    const handleReact = async (e, msgId, reaction) => {
        e.stopPropagation();
        await fetch(`https://vexchat-jz5w.onrender.com/api/messages/react/${msgId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser, reaction }) });
        setShowOptionsId(null);
    };
    const handleLogout = () => { localStorage.clear(); window.location.reload(); };

    const displayList = searchQuery.trim() ? allUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase())) : inbox;
    const visibleMessages = messages.filter(msg => !(msg.deletedFor && msg.deletedFor.includes(currentUser)));
    const lastSentMsg = [...visibleMessages].reverse().find(m => m.sender === currentUser);

    return (
        <div className={`flex h-screen font-sans transition-colors duration-300 relative ${isDark ? 'bg-[#121212] text-gray-100' : 'bg-white text-gray-900'}`} onClick={() => {setShowOptionsId(null); setShowEmojiPicker(false);}}>
            
            {/* 🌟 Call UI Overlay */}
            {callState.isActive && (
                <div className="absolute inset-0 z-50 bg-[#121212] bg-opacity-95 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <h2 className="text-3xl font-bold mb-6">
                        {callState.receivingCall ? `${callState.callerName} is calling...` : (callState.callAccepted ? `Connected with ${selectedUser?.username || callState.callerName}` : `Calling ${selectedUser?.username}...`)}
                    </h2>
                    
                    <div className="flex flex-col md:flex-row gap-6 mb-10 items-center">
                        {/* Remote Video */}
                        {callState.callAccepted && (
                            <div className="relative w-80 md:w-[600px] h-60 md:h-[400px] bg-black rounded-2xl overflow-hidden border-4 border-[#0095f6] shadow-2xl">
                                {callState.isVideo ? (
                                    <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <PhoneIcon className="h-20 w-20 text-gray-500 animate-pulse" />
                                        <audio playsInline ref={userVideo} autoPlay className="hidden" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Local Video */}
                        {myStream && (
                            <div className={`relative ${callState.callAccepted ? 'w-32 h-32 md:w-48 md:h-48 absolute bottom-24 right-10' : 'w-64 h-64'} bg-gray-800 rounded-2xl overflow-hidden border-2 border-gray-500 shadow-lg transition-all duration-300`}>
                                {callState.isVideo ? (
                                    <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <MicrophoneIcon className="h-12 w-12 text-green-400" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex space-x-8">
                        {callState.receivingCall && !callState.callAccepted && (
                            <button onClick={answerCall} className="bg-green-500 hover:bg-green-600 p-5 rounded-full shadow-lg transition-transform hover:scale-110">
                                <PhoneIcon className="h-8 w-8 text-white" />
                            </button>
                        )}
                        <button onClick={() => leaveCall(true)} className="bg-red-500 hover:bg-red-600 p-5 rounded-full shadow-lg transition-transform hover:scale-110">
                            <PhoneXMarkIcon className="h-8 w-8 text-white" />
                        </button>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className={`w-[350px] border-r flex flex-col ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                    <h1 className="text-xl font-bold flex-1">{currentUser}</h1>
                    <div className="flex items-center space-x-3">
                        <button onClick={toggleLanguage} className="p-1 rounded-full hover:bg-gray-500/20"><GlobeAltIcon className="h-5 w-5" /></button>
                        <button onClick={toggleTheme} className="p-1 rounded-full hover:bg-gray-500/20">{isDark ? <SunIcon className="h-5 w-5 text-yellow-400" /> : <MoonIcon className="h-5 w-5 text-gray-600" />}</button>
                        <button onClick={handleLogout} className="text-sm text-red-500 font-semibold">{t[lang].logout}</button>
                    </div>
                </div>
                
                <div className={`p-3 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className={`flex items-center rounded-lg px-3 py-1.5 ${isDark ? 'bg-[#1e1e1e]' : 'bg-gray-100'}`}>
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-500 mr-2" />
                        <input type="text" placeholder={t[lang].search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent outline-none w-full text-sm" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {displayList.length > 0 ? (
                        displayList.map((u, index) => (
                            <div key={index} onClick={() => { setSelectedUser(u); setSearchQuery(''); setNewMessage(''); setEditingMsgId(null); }} className={`group flex items-center p-3 cursor-pointer ${selectedUser?.username === u.username ? (isDark ? 'bg-[#1e1e1e]' : 'bg-gray-100') : (isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50')}`}>
                                <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 to-fuchsia-600 rounded-full p-[2px] flex-shrink-0">
                                    <div className={`w-full h-full rounded-full border-2 flex items-center justify-center font-bold text-lg ${isDark ? 'bg-black border-black text-gray-300' : 'bg-white border-white text-gray-500'}`}>{u.username.charAt(0).toUpperCase()}</div>
                                </div>
                                <div className="ml-3 flex-1 overflow-hidden">
                                    <h2 className={`text-sm font-bold ${u.unread > 0 ? (isDark ? 'text-white' : 'text-black') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}>{u.username}</h2>
                                    {!searchQuery.trim() && u.lastMessage && <p className={`text-xs mt-0.5 truncate max-w-[180px] ${u.unread > 0 ? (isDark ? 'text-gray-200' : 'text-gray-900 font-semibold') : 'text-gray-500'}`}>{u.lastMessage}</p>}
                                </div>
                                {!searchQuery.trim() && (
                                    <div className="flex items-center ml-2">
                                        {u.unread > 0 && <div className="bg-[#ff3040] text-white text-[11px] font-bold h-5 min-w-[20px] rounded-full flex items-center justify-center px-1.5 mr-2 group-hover:hidden">{u.unread}</div>}
                                        <button onClick={(e) => handleDeleteChat(e, u.username)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : <p className="text-center text-gray-500 mt-10 text-sm">{searchQuery ? t[lang].noUsers : t[lang].noChats}</p>}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col relative">
                {selectedUser ? (
                    <>
                        <div className={`h-[70px] border-b flex items-center justify-between px-6 z-10 ${isDark ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="flex items-center cursor-pointer">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isDark ? 'bg-[#1e1e1e] text-gray-400' : 'bg-gray-200 text-gray-600'}`}>{selectedUser.username.charAt(0).toUpperCase()}</div>
                                <div className="ml-3"><h2 className="font-bold text-[15px]">{selectedUser.username}</h2></div>
                            </div>
                            
                            <div className={`flex items-center space-x-6 ${isDark ? 'text-gray-400' : 'text-gray-800'}`}>
                                <PhoneIcon onClick={() => callUser(false)} className={`h-6 w-6 cursor-pointer transition-colors ${isDark ? 'hover:text-gray-200' : 'hover:text-gray-500'}`} title="Voice Call" />
                                <VideoCameraIcon onClick={() => callUser(true)} className={`h-6 w-6 cursor-pointer transition-colors ${isDark ? 'hover:text-gray-200' : 'hover:text-gray-500'}`} title="Video Call" />
                                <InformationCircleIcon className={`h-6 w-6 cursor-pointer transition-colors ${isDark ? 'hover:text-gray-200' : 'hover:text-gray-500'}`} />
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${isDark ? 'bg-black' : 'bg-[#fafafa]'}`}>
                            {visibleMessages.map((msg, idx) => {
                                const isSender = msg.sender === currentUser;
                                const isDeleted = msg.deletedForEveryone;

                                return (
                                    <div key={idx} className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} group relative`}>
                                        <div className="flex items-center">
                                            {!isDeleted && isSender && <button onClick={(e) => { e.stopPropagation(); setShowOptionsId(showOptionsId === msg.id ? null : msg.id); }} className={`mr-2 opacity-0 group-hover:opacity-100 p-1 rounded-full ${isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}><EllipsisVerticalIcon className="h-5 w-5" /></button>}

                                            <div className={`relative max-w-[280px] sm:max-w-[400px] px-4 py-2.5 text-[15px] ${isDeleted ? (isDark ? 'bg-black border border-gray-800 text-gray-500 italic rounded-3xl' : 'bg-white border border-gray-300 text-gray-400 italic rounded-3xl') : (isSender ? 'bg-[#0095f6] text-white rounded-3xl rounded-br-sm' : (isDark ? 'bg-[#1e1e1e] text-gray-200 rounded-3xl rounded-bl-sm' : 'border border-gray-200 bg-white text-black rounded-3xl rounded-bl-sm'))}`}>
                                                
                                                {isDeleted ? t[lang].deletedMsg : (
                                                    <>
                                                        {msg.type === 'text' && <span className="break-words">{msg.text}</span>}
                                                        {msg.type === 'image' && <img src={`https://vexchat-jz5w.onrender.com${msg.fileUrl}`} alt="Sent" className="max-w-full rounded-lg cursor-pointer hover:opacity-90" />}
                                                        {msg.type === 'video' && <video src={`https://vexchat-jz5w.onrender.com${msg.fileUrl}`} controls className="max-w-full rounded-lg" />}
                                                        {msg.type === 'audio' && <audio src={`https://vexchat-jz5w.onrender.com${msg.fileUrl}`} controls className="w-full sm:w-[250px] h-[40px] rounded-full" />}
                                                    </>
                                                )}
                                                
                                                {msg.edited && !isDeleted && <span className="text-[11px] ml-2 opacity-70">{t[lang].edited}</span>}

                                                {msg.reactions && Object.keys(msg.reactions).length > 0 && !isDeleted && (
                                                    <div className={`absolute -bottom-3 ${isSender ? '-left-2' : '-right-2'} rounded-full px-1.5 py-0.5 text-sm shadow-sm flex items-center gap-1 ${isDark ? 'bg-[#121212] border border-gray-800' : 'bg-white border border-gray-200'}`}>
                                                        {Object.entries(msg.reactions).map(([user, emoji], i) => (<span key={i} title={user}>{emoji}</span>))}
                                                    </div>
                                                )}
                                            </div>

                                            {!isDeleted && !isSender && <button onClick={(e) => { e.stopPropagation(); setShowOptionsId(showOptionsId === msg.id ? null : msg.id); }} className={`ml-2 opacity-0 group-hover:opacity-100 p-1 rounded-full ${isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}><EllipsisVerticalIcon className="h-5 w-5" /></button>}
                                        </div>

                                        {showOptionsId === msg.id && (
                                            <div onClick={(e) => e.stopPropagation()} className={`absolute z-20 ${isSender ? 'right-8' : 'left-8'} top-8 border shadow-lg rounded-lg p-2 w-52 text-sm ${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-white border-gray-200'}`}>
                                                <div className={`flex justify-between border-b pb-2 mb-2 px-1 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                                    {emojis.map(emoji => (<span key={emoji} onClick={(e) => handleReact(e, msg.id, emoji)} className="cursor-pointer hover:scale-125 text-lg">{emoji}</span>))}
                                                </div>
                                                {isSender && msg.type === 'text' && <button onClick={(e) => handleEditClick(e, msg)} className={`w-full text-left flex items-center px-2 py-1.5 rounded-md ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><PencilIcon className="h-4 w-4 mr-2" /> {t[lang].editMsg}</button>}
                                                <button onClick={(e) => handleDelete(e, msg.id, 'me')} className={`w-full text-left flex items-center px-2 py-1.5 rounded-md ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><TrashIcon className="h-4 w-4 mr-2" /> {t[lang].delMe}</button>
                                                {isSender && <button onClick={(e) => handleDelete(e, msg.id, 'everyone')} className={`w-full text-left flex items-center px-2 py-1.5 rounded-md text-red-500 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><TrashIcon className="h-4 w-4 mr-2" /> {t[lang].delEveryone}</button>}
                                            </div>
                                        )}
                                        {isSender && msg.id === lastSentMsg?.id && msg.read && !isDeleted && <span className="text-[11px] text-gray-500 mt-1 mr-1">{t[lang].seen}</span>}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className={`p-4 border-t relative ${isDark ? 'bg-[#121212] border-gray-800' : 'bg-white border-gray-200'}`}>
                            
                            {showEmojiPicker && (
                                <div className="absolute bottom-[80px] left-4 z-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                    <EmojiPicker onEmojiClick={handleEmojiClick} theme={isDark ? 'dark' : 'light'} />
                                </div>
                            )}

                            <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

                            {editingMsgId && (
                                <div className={`flex justify-between text-xs px-4 py-2 rounded-t-lg border-l-2 ${isDark ? 'bg-[#1e1e1e] text-blue-400 border-blue-500' : 'bg-blue-50 text-blue-600 border-blue-600'}`}>
                                    <span>{t[lang].editing}</span>
                                    <button onClick={() => { setEditingMsgId(null); setNewMessage(''); }} className="font-bold hover:underline flex items-center"><XMarkIcon className="h-4 w-4 mr-1"/> {t[lang].cancel}</button>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className={`flex items-center border px-4 py-[10px] ${editingMsgId ? 'rounded-b-lg' : 'rounded-full'} ${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-white border-gray-300'}`}>
                                <FaceSmileIcon onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }} className={`h-6 w-6 cursor-pointer mr-3 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-800'}`} />
                                <input type="text" placeholder={t[lang].message} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-1 outline-none px-2 text-[15px] bg-transparent" />
                                
                                {newMessage.trim() ? (
                                    <button type="submit" className="text-[#0095f6] font-semibold text-[15px] ml-2 hover:text-[#1877f2]">{editingMsgId ? t[lang].save : t[lang].send}</button>
                                ) : (
                                    <div className={`flex items-center space-x-4 ml-3 ${isDark ? 'text-gray-400' : 'text-gray-800'}`}>
                                        {isRecording ? (
                                            <button type="button" onClick={stopRecording} className="flex items-center text-red-500 animate-pulse bg-red-100 p-1 rounded-full">
                                                <StopIcon className="h-6 w-6" />
                                            </button>
                                        ) : (
                                            <MicrophoneIcon onClick={startRecording} className="h-6 w-6 cursor-pointer hover:text-[#0095f6]" title="Click to Record" />
                                        )}
                                        <PaperClipIcon onClick={() => fileInputRef.current.click()} className={`h-6 w-6 cursor-pointer ${isDark ? 'hover:text-white' : 'hover:text-black'}`} title="Attach Image or Video" />
                                    </div>
                                )}
                            </form>
                        </div>
                    </>
                ) : (
                    <div className={`flex-1 flex flex-col items-center justify-center ${isDark ? 'bg-black' : 'bg-[#fafafa]'}`}>
                        <div className={`w-24 h-24 border-2 rounded-full flex items-center justify-center mb-4 ${isDark ? 'border-white text-white' : 'border-black text-black'}`}>
                            <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12.003 2.5a9.503 9.503 0 1 0 9.5 9.5 9.511 9.511 0 0 0-9.5-9.5Zm0 17.5a8 8 0 1 1 8-8 8.01 8.01 0 0 1-8 8Zm4.5-8.5H12.75v-3.75a.75.75 0 0 0-1.5 0v3.75H7.5a.75.75 0 0 0 0 1.5h3.75v3.75a.75.75 0 0 0 1.5 0v-3.75h3.75a.75.75 0 0 0 0-1.5Z"></path></svg>
                        </div>
                        <h2 className="text-xl font-semibold">{t[lang].yourMessages}</h2>
                    </div>
                )}
            </div>
        </div>
    );
}