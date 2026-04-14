import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#8D73FF';
const BORDER = '#DDD7FF';
const BG = '#F7F5FF';
const MAX_CHARS = 350;

type Role = 'user' | 'ai';

interface Message {
  id: string;
  role: Role;
  text: string;
}

interface Props {
  endpoint: string;
  welcomeMessage?: string;
  hideFab?: boolean;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
}

const DEFAULT_WELCOME =
  'Merhaba! Ben Tekera asistanıyım. Başvuru sürecinizle ilgili sorularınızı yanıtlamak için buradayım. Size nasıl yardımcı olabilirim?';

export function AiChatWidget({
  endpoint,
  welcomeMessage = DEFAULT_WELCOME,
  hideFab = false,
  open: openProp,
  onOpenChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openInternal;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenInternal(next);
    onOpenChange?.(next);
  };
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomeTyping, setWelcomeTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const welcomeShownRef = useRef(false);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const sessionId = useRef<string | null>(null);

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef<Animated.CompositeAnimation | null>(null);

  function startTypingAnim() {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(400),
        ])
      );
    dotAnim.current = Animated.parallel([bounce(dot1, 0), bounce(dot2, 160), bounce(dot3, 320)]);
    dotAnim.current.start();
  }

  function stopTypingAnim() {
    dotAnim.current?.stop();
    dot1.setValue(0);
    dot2.setValue(0);
    dot3.setValue(0);
  }

  useEffect(() => {
    if (!open || welcomeShownRef.current) return;
    welcomeShownRef.current = true;
    setWelcomeTyping(true);
    startTypingAnim();
    const timers: ReturnType<typeof setTimeout>[] = [];
    welcomeTimerRef.current = setTimeout(() => {
      setWelcomeTyping(false);
      stopTypingAnim();
      setMessages((prev) => [...prev, { id: 'welcome', role: 'ai', text: '' }]);
      let i = 0;
      const step = () => {
        i += 1;
        setMessages((prev) =>
          prev.map((m) => (m.id === 'welcome' ? { ...m, text: welcomeMessage.slice(0, i) } : m)),
        );
        if (i < welcomeMessage.length) {
          timers.push(setTimeout(step, 22));
        }
      };
      step();
    }, 1100);
    return () => {
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
      timers.forEach(clearTimeout);
    };
  }, [open, welcomeMessage]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    inputRef.current?.clear();
    setLoading(true);
    startTypingAnim();

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId.current }),
      });

      if (res.status === 429) {
        throw new Error('rate_limit');
      }

      if (!res.ok) {
        throw new Error('server_error');
      }

      const data = (await res.json()) as { reply: string; session_id: string };
      sessionId.current = data.session_id;

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'ai', text: data.reply },
      ]);
    } catch (err) {
      const isRateLimit = err instanceof Error && err.message === 'rate_limit';
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('[AiChatWidget] fetch error:', errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'ai',
          text: isRateLimit
            ? 'Çok fazla mesaj gönderdiniz. Lütfen bir dakika bekleyip tekrar deneyin.'
            : `Bağlantı hatası: ${errMsg}`,
        },
      ]);
    } finally {
      setLoading(false);
      stopTypingAnim();
    }
  }

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      {/* FAB */}
      {!hideFab && (
        <Pressable
          onPress={handleOpen}
          hitSlop={12}
          style={({ pressed }) => [
            styles.fab,
            styles.fabBtn,
            { bottom: insets.bottom + 20 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        </Pressable>
      )}

      {/* Chat Modal */}
      <Modal visible={open} animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalRoot}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
              <View style={styles.headerLeft}>
                <View style={styles.botAvatar}>
                  <Ionicons name="sparkles" size={17} color="#fff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Tekera Asistan</Text>
                  <Text style={styles.headerSub}>Başvuru rehberi · AI destekli</Text>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={20} color="#5D5677" />
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messagesList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <View key={msg.id} style={styles.userRow}>
                    <View style={styles.userBubble}>
                      <Text style={styles.userBubbleText}>{msg.text}</Text>
                    </View>
                  </View>
                ) : (
                  <View key={msg.id} style={styles.aiRow}>
                    <View style={styles.aiAvatarSmall}>
                      <Ionicons name="sparkles" size={11} color={PURPLE} />
                    </View>
                    <View style={styles.aiBubble}>
                      <Text style={styles.aiBubbleText}>{msg.text}</Text>
                    </View>
                  </View>
                )
              )}

              {/* Typing indicator */}
              {(loading || welcomeTyping) && (
                <View style={styles.aiRow}>
                  <View style={styles.aiAvatarSmall}>
                    <Ionicons name="sparkles" size={11} color={PURPLE} />
                  </View>
                  <View style={[styles.aiBubble, styles.typingBubble]}>
                    {[dot1, dot2, dot3].map((dot, i) => (
                      <Animated.View
                        key={i}
                        style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
                      />
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Composer */}
            <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
              <View style={styles.inputWrap}>
                <TextInput
                  ref={inputRef}
                  style={styles.composerInput}
                  value={input}
                  onChangeText={(v) => setInput(v.slice(0, MAX_CHARS))}
                  placeholder="Sorunuzu yazın..."
                  placeholderTextColor="#B0AACC"
                  multiline
                  editable={!loading}
                  returnKeyType="send"
                  blurOnSubmit={false}
                  onSubmitEditing={() => void sendMessage()}
                />
                {input.length > 280 && (
                  <Text style={styles.charCount}>
                    {input.length}/{MAX_CHARS}
                  </Text>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!input.trim() || loading) && styles.sendBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => void sendMessage()}
                disabled={!input.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={17} color="#fff" />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    zIndex: 99,
  },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },

  // Modal root
  modalRoot: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1631',
  },
  headerSub: {
    fontSize: 11,
    color: '#9A96B5',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messagesList: {
    padding: 16,
    gap: 12,
    paddingBottom: 8,
  },
  userRow: {
    alignItems: 'flex-end',
    marginLeft: 48,
  },
  userBubble: {
    backgroundColor: PURPLE,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  userBubbleText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginRight: 48,
  },
  aiAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EDE9FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
    flex: 1,
  },
  aiBubbleText: {
    color: '#1C1631',
    fontSize: 14,
    lineHeight: 20,
  },

  // Typing indicator
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 14,
    flex: 0,
    paddingHorizontal: 16,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#C4BAFF',
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inputWrap: {
    flex: 1,
  },
  composerInput: {
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#FBFAFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
    color: '#1C1631',
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: '#B0AACC',
    textAlign: 'right',
    marginTop: 4,
    marginRight: 4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
