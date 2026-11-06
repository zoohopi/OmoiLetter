"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase/client";
import { supabaseConfig } from "@/lib/supabase/config";
import { setDraftAccount, useDraft } from "@/lib/letter/store";
import { saveBook } from "@/lib/account/cloud";

type State = { user: User | null; loading: boolean; configured: boolean; saving: boolean; saveError: string; saveNow: () => Promise<string | null>; signOut: () => Promise<void> };
const Context = createContext<State | null>(null);
export const useAccount = () => { const value = useContext(Context); if (!value) throw new Error("AccountProvider required"); return value; };
export default function AccountProvider({ children }: { children: ReactNode }) {
  const configured = Boolean(supabaseConfig());
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(configured);
  const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState("");
  const draft = useDraft();
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const ownerRef = useRef<string | null>(null);
  const pending = useRef<{ owner: string; job: Promise<string | null> } | null>(null);
  const blocked = useRef(false);
  useEffect(() => { blocked.current = false; }, [draft?.createdAt]);
  useEffect(() => {
    if (!configured) return;
    const db = browserSupabase(); let alive = true, authVersion = 0;
    const accept = (u: User | null) => {
      if (!alive) return;
      if (ownerRef.current !== (u?.id ?? null)) { blocked.current = false; setSaveError(""); }
      ownerRef.current = u?.id ?? null; setDraftAccount(u?.id ?? null); setUser(u); setLoading(false);
    };
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => { authVersion++; accept(session?.user ?? null); });
    const initialVersion = authVersion;
    db.auth.getUser().then(({ data }) => { if (authVersion === initialVersion) accept(data.user); }).catch(() => { if (authVersion === initialVersion) accept(null); });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [configured]);
  const saveNow = useCallback(async (): Promise<string | null> => {
    if (pending.current) return pending.current.owner === user?.id ? pending.current.job : null;
    const current = draftRef.current;
    if (!user || !current || ownerRef.current !== user.id) return null;
    setSaving(true); setSaveError("");
    const owner = user.id;
    const job = saveBook(current, owner).then(id => { if (ownerRef.current === owner) blocked.current = false; return id; }).catch((e: unknown) => {
      if (ownerRef.current === owner) { blocked.current = true; setSaveError(e instanceof Error ? e.message : "책을 저장하지 못했어요."); }
      return null;
    }).finally(() => { pending.current = null; setSaving(false); });
    pending.current = { owner, job };
    return job;
  }, [user]);
  useEffect(() => {
    if (!user || !draft || blocked.current || saving || draft.cloudSavedAt === draft.updatedAt) return;
    const timer = setTimeout(() => void saveNow(), 1600);
    return () => clearTimeout(timer);
  }, [user, draft, saving, saveNow]);
  const signOut = async () => {
    if (draftRef.current && draftRef.current.cloudSavedAt !== draftRef.current.updatedAt) {
      const saved = await saveNow();
      if (!saved) throw new Error("아직 저장하지 못한 작업이 있어요. 저장을 완료한 뒤 로그아웃해 주세요.");
    }
    const { error } = await browserSupabase().auth.signOut();
    if (error) throw new Error("로그아웃하지 못했어요.");
    setDraftAccount(null); setUser(null);
  };
  return <Context value={{ user, loading, configured, saving, saveError, saveNow, signOut }}>{children}</Context>;
}
