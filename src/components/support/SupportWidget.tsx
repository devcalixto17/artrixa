import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, User, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupport } from "@/hooks/useSupport";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const { user, isAdmin, isFundador, isStaff } = useAuth();
    const {
        currentTicket,
        messages,
        loadingMessages,
        createTicket,
        sendMessage,
        isCreating,
        isSending
    } = useSupport();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        try {
            if (currentTicket) {
                await sendMessage({ content: newMessage, ticketId: currentTicket.id });
            } else {
                await createTicket(newMessage);
            }
            setNewMessage("");
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    if (!user || isAdmin || isFundador || isStaff) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <Card className="w-[350px] md:w-[400px] h-[500px] shadow-2xl border-primary/20 bg-card mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    <CardHeader className="bg-primary text-primary-foreground py-4 flex flex-row items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-2 rounded-full">
                                <MessageCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Suporte Online</CardTitle>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    <span className="text-xs opacity-90 font-medium">Equipe Online</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary-foreground hover:bg-white/20 h-8 w-8"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden relative bg-muted/30">
                        <ScrollArea className="h-full p-4">
                            {messages && messages.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {/* Welcome Message */}
                                    <div className="flex gap-3">
                                        <Avatar className="h-8 w-8 border border-border">
                                            <AvatarImage src="/placeholder-logo.png" />
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">SP</AvatarFallback>
                                        </Avatar>
                                        <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                                            <p className="text-sm">
                                                Olá! Como podemos ajudar você hoje? Nossa equipe administrativa responderá em breve.
                                            </p>
                                            <span className="text-[10px] text-muted-foreground mt-1 block opacity-70">
                                                Bot
                                            </span>
                                        </div>
                                    </div>

                                    {messages.map((msg) => {
                                        const isMe = msg.sender_id === user.id;
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                                            >
                                                {!isMe && (
                                                    <Avatar className="h-8 w-8 border border-border">
                                                        <AvatarImage src="/bot-avatar.png" />
                                                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">EQ</AvatarFallback>
                                                    </Avatar>
                                                )}
                                                <div
                                                    className={`
                            p-3 rounded-2xl shadow-sm max-w-[85%] text-sm
                            ${isMe
                                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                                            : "bg-card border border-border rounded-tl-none"
                                                        }
                          `}
                                                >
                                                    <p>{msg.content}</p>
                                                    <span className={`text-[10px] mt-1 block opacity-70 ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                                        {format(new Date(msg.created_at), "HH:mm")}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
                                    <div className="bg-primary/10 p-4 rounded-full mb-3">
                                        <MessageCircle className="h-8 w-8 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium">Nenhuma conversa iniciada</p>
                                    <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem para começar a falar com a nossa equipe.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="p-3 border-t bg-card shrink-0">
                        <form onSubmit={handleSubmit} className="flex w-full gap-2">
                            <Input
                                placeholder="Digite sua mensagem..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                disabled={isCreating || isSending}
                                className="flex-1"
                                autoFocus
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={isCreating || isSending || !newMessage.trim()}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            <Button
                size="lg"
                className={`
          h-14 w-14 rounded-full shadow-lg transition-all duration-300
          ${isOpen ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"}
        `}
                onClick={() => setIsOpen(true)}
            >
                <MessageCircle className="h-6 w-6" />
                <span className="sr-only">Abrir Suporte</span>
            </Button>

            {/* Button to close (when open, usually hidden by the modal but good for animation flow if needed, 
          but here we use the toggle state logic above) 
      */}
        </div>
    );
}
