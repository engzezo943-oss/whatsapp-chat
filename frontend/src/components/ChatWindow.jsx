import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, X, Smile } from "lucide-react";
import { io } from "socket.io-client";
import API from "../api";

const socket = io("https://whatsapp-chat-production-91c0.up.railway.app");

const reactions = [
    "❤️",
    "👍",
    "😂",
    "😮",
    "😢",
    "😡",
    "🎉"
];

export default function ChatWindow({ currentUser, selectedUser }) {
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [conversationId, setConversationId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    // حالة لتتبع الرسالة التي يتم إضافة تفاعل لها
    const [reactionMessage, setReactionMessage] = useState(null);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    // ==================================
    // Scroll to bottom
    // ==================================
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ==================================
    // Connect User
    // ==================================
    useEffect(() => {
        if (!currentUser?.id) return;
        socket.emit("user_online", currentUser.id);
    }, [currentUser?.id]);

    // ==================================
    // Load Conversation
    // ==================================
    useEffect(() => {
        if (!selectedUser) return;

        setMessages([]);
        setConversationId(null);

        const loadConversation = async () => {
            try {
                const response = await API.post(`/conversations/private/${selectedUser.id}`);
                const id = response.data.conversationId;
                setConversationId(id);

                const messagesResponse = await API.get(`/messages/${id}`);
                // التأكد من تهيئة مصفوفة التفاعلات لكل رسالة إن لم تكن موجودة
                const loadedMessages = messagesResponse.data.map(msg => ({
                    ...msg,
                    reactions: msg.reactions || []
                }));
                setMessages(loadedMessages);
            } catch (error) {
                console.error("Conversation error:", error);
            }
        };

        loadConversation();
    }, [selectedUser]);

    // ==================================
    // Socket Listeners (Messages & Reactions)
    // ==================================
    useEffect(() => {
        const handleNewMessage = (newMessage) => {
            if (Number(newMessage.conversationId) !== Number(conversationId)) {
                return;
            }

            setMessages((prev) => {
                const exists = prev.some((msg) => msg.id === newMessage.id);
                if (exists) return prev;
                return [...prev, { ...newMessage, reactions: newMessage.reactions || [] }];
            });
        };

        const handleReactionUpdated = (data) => {
            const { messageId, userId, reaction } = data;
            
            setMessages((prev) =>
                prev.map((msg) => {
                    if (Number(msg.id) === Number(messageId)) {
                        const existingReactions = msg.reactions || [];
                        // إضافة التفاعل أو تحديثه للمستخدم
                        const filtered = existingReactions.filter(r => r.userId !== userId);
                        return {
                            ...msg,
                            reactions: [...filtered, { userId, reaction }]
                        };
                    }
                    return msg;
                })
            );
        };

        socket.on("new_message", handleNewMessage);
        socket.on("reaction_updated", handleReactionUpdated);

        return () => {
            socket.off("new_message", handleNewMessage);
            socket.off("reaction_updated", handleReactionUpdated);
        };
    }, [conversationId]);

    // ==================================
    // Send Text Message
    // ==================================
    const sendMessage = () => {
        if (!message.trim() || !selectedUser || !conversationId) return;

        const text = message.trim();
        const clientMessageId = crypto.randomUUID();

        const optimisticMessage = {
            id: `temp-${clientMessageId}`,
            clientMessageId,
            conversationId,
            senderId: currentUser.id,
            receiverId: selectedUser.id,
            content: text,
            messageType: "text",
            is_read: 0,
            createdAt: new Date().toISOString(),
            pending: true,
            reactions: []
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setMessage("");

        socket.emit("send_message", {
            conversationId,
            senderId: currentUser.id,
            receiverId: selectedUser.id,
            content: text,
            messageType: "text",
            clientMessageId
        }, (response) => {
            if (!response?.success) {
                setMessages((prev) => prev.filter((msg) => msg.clientMessageId !== clientMessageId));
                return;
            }
            setMessages((prev) => prev.map((msg) => 
                msg.clientMessageId === clientMessageId ? { ...response.message, reactions: [] } : msg
            ));
        });
    };

    // ==================================
    // File Selected
    // ==================================
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be less than 5MB");
            return;
        }

        setSelectedFile(file);
    };

    // ==================================
    // Upload Image
    // ==================================
    const sendImage = async () => {
        if (!selectedFile || !conversationId) return;

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("image", selectedFile);

            const response = await API.post("/messages/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const imageUrl = response.data.url;
            const clientMessageId = crypto.randomUUID();

            const optimisticMessage = {
                id: `temp-${clientMessageId}`,
                clientMessageId,
                conversationId,
                senderId: currentUser.id,
                receiverId: selectedUser.id,
                content: imageUrl,
                messageType: "image",
                is_read: 0,
                createdAt: new Date().toISOString(),
                pending: true,
                reactions: []
            };

            setMessages((prev) => [...prev, optimisticMessage]);
            setSelectedFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            socket.emit("send_message", {
                conversationId,
                senderId: currentUser.id,
                receiverId: selectedUser.id,
                content: imageUrl,
                messageType: "image",
                clientMessageId
            }, (result) => {
                if (!result?.success) return;
                setMessages((prev) => prev.map((msg) => 
                    msg.clientMessageId === clientMessageId ? { ...result.message, reactions: [] } : msg
                ));
            });

        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    // ==================================
    // Enter Key
    // ==================================
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ==================================
    // Add Reaction
    // ==================================
    const addReaction = async (messageId, reaction) => {
        try {
            await API.post(`/reactions/${messageId}`, { reaction });
            
            setReactionMessage(null);
            
            socket.emit("message_reaction", {
                messageId,
                conversationId,
                userId: currentUser.id,
                reaction
            });
        } catch (error) {
            console.error("Reaction error:", error);
        }
    };

    // ==================================
    // No User Selected UI
    // ==================================
    if (!selectedUser) {
        return (
            <main className="empty-chat">
                <div>
                    <div className="empty-icon">💬</div>
                    <h2>Welcome to ChatApp</h2>
                    <p>Select a user to start chatting</p>
                </div>
            </main>
        );
    }

    return (
        <main className="chat-window">
            {/* Header */}
            <header className="chat-header">
                <div className="avatar">
                    {selectedUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <strong>{selectedUser.name}</strong>
                    <span>
                        {selectedUser.status === "online" ? "online" : "offline"}
                    </span>
                </div>
            </header>

            {/* Messages */}
            <div className="messages">
                {messages.map((item) => {
                    const isMine =
                        Number(item.senderId) === Number(currentUser.id) ||
                        Number(item.sender_id) === Number(currentUser.id);

                    const type = item.messageType || item.message_type || "text";

                    return (
                        <div
                            key={item.id}
                            className={`message-row ${isMine ? "mine" : "theirs"}`}
                        >
                            <div className={`message ${item.pending ? "pending-message" : ""}`}>
                                {type === "image" ? (
                                    <img
                                        src={
                                            item.content.startsWith("http")
                                                ? item.content
                                                : `https://whatsapp-chat-production-91c0.up.railway.app${item.content}`
                                        }
                                        className="chat-image"
                                        alt="sent"
                                    />
                                ) : (
                                    <p>{item.content}</p>
                                )}

                                <small>
                                    {new Date(item.createdAt || item.created_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit"
                                    })}
                                    {item.pending && " • Sending..."}
                                </small>

                                {/* عرض التفاعلات المضافة على الرسالة */}
                                {item.reactions && item.reactions.length > 0 && (
                                    <div className="message-reactions-display">
                                        {item.reactions.map((r, idx) => (
                                            <span key={idx} className="reaction-badge">{r.reaction}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Reaction Button */}
                                <button
                                    className="reaction-button"
                                    onClick={() => {
                                        setReactionMessage(
                                            reactionMessage === item.id ? null : item.id
                                        );
                                    }}
                                >
                                    <Smile size={16} />
                                </button>

                                {/* Reaction Picker */}
                                {reactionMessage === item.id && (
                                    <div className="reaction-picker">
                                        {reactions.map((reaction) => (
                                            <button
                                                key={reaction}
                                                onClick={() => addReaction(item.id, reaction)}
                                            >
                                                {reaction}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Selected Image */}
            {selectedFile && (
                <div className="selected-file">
                    <span>📷 {selectedFile.name}</span>
                    <button onClick={() => setSelectedFile(null)}>
                        <X size={18} />
                    </button>
                    <button onClick={sendImage} disabled={uploading}>
                        {uploading ? "Uploading..." : "Send Image"}
                    </button>
                </div>
            )}

            {/* Input */}
            <div className="message-input">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Send image"
                >
                    <Paperclip size={21} />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileChange}
                />

                <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                />

                <button className="send-button" onClick={sendMessage}>
                    <Send size={20} />
                </button>
            </div>
        </main>
    );
}