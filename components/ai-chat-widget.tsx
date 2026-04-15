import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  imageUri?: string;
  isError?: boolean;
}

interface Props {
  endpoint: string;
  userId?: string | null;
  welcomeMessage?: string;
  hideFab?: boolean;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
}

const DEFAULT_WELCOME =
  'Merhaba! Ben Tekera asistanıyım. Başvuru sürecinizle ilgili sorularınızı yanıtlamak için buradayım. Size nasıl yardımcı olabilirim?';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function AiChatWidget({
  endpoint,
  userId = null,
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
  const [pendingImage, setPendingImage] = useState<{ uri: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [welcomeTyping, setWelcomeTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const welcomeShownRef = useRef(false);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const sessionId = useRef<string>(generateUuid());

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
    sessionId.current = generateUuid();
    setMessages([]);
    setInput('');
    setPendingImage(null);
    welcomeShownRef.current = false;
    if (welcomeTimerRef.current) {
      clearTimeout(welcomeTimerRef.current);
      welcomeTimerRef.current = null;
    }
    setWelcomeTyping(false);
    stopTypingAnim();
  }, [userId]);

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
          timers.push(setTimeout(step, 8));
        }
      };
      step();
    }, 1100);
    return () => {
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
      timers.forEach(clearTimeout);
    };
  }, [open, welcomeMessage]);

  async function pickImage() {
    if (loading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Galeriden görsel seçebilmek için fotoğraflara erişim izni vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: false,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    try {
      const MAX_DIM = 1280;
      const needsResize = (asset.width ?? 0) > MAX_DIM || (asset.height ?? 0) > MAX_DIM;
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        needsResize
          ? [{ resize: (asset.width ?? 0) >= (asset.height ?? 0) ? { width: MAX_DIM } : { height: MAX_DIM } }]
          : [],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
      );

      setPendingImage({ uri: manipulated.uri, mimeType: 'image/jpeg' });
    } catch (e) {
      console.warn('[AiChatWidget] image compress error:', e);
      Alert.alert('Hata', 'Görsel işlenemedi. Lütfen tekrar deneyiniz.');
    }
  }

  async function uploadImageToCdn(image: { uri: string; mimeType: string }): Promise<string> {
    const presignRes = await fetch('https://onlinechat.tekera21.com.tr/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId.current,
        content_type: image.mimeType,
      }),
    });
    if (!presignRes.ok) {
      const errBody = await presignRes.text().catch(() => '<no body>');
      console.warn('[AiChatWidget] presign failed', presignRes.status, errBody);
      throw new Error('upload_presign_failed');
    }
    const presign = (await presignRes.json()) as {
      upload_url: string;
      public_url: string;
    };

    const fileRes = await fetch(image.uri);
    const blob = await fileRes.blob();

    const putRes = await fetch(presign.upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': image.mimeType },
      body: blob,
    });
    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => '<no body>');
      console.warn('[AiChatWidget] minio upload failed', putRes.status, errBody);
      throw new Error('upload_put_failed');
    }

    return presign.public_url;
  }

  async function sendMessage() {
    const text = input.trim();
    const image = pendingImage;
    if ((!text && !image) || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      imageUri: image?.uri,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setPendingImage(null);
    inputRef.current?.clear();
    setLoading(true);
    startTypingAnim();

    try {
      let imageUrl: string | null = null;
      if (image) {
        imageUrl = await uploadImageToCdn(image);
      }

      const body: Record<string, unknown> = {
        message: text,
        session_id: sessionId.current,
      };
      if (userId) body.user_id = userId;
      if (imageUrl) body.image_url = imageUrl;

      console.log('[AiChatWidget] POST', endpoint, body);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        throw new Error('rate_limit');
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '<no body>');
        console.warn('[AiChatWidget] non-OK response', res.status, errBody);
        throw new Error('server_error');
      }

      const data = (await res.json()) as { reply: string; session_id?: string };
      if (data.session_id) sessionId.current = data.session_id;

      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'ai', text: data.reply },
      ]);
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err);
      console.warn('[AiChatWidget] fetch error:', code);

      let friendlyText: string;
      if (code === 'rate_limit') {
        friendlyText = 'Çok fazla mesaj gönderdiniz. Lütfen bir dakika bekleyip tekrar deneyin.';
      } else if (code === 'upload_presign_failed' || code === 'upload_put_failed') {
        friendlyText =
          'Görsel yüklenemedi. Lütfen biraz sonra tekrar deneyiniz ya da farklı bir görsel seçiniz.';
      } else if (code === 'server_error') {
        friendlyText =
          'Asistanımıza şu an ulaşamıyoruz. Birkaç dakika sonra tekrar deneyebilir misiniz? Sorununuz acil ise destek ekibimizle iletişime geçebilirsiniz.';
      } else {
        friendlyText =
          'Mesajınız gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyiniz.';
      }

      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'ai', text: friendlyText, isError: true },
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
                      {msg.imageUri && (
                        <Image
                          source={{ uri: msg.imageUri }}
                          style={styles.userImage}
                          contentFit="cover"
                        />
                      )}
                      {!!msg.text && <Text style={styles.userBubbleText}>{msg.text}</Text>}
                    </View>
                  </View>
                ) : (
                  <View key={msg.id} style={styles.aiRow}>
                    <View style={[styles.aiAvatarSmall, msg.isError && styles.aiAvatarSmallError]}>
                      <Ionicons
                        name={msg.isError ? 'alert-circle' : 'sparkles'}
                        size={msg.isError ? 13 : 11}
                        color={msg.isError ? '#DC2626' : PURPLE}
                      />
                    </View>
                    <View style={[styles.aiBubble, msg.isError && styles.aiBubbleError]}>
                      <Text style={[styles.aiBubbleText, msg.isError && styles.aiBubbleTextError]}>
                        {msg.text}
                      </Text>
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

            {/* Pending image preview */}
            {pendingImage && (
              <View style={styles.previewWrap}>
                <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} contentFit="cover" />
                <Pressable
                  style={({ pressed }) => [styles.previewRemove, pressed && { opacity: 0.75 }]}
                  onPress={() => setPendingImage(null)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* Composer */}
            <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.attachBtn,
                  loading && styles.sendBtnDisabled,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => void pickImage()}
                disabled={loading}
                hitSlop={8}
              >
                <Ionicons name="image-outline" size={20} color={PURPLE} />
              </Pressable>
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
                  (!input.trim() && !pendingImage) || loading ? styles.sendBtnDisabled : null,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => void sendMessage()}
                disabled={(!input.trim() && !pendingImage) || loading}
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
  userImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: '#6D58D9',
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
  aiBubbleError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  aiBubbleTextError: {
    color: '#B91C1C',
    fontWeight: '500',
  },
  aiAvatarSmallError: {
    backgroundColor: '#FEE2E2',
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
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  previewWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 8,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#F1F1F6',
  },
  previewRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1C1631',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
