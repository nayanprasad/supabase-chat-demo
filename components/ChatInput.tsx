"use client";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Input} from "./ui/input";
import {supabaseBrowser} from "@/lib/supabase/browser";
import {toast} from "sonner";
import {v4 as uuidv4} from "uuid";
import {useUser} from "@/lib/store/user";
import {Imessage, useMessage} from "@/lib/store/messages";

export default function ChatInput() {
    const user = useUser((state) => state.user);
    const inputRef = useRef<HTMLInputElement>(null)
    const addMessage = useMessage((state) => state.addMessage);
    const setOptimisticIds = useMessage((state) => state.setOptimisticIds);
    const supabase = supabaseBrowser();
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!isTyping && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isTyping]);

    const handleSendMessage = async (text: string) => {
        if (!user) {
            toast.error("Something went wrong, please try again");
            return;
        }
        if (text.trim()) {
            const id = uuidv4();
            const newMessage = {
                id,
                text,
                send_by: user?.id,
                is_edit: false,
                created_at: new Date().toISOString(),
                users: {
                    id: user?.id,
                    avatar_url: user?.user_metadata.avatar_url,
                    created_at: new Date().toISOString(),
                    display_name: user?.user_metadata.name,
                },
            };
            addMessage(newMessage as Imessage);
            setOptimisticIds(newMessage.id);
            const {error} = await supabase
                .from("messages")
                .insert({text, id});
            if (error) {
                toast.error(error.message);
            }
        } else {
            toast.error("Message can not be empty!!");
        }
    };

    const debouncedSendMessage = useCallback(
        (() => {
            let timeoutId: NodeJS.Timeout;
            return (text: string) => {
                if (isTyping) {
                    clearTimeout(timeoutId);
                }
                setIsTyping(true);
                timeoutId = setTimeout(async () => {
                    await handleSendMessage(text);
                    setIsTyping(false);
                }, 1000);
            };
        })(),
        [isTyping, user, handleSendMessage]
    );

    return (
        <div className="p-5">
            <Input
                ref={inputRef}
                placeholder={isTyping ? "Waiting to send..." : "send message"}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        debouncedSendMessage(e.currentTarget.value);
                        e.currentTarget.value = "";
                    }
                }}
                disabled={isTyping}
            />
        </div>
    );
}
