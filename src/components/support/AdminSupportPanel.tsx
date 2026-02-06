import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SupportTicket, SupportMessage } from "@/hooks/useSupport";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, User, CheckCircle2, XCircle, Search, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TicketWithProfile extends SupportTicket {
    profiles: {
        username: string;
        avatar_url: string;
    };
}

export function AdminSupportPanel() {
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyMessage, setReplyMessage] = useState("");
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch all open tickets
    // Fetch all open tickets
    const { data: tickets, isLoading: loadingTickets, error: ticketsError } = useQuery({
        queryKey: ["admin-support-tickets"],
        queryFn: async () => {
            // 1. Fetch tickets
            const { data: ticketsData, error: ticketsError } = await supabase
                .from("support_tickets" as any)
                .select("*")
                .neq("status", "closed")
                .order("created_at", { ascending: false });

            if (ticketsError) throw ticketsError;
            if (!ticketsData || ticketsData.length === 0) return [];

            // 2. Fetch profiles manually
            const userIds = [...new Set(ticketsData.map((t: any) => t.user_id))];

            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, username, avatar_url")
                .in("id", userIds);

            // 3. Map profiles to tickets
            const profilesMap = (profilesData || []).reduce((acc: any, profile: any) => {
                acc[profile.id] = profile;
                return acc;
            }, {});

            return ticketsData.map((ticket: any) => ({
                ...ticket,
                profiles: profilesMap[ticket.user_id] || { username: 'Usuário', avatar_url: null }
            })) as TicketWithProfile[];
        },
        // Refetch every 30 seconds to update list, or rely on realtime
        refetchInterval: 30000,
    });

    if (ticketsError) {
        console.error("AdminSupportPanel query error:", ticketsError);
    }

    // Realtime subscription for new tickets
    useEffect(() => {
        const channel = supabase
            .channel("admin-support-list")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "support_tickets" },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    // Fetch messages for selected ticket
    const { data: messages } = useQuery({
        queryKey: ["admin-ticket-messages", selectedTicketId],
        queryFn: async () => {
            if (!selectedTicketId) return [];

            const { data, error } = await supabase
                .from("support_messages" as any)
                .select("*")
                .eq("ticket_id", selectedTicketId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as SupportMessage[];
        },
        enabled: !!selectedTicketId,
    });

    // Subscribe to messages of selected ticket
    useEffect(() => {
        if (!selectedTicketId) return;

        const channel = supabase
            .channel(`admin-ticket-${selectedTicketId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "support_messages",
                    filter: `ticket_id=eq.${selectedTicketId}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", selectedTicketId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedTicketId, queryClient]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, selectedTicketId]);

    // Send Reply Mutation
    const sendReplyMutation = useMutation({
        mutationFn: async () => {
            if (!user || !selectedTicketId) return;

            const { error } = await supabase
                .from("support_messages" as any)
                .insert({
                    ticket_id: selectedTicketId,
                    sender_id: user.id,
                    content: replyMessage,
                    is_staff_reply: true,
                });

            if (error) throw error;
        },
        onSuccess: () => {
            setReplyMessage("");
            queryClient.invalidateQueries({ queryKey: ["admin-ticket-messages", selectedTicketId] });
        },
    });

    // Close Ticket Mutation
    const closeTicketMutation = useMutation({
        mutationFn: async () => {
            if (!selectedTicketId) return;

            const { error } = await supabase
                .from("support_tickets" as any)
                .update({ status: "closed" })
                .eq("id", selectedTicketId);

            if (error) throw error;
        },
        onSuccess: () => {
            setSelectedTicketId(null);
            queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        },
    });

    const selectedTicket = tickets?.find(t => t.id === selectedTicketId);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[700px]">
            {/* Tickets List */}
            <Card className="md:col-span-1 h-full flex flex-col overflow-hidden border-border/60">
                <CardHeader className="p-4 border-b bg-muted/40">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Atendimentos
                        {tickets && tickets.length > 0 && (
                            <Badge variant="secondary" className="ml-auto">{tickets.length}</Badge>
                        )}
                    </CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar usuário..." className="pl-9 h-9" />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="flex flex-col">
                            {loadingTickets ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
                            ) : tickets?.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <CheckCircle2 className="mx-auto h-10 w-10 opacity-20 mb-2" />
                                    <p>Nenhum chamado aberto.</p>
                                </div>
                            ) : (
                                tickets?.map((ticket) => (
                                    <button
                                        key={ticket.id}
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                        className={`
                      flex items-start gap-3 p-4 text-left border-b transition-colors hover:bg-muted/50
                      ${selectedTicketId === ticket.id ? "bg-muted border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}
                    `}
                                    >
                                        <Avatar className="h-10 w-10 border">
                                            <AvatarImage src={ticket.profiles?.avatar_url || undefined} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {ticket.profiles?.username?.[0]?.toUpperCase() || "U"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-semibold truncate">
                                                    {ticket.profiles?.username || "Usuário"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {format(new Date(ticket.created_at), "HH:mm")}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={ticket.status === 'in_progress' ? 'default' : 'secondary'}
                                                    className="text-[10px] h-5 px-1.5"
                                                >
                                                    {ticket.status === 'open' ? 'Aberto' : 'Em andamento'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="md:col-span-2 h-full flex flex-col border-border/60">
                {selectedTicket ? (
                    <>
                        <CardHeader className="p-4 border-b flex flex-row items-center justify-between shrink-0 bg-muted/20">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={selectedTicket.profiles?.avatar_url || undefined} />
                                    <AvatarFallback>
                                        {selectedTicket.profiles?.username?.[0]?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-base">
                                        {selectedTicket.profiles?.username}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Iniciado em {format(new Date(selectedTicket.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-2"
                                onClick={() => closeTicketMutation.mutate()}
                                disabled={closeTicketMutation.isPending}
                            >
                                <XCircle className="h-4 w-4" />
                                Encerrar Atendimento
                            </Button>
                        </CardHeader>

                        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/10 relative">
                            <ScrollArea className="h-full p-6">
                                <div className="flex flex-col gap-6">
                                    {messages?.map((msg) => {
                                        const isSystem = false; // Placeholder if we add system messages later
                                        const isMe = msg.is_staff_reply;
                                        // In admin panel, "Me" is the staff. "Others" are the user.

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                                            >
                                                <Avatar className="h-8 w-8 mt-1">
                                                    {isMe ? (
                                                        <AvatarFallback className="bg-primary text-primary-foreground">EU</AvatarFallback>
                                                    ) : (
                                                        <>
                                                            <AvatarImage src={selectedTicket.profiles?.avatar_url || undefined} />
                                                            <AvatarFallback>U</AvatarFallback>
                                                        </>
                                                    )}
                                                </Avatar>

                                                <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                                                    <div
                                                        className={`
                               p-4 rounded-2xl text-sm shadow-sm
                               ${isMe
                                                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                                                : "bg-white dark:bg-card border rounded-tl-none"
                                                            }
                             `}
                                                    >
                                                        <p>{msg.content}</p>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                                                        {format(new Date(msg.created_at), "HH:mm")}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            </ScrollArea>
                        </CardContent>

                        <div className="p-4 border-t bg-card shrink-0">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (replyMessage.trim()) sendReplyMutation.mutate();
                                }}
                                className="flex gap-3"
                            >
                                <Input
                                    placeholder="Digite uma resposta..."
                                    className="flex-1"
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    disabled={sendReplyMutation.isPending}
                                    autoFocus
                                />
                                <Button type="submit" disabled={!replyMessage.trim() || sendReplyMutation.isPending}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Enviar
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        <div className="bg-muted p-6 rounded-full mb-4">
                            <MessageSquare className="h-12 w-12 opacity-30" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Painel de Atendimento</h3>
                        <p className="max-w-xs mx-auto">
                            Selecione um ticket na lista ao lado para visualizar a conversa e responder ao usuário.
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
}
