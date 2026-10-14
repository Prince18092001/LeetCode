import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import axiosClient from "../utils/axiosClient";
import { Send, Bot, User as UserIcon } from 'lucide-react';

function ChatAi({ problem }) {
    const [messages, setMessages] = useState([
        { role: 'model', parts: [{ text: "Hello! I am your AI coding assistant. Ask me for hints, edge cases, time complexity analysis, or debugging help for this problem!" }] }
    ]);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const onSubmit = async (data) => {
        const userText = data.message.trim();
        if (!userText || loading) return;

        const newMessages = [...messages, { role: 'user', parts: [{ text: userText }] }];
        setMessages(newMessages);
        reset();
        setLoading(true);

        try {
            const response = await axiosClient.post("/ai/chat", {
                messages: newMessages,
                title: problem?.title,
                description: problem?.description,
                testCases: problem?.visibleTestCases,
                startCode: problem?.startCode
            });

            setMessages(prev => [
                ...prev,
                { role: 'model', parts: [{ text: response.data.message }] }
            ]);
        } catch (error) {
            console.error("AI Chat Error:", error);
            const errReply = error.response?.data?.message || "Sorry, I encountered an error connecting to the AI service. Please check your Gemini API key in backend/.env.";
            setMessages(prev => [
                ...prev,
                { role: 'model', parts: [{ text: errReply }] }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[75vh] min-h-[500px] border border-base-300 rounded-xl overflow-hidden bg-base-100">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    const text = msg.parts?.[0]?.text || "";
                    return (
                        <div
                            key={index}
                            className={`chat ${isUser ? "chat-end" : "chat-start"}`}
                        >
                            <div className="chat-image avatar">
                                <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center p-1">
                                    {isUser ? <UserIcon size={18} /> : <Bot size={18} className="text-primary" />}
                                </div>
                            </div>
                            <div className={`chat-bubble whitespace-pre-wrap text-sm ${isUser ? "chat-bubble-primary" : "bg-base-200 text-base-content"}`}>
                                {text}
                            </div>
                        </div>
                    );
                })}
                {loading && (
                    <div className="chat chat-start">
                        <div className="chat-image avatar">
                            <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center p-1">
                                <Bot size={18} className="text-primary" />
                            </div>
                        </div>
                        <div className="chat-bubble bg-base-200 text-base-content flex items-center space-x-2">
                            <span className="loading loading-dots loading-sm"></span>
                            <span className="text-xs text-base-content/70">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="p-3 bg-base-200 border-t border-base-300 flex items-center gap-2"
            >
                <input
                    placeholder="Ask for hints, complexity, or solution approach..."
                    className="input input-bordered flex-1"
                    disabled={loading}
                    autoComplete="off"
                    {...register("message", { required: true, minLength: 1 })}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || errors.message}
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}

export default ChatAi;