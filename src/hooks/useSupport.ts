import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TicketStatus = "open" | "in_progress" | "closed";

export interface SupportTicket {
    id: string;
    user_id: string;
    status: TicketStatus;
    created_at: string;
    updated_at: string;
    assigned_to?: string;
}

export interface SupportMessage {
    id: string;
    ticket_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_staff_reply: boolean;
}

export const useSupport = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

    // Check for an existing open ticket for the current user
    const { data: currentTicket, isLoading: loadingTicket } = useQuery({
        queryKey: ["support-active-ticket", user?.id],
        queryFn: async () => {
            if (!user) return null;

            const { data, error } = await supabase
                .from("support_tickets" as any)
                .select("*")
                .eq("user_id", user.id)
                .neq("status", "closed")
                .maybeSingle();

            if (error) throw error;
            return data as SupportTicket | null;
        },
        enabled: !!user,
    });

    // Update active ticket ID state when data is fetched
    useEffect(() => {
        if (currentTicket) {
            setActiveTicketId(currentTicket.id);
        } else {
            setActiveTicketId(null);
        }
    }, [currentTicket]);

    // Fetch messages for the active ticket
    const { data: messages, isLoading: loadingMessages } = useQuery({
        queryKey: ["support-messages", activeTicketId],
        queryFn: async () => {
            if (!activeTicketId) return [];

            const { data, error } = await supabase
                .from("support_messages" as any)
                .select("*")
                .eq("ticket_id", activeTicketId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            return data as SupportMessage[];
        },
        enabled: !!activeTicketId,
    });

    // Real-time subscription for messages
    useEffect(() => {
        if (!activeTicketId) return;

        const channel = supabase
            .channel(`support-ticket-${activeTicketId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "support_messages",
                    filter: `ticket_id=eq.${activeTicketId}`,
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ["support-messages", activeTicketId] });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "support_tickets",
                    filter: `id=eq.${activeTicketId}`,
                },
                (payload: any) => {
                    if (payload.new.status === "closed") {
                        queryClient.invalidateQueries({ queryKey: ["support-active-ticket"] });
                        setActiveTicketId(null);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeTicketId, queryClient]);

    // Create a new ticket
    const createTicketMutation = useMutation({
        mutationFn: async (initialMessage: string) => {
            if (!user) throw new Error("User not authenticated");

            // 1. Create Ticket
            const { data: ticket, error: ticketError } = await supabase
                .from("support_tickets" as any)
                .insert({ user_id: user.id, status: "open" })
                .select()
                .single();

            if (ticketError) throw ticketError;

            // 2. Create Initial Message
            const { error: messageError } = await supabase
                .from("support_messages" as any)
                .insert({
                    ticket_id: ticket.id,
                    sender_id: user.id,
                    content: initialMessage,
                    is_staff_reply: false,
                });

            if (messageError) throw messageError;

            return ticket;
        },
        onSuccess: (ticket) => {
            setActiveTicketId(ticket.id);
            queryClient.invalidateQueries({ queryKey: ["support-active-ticket"] });
        },
    });

    // Send a message
    const sendMessageMutation = useMutation({
        mutationFn: async ({ content, ticketId }: { content: string; ticketId: string }) => {
            if (!user) throw new Error("User not authenticated");


            const { error } = await supabase
                .from("support_messages" as any)
                .insert({
                    ticket_id: ticketId,
                    sender_id: user.id,
                    content,
                    is_staff_reply: false,
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["support-messages", activeTicketId] });
        },
    });

    return {
        currentTicket,
        messages,
        loadingTicket,
        loadingMessages,
        createTicket: createTicketMutation.mutateAsync,
        sendMessage: sendMessageMutation.mutateAsync,
        isCreating: createTicketMutation.isPending,
        isSending: sendMessageMutation.isPending,
    };
};
