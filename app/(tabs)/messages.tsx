import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Fonts } from '@/constants/theme';
import { addMessageToTicketing, createSellerTicket, fetchSellerTickets, fetchTicketById } from '@/features/ticketing/api';
import { TicketingItem } from '@/features/ticketing/types';
import { useAppSelector } from '@/store/hooks';

const WHATSAPP_PHONE = '905342688385';
const PAGE_SIZE = 20;

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function MessagesScreen() {
  const didAutoLoadOnFocusRef = useRef(false);
  const basicId = useAppSelector((state) => state.seller.profile.basicId);

  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tickets, setTickets] = useState<TicketingItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<TicketingItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState('');
  const [isDetailSending, setIsDetailSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);


  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const openWhatsapp = async () => {
    const messageText = `Merhaba, destek almak istiyorum. (${basicId ?? '-'})`;
    const appUrl = `whatsapp://send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(messageText)}`;
    const webUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(messageText)}`;

    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  };

  const loadTickets = useCallback(async (nextPage: number, refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else if (nextPage === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await fetchSellerTickets({ page: nextPage, size: PAGE_SIZE });
      const incoming = Array.isArray(response.content) ? response.content : [];

      setTickets((prev) => {
        if (nextPage === 0) return incoming;
        const existing = new Set(prev.map((item) => item.id));
        const merged = incoming.filter((item) => !existing.has(item.id));
        return [...prev, ...merged];
      });

      setPage(response.number);
      const totalPages = Number(response.totalPages ?? 0);
      if (totalPages > 0) {
        setHasMore(nextPage + 1 < totalPages);
      } else {
        setHasMore(incoming.length >= PAGE_SIZE);
      }
    } catch {
      setError('Destek talepleri alınamadı.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!didAutoLoadOnFocusRef.current && tickets.length === 0 && !isLoading && !isRefreshing && !isLoadingMore) {
        didAutoLoadOnFocusRef.current = true;
        void loadTickets(0, false);
      }
    }, [isLoading, isLoadingMore, isRefreshing, loadTickets, tickets.length])
  );

  const onLoadMore = useCallback(() => {
    if (isLoading || isRefreshing || isLoadingMore || !hasMore) return;
    void loadTickets(page + 1, false);
  }, [hasMore, isLoading, isLoadingMore, isRefreshing, loadTickets, page]);

  const onCreateTicket = useCallback(async () => {
    const content = ticketMessage.trim();
    if (content.length < 3) {
      Alert.alert('Eksik Bilgi', 'Lütfen en az 3 karakterlik bir mesaj girin.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await createSellerTicket(content);
      setTicketMessage('');
      await loadTickets(0, true);
      Alert.alert('Başarılı', response.message);
    } catch {
      Alert.alert('Hata', 'Destek talebi oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  }, [loadTickets, ticketMessage]);

  const openTicketModal = useCallback(async (ticket: TicketingItem) => {
    setSelectedTicket(ticket);
    setDetailMessage('');
    setIsDetailLoading(true);
    try {
      const fresh = await fetchTicketById(ticket.id);
      setSelectedTicket(fresh);
      setTickets((prev) => prev.map((item) => (item.id === fresh.id ? fresh : item)));
    } catch {
      Alert.alert('Uyarı', 'Ticket detayları alınamadı, mevcut veriler gösteriliyor.');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const onSendDetailMessage = useCallback(async () => {
    if (!selectedTicket?.id) return;
    const content = detailMessage.trim();
    if (content.length < 2) {
      Alert.alert('Eksik Bilgi', 'Lütfen mesajınızı yazın.');
      return;
    }

    try {
      setIsDetailSending(true);
      const updated = await addMessageToTicketing({ ticketingId: selectedTicket.id, content });
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setDetailMessage('');
    } catch {
      Alert.alert('Hata', 'Mesaj gönderilemedi.');
    } finally {
      setIsDetailSending(false);
    }
  }, [detailMessage, selectedTicket]);

  const renderTicketItem = ({ item }: { item: TicketingItem }) => {
    const lastMessage = item.messages.length > 0 ? item.messages[item.messages.length - 1] : null;

    return (
      <View style={styles.ticketCard}>
        <View style={styles.ticketTopRow}>
          <AppText style={styles.ticketTitle}>{item.sellerTitle ?? 'Destek Talebi'}</AppText>
          <AppText style={[styles.statusPill, item.isOpen ? styles.statusOpen : styles.statusClosed]}>
            {item.isOpen ? 'Açık' : 'Kapalı'}
          </AppText>
        </View>

        <AppText style={styles.ticketMeta}>No: {item.id}</AppText>
        <AppText style={styles.ticketMeta}>Tarih: {formatDate(item.createdAt)}</AppText>

        {lastMessage ? (
          <View style={styles.lastMessageBox}>
            <AppText style={styles.lastMessageAuthor}>{lastMessage.userNameSurname}</AppText>
            <AppText style={styles.lastMessageText}>{lastMessage.content}</AppText>
          </View>
        ) : null}

        <View style={styles.ticketBottomRow}>
          <AppText style={styles.ticketMeta}>Mesaj sayısı: {item.messages.length}</AppText>
          <Pressable style={styles.openThreadButton} onPress={() => void openTicketModal(item)}>
            <AppText style={styles.openThreadButtonText}>Sohbeti Aç</AppText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.headerRow}>
        <AppText style={styles.title} tone="rounded">
          Mesajlar
        </AppText>
        <Pressable style={styles.refreshButton} onPress={() => void loadTickets(0, true)}>
          <Ionicons name="refresh" size={16} color="#2B2B31" />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <AppText style={styles.errorText}>{error}</AppText>
        </View>
      ) : null}

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderTicketItem}
        onEndReachedThreshold={0.35}
        onEndReached={onLoadMore}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void loadTickets(0, true)} tintColor="#25D366" />
        }
        ListHeaderComponent={
          <View style={styles.topContent}>
            <Pressable style={styles.whatsappButton} onPress={openWhatsapp}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
              <View style={styles.buttonTextWrap}>
                <AppText style={styles.buttonTitle}>WhatsApp Destek</AppText>
                <AppText style={styles.buttonSubtitle}>+90 (534) 268 83 85</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#E7FFE8" />
            </Pressable>

            <View style={styles.createTicketCard}>
              <AppText style={styles.createTitle}>Yeni Destek Talebi</AppText>
              <TextInput
                value={ticketMessage}
                onChangeText={setTicketMessage}
                placeholder="Destek talebinizi yazın"
                placeholderTextColor="#A1A1AA"
                style={styles.messageInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              <Pressable
                style={[styles.sendButton, isSubmitting && styles.buttonDisabled]}
                disabled={isSubmitting}
                onPress={() => void onCreateTicket()}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <AppText style={styles.sendButtonText}>Destek Talebi Oluştur</AppText>
                )}
              </Pressable>
            </View>

            <AppText style={styles.sectionTitle}>Önceki Taleplerim</AppText>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator color="#25D366" />
              <AppText style={styles.emptyText}>Destek talepleri yükleniyor...</AppText>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <AppText style={styles.emptyText}>Henüz destek talebi yok.</AppText>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color="#25D366" />
            </View>
          ) : null
        }
      />

      <Modal visible={selectedTicket != null} animationType="slide" onRequestClose={() => setSelectedTicket(null)}>
        <KeyboardAvoidingView
          style={styles.modalKeyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.modalCloseButton} onPress={() => setSelectedTicket(null)}>
              <Ionicons name="close" size={20} color="#222" />
            </Pressable>
            <View style={styles.modalTitleWrap}>
              <AppText style={styles.modalTitle}>{selectedTicket?.sellerTitle ?? 'Destek Talebi'}</AppText>
              <AppText style={styles.modalSubTitle}>#{selectedTicket?.id ?? '-'}</AppText>
            </View>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {isDetailLoading ? (
            <View style={styles.modalLoadingWrap}>
              <ActivityIndicator color="#25D366" />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
              {(selectedTicket?.messages ?? []).map((message, index) => (
                <View key={`${selectedTicket?.id ?? 'ticket'}-${index}`} style={styles.threadBubble}>
                  <View style={styles.threadTopRow}>
                    <AppText style={styles.threadAuthor}>{message.userNameSurname}</AppText>
                    <AppText style={styles.threadTime}>{formatDate(message.createdAt)}</AppText>
                  </View>
                  <AppText style={styles.threadTitle}>{message.title}</AppText>
                  <AppText style={styles.threadText}>{message.content}</AppText>
                </View>
              ))}
            </ScrollView>
          )}

          {selectedTicket?.isOpen ? (
            <View style={[styles.modalComposer, Platform.OS === 'android' && keyboardHeight > 0 ? { marginBottom: keyboardHeight } : null]}>
              <TextInput
                value={detailMessage}
                onChangeText={setDetailMessage}
                placeholder="Mesaj yaz"
                placeholderTextColor="#A1A1AA"
                style={styles.modalInput}
                editable={!isDetailSending}
              />
              <Pressable
                style={[styles.modalSendButton, isDetailSending && styles.buttonDisabled]}
                onPress={() => void onSendDetailMessage()}
                disabled={isDetailSending}>
                {isDetailSending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <AppText style={styles.modalSendText}>Gönder</AppText>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={[styles.closedInfoWrap, Platform.OS === 'android' && keyboardHeight > 0 ? { marginBottom: keyboardHeight } : null]}>
              <AppText style={styles.closedInfoText}>Bu ticket kapalı, yeni mesaj gönderemezsiniz.</AppText>
            </View>
          )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#EFEFF2',
  },
  headerRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    color: '#141414',
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  refreshButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E7EC',
    borderWidth: 1,
  },
  errorBox: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFECEC',
    borderWidth: 1,
    borderColor: '#FFCDCD',
  },
  errorText: {
    color: '#A93535',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 120,
    gap: 10,
  },
  topContent: {
    gap: 10,
  },
  whatsappButton: {
    minHeight: 64,
    borderRadius: 14,
    backgroundColor: '#25D366',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonTextWrap: {
    flex: 1,
    gap: 1,
  },
  buttonTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  buttonSubtitle: {
    color: '#E7FFE8',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  createTicketCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4EA',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  createTitle: {
    fontSize: 13,
    color: '#1D1D24',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  messageInput: {
    minHeight: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8ED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: '#1B1B20',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  sendButton: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#2D2D34',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  ticketCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4EA',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ticketTitle: {
    flex: 1,
    fontSize: 13,
    color: '#1D1D24',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 10,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  statusOpen: {
    backgroundColor: '#E8FAEE',
    color: '#21894B',
  },
  statusClosed: {
    backgroundColor: '#F2F2F6',
    color: '#777785',
  },
  ticketMeta: {
    fontSize: 11,
    color: '#71717C',
    fontFamily: Fonts.sans,
  },
  lastMessageBox: {
    borderRadius: 8,
    backgroundColor: '#F7F7FB',
    borderWidth: 1,
    borderColor: '#ECECF2',
    padding: 8,
    gap: 2,
  },
  lastMessageAuthor: {
    fontSize: 11,
    color: '#34343C',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  lastMessageText: {
    fontSize: 12,
    color: '#4D4D56',
    fontFamily: Fonts.sans,
  },
  ticketBottomRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  openThreadButton: {
    minHeight: 32,
    borderRadius: 8,
    backgroundColor: '#5E4BCE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  openThreadButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  emptyWrap: {
    paddingVertical: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: '#6C6C74',
    fontSize: 13,
    fontFamily: Fonts.sans,
  },
  footerLoader: {
    paddingVertical: 14,
  },
  modalKeyboardWrap: {
    flex: 1,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#F2F3F7',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6ED',
    backgroundColor: '#FFFFFF',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleWrap: {
    flex: 1,
    marginHorizontal: 10,
    gap: 1,
  },
  modalTitle: {
    fontSize: 13,
    color: '#17171C',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  modalSubTitle: {
    fontSize: 11,
    color: '#6D6D77',
    fontFamily: Fonts.mono,
  },
  modalHeaderSpacer: {
    width: 32,
  },
  modalLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadContent: {
    padding: 12,
    gap: 8,
    paddingBottom: 24,
  },
  threadBubble: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3E5ED',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 3,
  },
  threadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  threadAuthor: {
    flex: 1,
    fontSize: 12,
    color: '#272731',
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  threadTime: {
    fontSize: 10,
    color: '#8A8A95',
    fontFamily: Fonts.mono,
  },
  threadTitle: {
    fontSize: 10,
    color: '#5C5C68',
    fontFamily: Fonts.sans,
  },
  threadText: {
    fontSize: 12,
    color: '#33333D',
    fontFamily: Fonts.sans,
  },
  modalComposer: {
    borderTopWidth: 1,
    borderTopColor: '#E4E6ED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8ED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    color: '#1B1B20',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
  modalSendButton: {
    minWidth: 86,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalSendText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  closedInfoWrap: {
    borderTopWidth: 1,
    borderTopColor: '#E4E6ED',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  closedInfoText: {
    color: '#767684',
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
});
